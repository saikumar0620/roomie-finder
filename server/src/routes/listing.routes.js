import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { serializeListing } from "../utils/serializers.js";
import { queryNearbyListings } from "./listings/nearbyQuery.js";
import visitReportRoutes from "./listings/visitReport.routes.js";

const router = Router();

const amenitiesField = z
  .union([z.array(z.string().trim()), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  });

const optionalCoord = (min, max) =>
  z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? null : val),
    z.coerce.number().min(min).max(max).nullable().optional()
  );

const listingCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  rent: z.coerce.number().int().min(0),
  location: z.string().trim().min(1).max(200),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
  description: z.string().max(3000).optional().default(""),
  preferences: z.string().max(200).optional().default(""),
  amenities: amenitiesField,
  images: z
    .array(z.string().trim())
    .max(5, "Maximum 5 images allowed")
    .optional()
    .default([]),
  isAvailable: z.boolean().optional().default(true),
});

const listingUpdateSchema = listingCreateSchema.partial();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 6,
      maxLimit: 50,
    });

    if (
      req.query.minRent &&
      req.query.maxRent &&
      Number(req.query.minRent) > Number(req.query.maxRent)
    ) {
      throw new HttpError(400, "minRent cannot be greater than maxRent");
    }

    const hasLat = req.query.lat !== undefined && req.query.lat !== "";
    const hasLng = req.query.lng !== undefined && req.query.lng !== "";
    if (hasLat && hasLng) {
      const result = await queryNearbyListings({
        query: req.query,
        page,
        limit,
        skip,
      });
      return res.json(result);
    }

    const where = { isAvailable: true };
    if (req.query.minRent || req.query.maxRent) {
      where.rent = {};
      if (req.query.minRent) where.rent.gte = Number(req.query.minRent);
      if (req.query.maxRent) where.rent.lte = Number(req.query.maxRent);
    }
    if (req.query.location) {
      where.location = {
        contains: String(req.query.location).trim(),
        mode: "insensitive",
      };
    }
    if (req.query.preferences) {
      where.preferences = String(req.query.preferences).trim();
    }
    if (req.query.amenities) {
      const amenList = String(req.query.amenities)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (amenList.length > 0) {
        where.amenities = { hasEvery: amenList };
      }
    }
    if (req.query.verifiedOnly === "true") {
      where.user = { isVerified: true };
    }

    const [rows, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where,
        include: { user: { select: { isVerified: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip,
      }),
      prisma.listing.count({ where }),
    ]);

    const pagination = buildPaginationMeta({ page, limit, total });
    res.json({
      documents: rows.map(serializeListing),
      nextPage: pagination.nextPage,
      pagination,
    });
  })
);

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listings = await prisma.listing.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ listings: listings.map(serializeListing) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            name: true,
            isVerified: true,
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }

    const lastMsg = await prisma.message.findFirst({
      where: { senderId: listing.userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    let ownerResponseLabel = "New host";
    if (lastMsg) {
      const hoursAgo =
        (Date.now() - new Date(lastMsg.createdAt).getTime()) / 3600000;
      ownerResponseLabel =
        hoursAgo <= 24 ? "Active today" : "Replies within a few days";
    }

    res.json({
      listing: {
        ...serializeListing(listing),
        ownerResponseLabel,
      },
    });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = listingCreateSchema.parse(req.body);
    const listing = await prisma.listing.create({
      data: {
        userId: req.user.id,
        title: data.title,
        rent: data.rent,
        location: data.location,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        description: data.description,
        preferences: data.preferences,
        amenities: data.amenities,
        images: data.images,
        isAvailable: data.isAvailable,
      },
    });
    res.status(201).json({ listing: serializeListing(listing) });
  })
);

router.use(visitReportRoutes);

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = listingUpdateSchema.parse(req.body);
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });
    if (!existing || existing.userId !== req.user.id) {
      throw new HttpError(404, "Listing not found or unauthorized");
    }

    const updated = await prisma.listing.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ listing: serializeListing(updated) });
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });
    if (!existing || existing.userId !== req.user.id) {
      throw new HttpError(404, "Listing not found or unauthorized");
    }
    await prisma.listing.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
