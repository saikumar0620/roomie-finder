import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { serializeFavorite } from "../utils/serializers.js";

const router = Router();
router.use(requireAuth);

const addFavoriteSchema = z.object({
  listingId: z.string().uuid(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });
    const where = { userId: req.user.id };

    const [favorites, total] = await prisma.$transaction([
      prisma.favorite.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.favorite.count({ where }),
    ]);

    res.json({
      favorites: favorites.map(serializeFavorite),
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { listingId } = addFavoriteSchema.parse(req.body);
    const favorite = await prisma.favorite.upsert({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId,
        },
      },
      create: {
        userId: req.user.id,
        listingId,
      },
      update: {},
    });
    res.status(201).json({ favorite: serializeFavorite(favorite) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await prisma.favorite.deleteMany({
      where: {
        userId: req.user.id,
        OR: [{ id: req.params.id }, { listingId: req.params.id }],
      },
    });
    if (result.count === 0) {
      throw new HttpError(404, "Favorite not found");
    }
    res.json({ ok: true });
  })
);

export default router;
