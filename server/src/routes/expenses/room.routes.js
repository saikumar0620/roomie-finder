import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { assertRoomMember } from "./roomAccess.js";
import {
  serializeExpense,
  serializeExpenseShare,
  serializeRecurringBill,
} from "../../utils/serializers.js";

const router = Router();

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

const joinRoomSchema = z.object({
  inviteCode: z.string().trim().min(4).max(20),
});

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
    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const room = await prisma.room.create({
      data: {
        name,
        inviteCode,
        createdBy: req.user.id,
        members: {
          create: uniqueMembers.map((userId) => ({ userId })),
        },
      },
    });
    res.status(201).json({ room });
  })
);

router.post(
  "/rooms/join",
  asyncHandler(async (req, res) => {
    const { inviteCode } = joinRoomSchema.parse(req.body);
    const room = await prisma.room.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });
    if (!room) {
      throw new HttpError(404, "Invalid room invite code");
    }

    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
      create: { roomId: room.id, userId: req.user.id },
      update: {},
    });

    res.json({ room });
  })
);

router.get(
  "/rooms/:roomId/dashboard",
  asyncHandler(async (req, res) => {
    const roomId = req.params.roomId;
    await assertRoomMember(roomId, req.user.id);

    let [room, members, expenses, shares, bills, chores] = await Promise.all([
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.roomMember.findMany({
        where: { roomId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: { select: { upiId: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.expense.findMany({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.expenseShare.findMany({
        where: { expense: { roomId } },
      }),
      prisma.recurringBill.findMany({
        where: { roomId },
        orderBy: { dueDate: "asc" },
      }),
      prisma.chore.findMany({
        where: { roomId },
        orderBy: [{ isDone: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    if (room && !room.inviteCode) {
      const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      room = await prisma.room.update({
        where: { id: room.id },
        data: { inviteCode },
      });
    }

    res.json({
      room,
      members: members.map((m) => ({
        $id: m.user.id,
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        upiId: m.user.profile?.upiId ?? null,
      })),
      expenses: expenses.map(serializeExpense),
      shares: shares.map(serializeExpenseShare),
      bills: bills.map(serializeRecurringBill),
      chores,
    });
  })
);

export default router;
