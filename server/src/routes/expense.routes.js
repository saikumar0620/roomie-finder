import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import {
  serializeExpense,
  serializeExpenseShare,
  serializeRecurringBill,
} from "../utils/serializers.js";

const router = Router();
router.use(requireAuth);

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

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

const createBillSchema = z.object({
  room_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(200),
  interval: z.enum(["Weekly", "Monthly", "Yearly"]),
  due_date: z.string().datetime(),
});

async function assertRoomMember(roomId, userId) {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) {
    throw new HttpError(403, "You are not a member of this room");
  }
}

router.get(
  "/rooms",
  asyncHandler(async (req, res) => {
    const rooms = await prisma.room.findMany({
      where: { members: { some: { userId: req.user.id } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ rooms });
  })
);

router.post(
  "/rooms",
  asyncHandler(async (req, res) => {
    const { name, memberIds } = createRoomSchema.parse(req.body);
    const uniqueMembers = Array.from(new Set([req.user.id, ...memberIds]));

    const room = await prisma.room.create({
      data: {
        name,
        createdBy: req.user.id,
        members: {
          create: uniqueMembers.map((userId) => ({ userId })),
        },
      },
    });
    res.status(201).json({ room });
  })
);

router.get(
  "/rooms/:roomId/dashboard",
  asyncHandler(async (req, res) => {
    const roomId = req.params.roomId;
    await assertRoomMember(roomId, req.user.id);

    const [members, expenses, shares, bills] = await Promise.all([
      prisma.roomMember.findMany({
        where: { roomId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.expense.findMany({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.expenseShare.findMany({
        where: { expense: { roomId } },
      }),
      prisma.recurringBill.findMany({
        where: { roomId },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    res.json({
      members: members.map((m) => ({
        $id: m.user.id,
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
      expenses: expenses.map(serializeExpense),
      shares: shares.map(serializeExpenseShare),
      bills: bills.map(serializeRecurringBill),
    });
  })
);

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
      include: { expense: true },
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

router.get(
  "/rooms/:roomId/recurring-bills",
  asyncHandler(async (req, res) => {
    await assertRoomMember(req.params.roomId, req.user.id);
    const bills = await prisma.recurringBill.findMany({
      where: { roomId: req.params.roomId },
      orderBy: { dueDate: "asc" },
    });
    res.json({ bills: bills.map(serializeRecurringBill) });
  })
);

router.post(
  "/recurring-bills",
  asyncHandler(async (req, res) => {
    const data = createBillSchema.parse(req.body);
    await assertRoomMember(data.room_id, req.user.id);
    const bill = await prisma.recurringBill.create({
      data: {
        roomId: data.room_id,
        createdBy: req.user.id,
        amount: data.amount,
        description: data.description,
        interval: data.interval,
        dueDate: new Date(data.due_date),
      },
    });
    res.status(201).json({ bill: serializeRecurringBill(bill) });
  })
);

export default router;
