import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import { sendExpenseNotificationEmail } from "../../services/email.service.js";
import {
  serializeExpense,
  serializeExpenseShare,
} from "../../utils/serializers.js";
import { assertRoomMember } from "./roomAccess.js";

const router = Router();

const createExpenseSchema = z.object({
  room_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  category: z.string().trim().min(1).max(60),
  split_method: z.enum(["equal", "custom_amount", "custom_percentage"]),
  description: z.string().max(300).optional().default(""),
  shares: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        share_amount: z.coerce.number().min(0),
        is_paid: z.boolean().optional().default(false),
      })
    )
    .min(1),
});

const updateShareSchema = z.object({
  is_paid: z.boolean(),
});

async function notifyRoommatesAboutExpense({
  roomId,
  creatorId,
  creatorName,
  totalAmount,
  category,
  description,
  shares,
  appUrl,
}) {
  const recipientShares = shares.filter(
    (s) => s.user_id !== creatorId && Number(s.share_amount) > 0
  );
  if (recipientShares.length === 0) return;

  const [room, users] = await Promise.all([
    prisma.room.findUnique({ where: { id: roomId }, select: { name: true } }),
    prisma.user.findMany({
      where: { id: { in: recipientShares.map((s) => s.user_id) } },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const roomName = room?.name || "Shared Room";

  await Promise.allSettled(
    recipientShares.map((share) => {
      const recipient = userMap.get(share.user_id);
      if (!recipient?.email) return Promise.resolve();
      return sendExpenseNotificationEmail({
        toEmail: recipient.email,
        toName: recipient.name,
        creatorName,
        roomName,
        description,
        category,
        totalAmount,
        shareAmount: share.share_amount,
        appUrl,
      });
    })
  );
}

router.get(
  "/rooms/:roomId/expenses",
  asyncHandler(async (req, res) => {
    await assertRoomMember(req.params.roomId, req.user.id);
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });
    const where = { roomId: req.params.roomId };

    const [expenses, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      expenses: expenses.map(serializeExpense),
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  })
);

router.post(
  "/expenses",
  asyncHandler(async (req, res) => {
    const data = createExpenseSchema.parse(req.body);
    await assertRoomMember(data.room_id, req.user.id);

    const expense = await prisma.expense.create({
      data: {
        roomId: data.room_id,
        createdBy: req.user.id,
        amount: data.amount,
        category: data.category,
        splitMethod: data.split_method,
        description: data.description,
        shares: {
          create: data.shares.map((s) => ({
            userId: s.user_id,
            shareAmount: s.share_amount,
            isPaid: s.is_paid,
          })),
        },
      },
      include: { shares: true },
    });

    res.status(201).json({
      expense: serializeExpense(expense),
      shares: expense.shares.map(serializeExpenseShare),
    });

    notifyRoommatesAboutExpense({
      roomId: data.room_id,
      creatorId: req.user.id,
      creatorName: req.user.name || "Your roommate",
      totalAmount: data.amount,
      category: data.category,
      description: data.description,
      shares: data.shares,
      appUrl: req.headers.origin,
    }).catch((err) => console.error("Expense email notification error:", err.message));
  })
);

router.get(
  "/rooms/:roomId/expense-shares",
  asyncHandler(async (req, res) => {
    await assertRoomMember(req.params.roomId, req.user.id);
    const shares = await prisma.expenseShare.findMany({
      where: { expense: { roomId: req.params.roomId } },
    });
    res.json({ shares: shares.map(serializeExpenseShare) });
  })
);

router.patch(
  "/expense-shares/:shareId",
  asyncHandler(async (req, res) => {
    const { is_paid } = updateShareSchema.parse(req.body);
    const share = await prisma.expenseShare.findUnique({
      where: { id: req.params.shareId },
      include: { expense: { select: { roomId: true } } },
    });
    if (!share) {
      throw new HttpError(404, "Expense share not found");
    }
    await assertRoomMember(share.expense.roomId, req.user.id);

    const updated = await prisma.expenseShare.update({
      where: { id: req.params.shareId },
      data: { isPaid: is_paid },
    });
    res.json({ share: serializeExpenseShare(updated) });
  })
);

router.delete(
  "/expenses/:expenseId",
  asyncHandler(async (req, res) => {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.expenseId },
      include: { shares: { select: { isPaid: true } } },
    });
    if (!expense) {
      throw new HttpError(404, "Expense not found");
    }
    await assertRoomMember(expense.roomId, req.user.id);

    const allSettled =
      expense.shares.length > 0 && expense.shares.every((s) => s.isPaid);
    if (!allSettled) {
      throw new HttpError(400, "Settle all shares before deleting this expense");
    }

    await prisma.expense.delete({ where: { id: req.params.expenseId } });
    res.json({ ok: true });
  })
);

export default router;
