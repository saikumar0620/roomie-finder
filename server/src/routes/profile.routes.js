import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { serializeProfile } from "../utils/serializers.js";

const router = Router();

const upsertProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  bio: z.string().max(1000).optional().default(""),
  habits: z.string().max(500).optional().default(""),
  avatarId: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
  upiId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  lookingForRoom: z.boolean().optional().default(false),
});

router.get(
  "/roommates",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });
    const where = { lookingForRoom: true };
    if (req.query.verifiedOnly === "true") {
      where.user = { isVerified: true };
    }

    const [profiles, total] = await prisma.$transaction([
      prisma.profile.findMany({
        where,
        include: { user: { select: { isVerified: true } } },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.profile.count({ where }),
    ]);

    res.json({
      profiles: profiles.map(serializeProfile),
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  })
);

router.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.params.userId },
      include: { user: { select: { isVerified: true } } },
    });
    if (!profile) {
      throw new HttpError(404, "Profile not found");
    }
    res.json({ profile: serializeProfile(profile) });
  })
);

router.put(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = upsertProfileSchema.parse(req.body);
    const avatar = data.avatarUrl ?? data.avatarId;

    const [profile] = await prisma.$transaction([
      prisma.profile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          name: data.name,
          bio: data.bio,
          habits: data.habits,
          avatarUrl: avatar ?? null,
          upiId: data.upiId ?? null,
          lookingForRoom: data.lookingForRoom,
        },
        update: {
          name: data.name,
          bio: data.bio,
          habits: data.habits,
          lookingForRoom: data.lookingForRoom,
          ...(data.upiId !== undefined ? { upiId: data.upiId } : {}),
          ...(avatar !== undefined ? { avatarUrl: avatar } : {}),
        },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { name: data.name },
      }),
    ]);

    res.json({ profile: serializeProfile(profile) });
  })
);

export default router;
