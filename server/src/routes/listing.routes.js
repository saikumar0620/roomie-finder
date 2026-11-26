import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { serializeListing } from "../utils/serializers.js";

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
  images: z.array(z.string().trim()).max(5, "Maximum 5 images allowed").optional().default([]),
  isAvailable: z.boolean().optional().default(true),
});

const listingUpdateSchema = listingCreateSchema.partial();

const reportListingSchema = z.object({
  reason: z.enum([
    "Fake or scam listing",
    "Wrong price or location",
    "Already rented",
    "Inappropriate content",
    "Other",
  ]),
  details: z.string().max(500).optional().default(""),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 6,
      maxLimit: 50,
    });

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

    const [rows, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where,
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
            profile: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }
    res.json({ listing: serializeListing(listing) });
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

router.post(
  "/:id/report",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { reason, details } = reportListingSchema.parse(req.body);
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }

    const report = await prisma.report.upsert({
      where: {
        listingId_reporterId: {
          listingId: req.params.id,
          reporterId: req.user.id,
        },
      },
      create: {
        listingId: req.params.id,
        reporterId: req.user.id,
        reason,
        details,
      },
      update: {
        reason,
        details,
      },
    });

    res.status(201).json({ report });
  })
);

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
