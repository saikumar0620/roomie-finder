import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import {
  sendExpenseNotificationEmail,
  sendRoomInviteEmail,
} from "../services/email.service.js";
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

const joinRoomSchema = z.object({
  inviteCode: z.string().trim().min(4).max(20),
});

const addMemberByEmailSchema = z.object({
  email: z.string().trim().email(),
});

const respondInviteSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

const acceptTokenSchema = z.object({
  token: z.string().trim().min(10),
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
  "/rooms/invites",
  asyncHandler(async (req, res) => {
    const invites = await prisma.roomInvite.findMany({
      where: { inviteeId: req.user.id, status: "pending" },
      include: {
        room: { select: { id: true, name: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invites });
  })
);

router.post(
  "/rooms/invites/:inviteId/respond",
  asyncHandler(async (req, res) => {
    const { action } = respondInviteSchema.parse(req.body);
    const invite = await prisma.roomInvite.findUnique({
      where: { id: req.params.inviteId },
    });
    if (!invite || invite.inviteeId !== req.user.id) {
      throw new HttpError(404, "Invite not found");
    }

    if (action === "accept") {
      await prisma.$transaction([
        prisma.roomInvite.update({
          where: { id: invite.id },
          data: { status: "accepted" },
        }),
        prisma.roomMember.upsert({
          where: {
            roomId_userId: { roomId: invite.roomId, userId: req.user.id },
          },
          create: { roomId: invite.roomId, userId: req.user.id },
          update: {},
        }),
      ]);
    } else {
      await prisma.roomInvite.update({
        where: { id: invite.id },
        data: { status: "declined" },
      });
    }

    res.json({ ok: true, status: action === "accept" ? "accepted" : "declined", roomId: invite.roomId });
  })
);

router.post(
  "/rooms/invites/accept-token",
  asyncHandler(async (req, res) => {
    const { token } = acceptTokenSchema.parse(req.body);
    const invite = await prisma.roomInvite.findUnique({
      where: { token },
      include: { room: { select: { id: true, name: true } } },
    });

    if (!invite) {
      throw new HttpError(404, "Invalid or expired invite link");
    }
    if (invite.inviteeId !== req.user.id) {
      throw new HttpError(403, "This invite link belongs to a different user account");
    }

    await prisma.$transaction([
      prisma.roomInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      }),
      prisma.roomMember.upsert({
        where: {
          roomId_userId: { roomId: invite.roomId, userId: req.user.id },
        },
        create: { roomId: invite.roomId, userId: req.user.id },
        update: {},
      }),
    ]);

    res.json({ ok: true, room: invite.room });
  })
);

router.post(
  "/rooms/:roomId/members",
  asyncHandler(async (req, res) => {
    const { email } = addMemberByEmailSchema.parse(req.body);
    await assertRoomMember(req.params.roomId, req.user.id);

    const [room, targetUser] = await Promise.all([
      prisma.room.findUnique({
        where: { id: req.params.roomId },
        select: { id: true, name: true },
      }),
      prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, name: true, email: true },
      }),
    ]);

    if (!targetUser) {
      throw new HttpError(404, "No user found with that email");
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: { roomId: req.params.roomId, userId: targetUser.id },
      },
    });
    if (existingMember) {
      throw new HttpError(409, "User is already a member of this room");
    }

    const inviteToken = crypto.randomBytes(24).toString("hex");
    const invite = await prisma.roomInvite.upsert({
      where: {
        roomId_inviteeId: { roomId: req.params.roomId, inviteeId: targetUser.id },
      },
      create: {
        roomId: req.params.roomId,
        inviterId: req.user.id,
        inviteeId: targetUser.id,
        token: inviteToken,
        status: "pending",
      },
      update: {
        inviterId: req.user.id,
        token: inviteToken,
        status: "pending",
      },
    });

    let emailSent = false;
    try {
      const emailRes = await sendRoomInviteEmail({
        toEmail: targetUser.email,
        toName: targetUser.name,
        inviterName: req.user.name || "Your roommate",
        roomName: room?.name || "Shared Room",
        token: inviteToken,
        appUrl: req.headers.origin,
      });
      emailSent = emailRes.sent;
    } catch (err) {
      console.error("Invite email send failed:", err.message);
    }

    res.status(201).json({
      invite,
      emailSent,
      message: emailSent
        ? `Email & in-app invite sent to ${targetUser.email}`
        : `In-app invite sent to ${targetUser.name} (configure SMTP_USER/SMTP_PASS to send emails)`,
    });
  })
);

router.delete(
  "/rooms/:roomId/members/:userId",
  asyncHandler(async (req, res) => {
    const { roomId, userId } = req.params;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    const isSelf = userId === req.user.id;
    const isCreator = room.createdBy === req.user.id;
    if (!isSelf && !isCreator) {
      throw new HttpError(403, "Only the room creator can remove other members");
    }
    if (userId === room.createdBy) {
      throw new HttpError(400, "Room creator cannot be removed");
    }

    await prisma.roomMember.deleteMany({
      where: { roomId, userId },
    });

    res.json({ ok: true });
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
      prisma.chore.findMany({
        where: { roomId },
        orderBy: [{ isDone: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    if (room && !room.inviteCode) {
      room = await prisma.room.update({
        where: { id: room.id },
        data: { inviteCode: crypto.randomBytes(4).toString("hex").toUpperCase() },
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

    // Fire-and-forget personalized email notifications to roommates who owe a share
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

const createChoreSchema = z.object({
  title: z.string().trim().min(1).max(160),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateChoreSchema = z.object({
  isDone: z.boolean(),
});

router.post(
  "/rooms/:roomId/chores",
  asyncHandler(async (req, res) => {
    const data = createChoreSchema.parse(req.body);
    await assertRoomMember(req.params.roomId, req.user.id);

    const chore = await prisma.chore.create({
      data: {
        roomId: req.params.roomId,
        title: data.title,
        assignedTo: data.assignedTo ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
    res.status(201).json({ chore });
  })
);

router.patch(
  "/chores/:choreId",
  asyncHandler(async (req, res) => {
    const { isDone } = updateChoreSchema.parse(req.body);
    const existing = await prisma.chore.findUnique({
      where: { id: req.params.choreId },
    });
    if (!existing) {
      throw new HttpError(404, "Chore not found");
    }
    await assertRoomMember(existing.roomId, req.user.id);

    const chore = await prisma.chore.update({
      where: { id: req.params.choreId },
      data: { isDone },
    });
    res.json({ chore });
  })
);

router.delete(
  "/chores/:choreId",
  asyncHandler(async (req, res) => {
    const existing = await prisma.chore.findUnique({
      where: { id: req.params.choreId },
    });
    if (!existing) {
      throw new HttpError(404, "Chore not found");
    }
    await assertRoomMember(existing.roomId, req.user.id);

    await prisma.chore.delete({ where: { id: req.params.choreId } });
    res.json({ ok: true });
  })
);

export default router;
