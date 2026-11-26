import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { sendVisitRequestEmail } from "../services/email.service.js";
import {
  serializeConversation,
  serializeListing,
  serializeMessage,
} from "../utils/serializers.js";

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

    const hasLat = req.query.lat !== undefined && req.query.lat !== "";
    const hasLng = req.query.lng !== undefined && req.query.lng !== "";

    if (hasLat && hasLng) {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 5, 0.5), 50);

      if (
        Number.isNaN(lat) ||
        Number.isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        throw new HttpError(400, "Invalid latitude or longitude");
      }

      // Bounding box pre-filter so Postgres can use idx_listings_coords_available
      const dLat = radiusKm / 111.045;
      const dLng = radiusKm / (111.045 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

      const values = [
        lat,
        lng,
        lat - dLat,
        lat + dLat,
        lng - dLng,
        lng + dLng,
      ];
      const extraConditions = [];

      if (req.query.minRent) {
        values.push(Number(req.query.minRent));
        extraConditions.push(`rent >= $${values.length}`);
      }
      if (req.query.maxRent) {
        values.push(Number(req.query.maxRent));
        extraConditions.push(`rent <= $${values.length}`);
      }
      if (req.query.location) {
        values.push(`%${String(req.query.location).trim()}%`);
        extraConditions.push(`location ILIKE $${values.length}`);
      }
      if (req.query.preferences) {
        values.push(String(req.query.preferences).trim());
        extraConditions.push(`preferences = $${values.length}`);
      }
      if (req.query.amenities) {
        const amenList = String(req.query.amenities)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (amenList.length > 0) {
          values.push(amenList);
          extraConditions.push(`l.amenities @> $${values.length}::text[]`);
        }
      }
      if (req.query.verifiedOnly === "true") {
        extraConditions.push(`u.is_verified = true`);
      }

      values.push(radiusKm);
      const radiusParam = `$${values.length}`;

      const whereSql = [
        `l.is_available = true`,
        `l.latitude IS NOT NULL`,
        `l.longitude IS NOT NULL`,
        `l.latitude BETWEEN $3 AND $4`,
        `l.longitude BETWEEN $5 AND $6`,
        ...extraConditions.map((c) =>
          c.replace(/^(rent|location|preferences)\b/, "l.$1")
        ),
      ].join(" AND ");

      const haversineSql = `
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(l.latitude))
          ))
        )
      `;

      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS total
         FROM (
           SELECT l.id, (${haversineSql}) AS distance_km
           FROM roomie_finder.listings l
           JOIN roomie_finder.users u ON u.id = l.user_id
           WHERE ${whereSql}
         ) sub
         WHERE distance_km <= ${radiusParam}`,
        ...values
      );
      const total = countRows[0]?.total || 0;

      const limitParam = `$${values.length + 1}`;
      const offsetParam = `$${values.length + 2}`;
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM (
           SELECT l.id, l.user_id, l.title, l.rent, l.location, l.latitude, l.longitude,
                  l.description, l.preferences, l.amenities, l.images, l.is_available,
                  l.created_at, l.updated_at,
                  u.is_verified AS owner_verified,
                  (${haversineSql}) AS distance_km
           FROM roomie_finder.listings l
           JOIN roomie_finder.users u ON u.id = l.user_id
           WHERE ${whereSql}
         ) sub
         WHERE distance_km <= ${radiusParam}
         ORDER BY distance_km ASC, created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        ...values,
        limit,
        skip
      );

      const pagination = buildPaginationMeta({ page, limit, total });
      return res.json({
        documents: rows.map(serializeListing),
        nextPage: pagination.nextPage,
        pagination,
      });
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
      const hoursAgo = (Date.now() - new Date(lastMsg.createdAt).getTime()) / 3600000;
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

const visitRequestSchema = z.object({
  visitDate: z.string().datetime(),
  note: z.string().max(400).optional().default(""),
});

router.post(
  "/:id/visit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { visitDate, note } = visitRequestSchema.parse(req.body);
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }
    if (listing.userId === req.user.id) {
      throw new HttpError(400, "Cannot request a visit on your own listing");
    }

    const formattedDate = new Date(visitDate).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    let conversation = await prisma.conversation.findFirst({
      where: {
        listingId: listing.id,
        OR: [
          { user1Id: req.user.id, user2Id: listing.userId },
          { user1Id: listing.userId, user2Id: req.user.id },
        ],
      },
      include: { listing: { select: { title: true } } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          listingId: listing.id,
          user1Id: req.user.id,
          user2Id: listing.userId,
        },
        include: { listing: { select: { title: true } } },
      });
    }

    const messageText = `📅 Visit Request for "${listing.title}" on ${formattedDate}${
      note ? ` — "${note}"` : ""
    }`;

    const [visit, message, updatedConv] = await prisma.$transaction([
      prisma.visitRequest.create({
        data: {
          listingId: listing.id,
          requesterId: req.user.id,
          ownerId: listing.userId,
          visitDate: new Date(visitDate),
          note,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user.id,
          text: messageText,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
        include: { listing: { select: { title: true } } },
      }),
    ]);

    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversation.id}`).emit(
        "new_message",
        serializeMessage(message)
      );
      io.to(`user:${req.user.id}`)
        .to(`user:${listing.userId}`)
        .emit("conversation_updated", serializeConversation(updatedConv));
      io.to(`user:${listing.userId}`).emit("unread_updated");
    }

    if (listing.user?.email) {
      sendVisitRequestEmail({
        toEmail: listing.user.email,
        toName: listing.user.name,
        requesterName: req.user.name || "A renter",
        listingTitle: listing.title,
        visitDate,
        note,
        conversationId: conversation.id,
        appUrl: req.headers.origin,
      }).catch((err) => console.error("Visit email failed:", err.message));
    }

    res.status(201).json({ visit, conversationId: conversation.id });
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
