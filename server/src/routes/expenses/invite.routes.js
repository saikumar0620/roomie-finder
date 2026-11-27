import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { sendRoomInviteEmail } from "../../services/email.service.js";
import { assertRoomMember } from "./roomAccess.js";

const router = Router();

const addMemberByEmailSchema = z.object({
  email: z.string().trim().email(),
});

const respondInviteSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

const acceptTokenSchema = z.object({
  token: z.string().trim().min(10),
});

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

    res.json({
      ok: true,
      status: action === "accept" ? "accepted" : "declined",
      roomId: invite.roomId,
    });
  })
);

router.post(
  "/rooms/invites/accept-token",
  asyncHandler(async (req, res) => {
    const { token } = acceptTokenSchema.parse(req.body);
    const invite = await prisma.roomInvite.findUnique({
      where: { token },
      include: {
        room: { select: { id: true, name: true } },
        invitee: { select: { email: true } },
      },
    });

    if (!invite) {
      throw new HttpError(404, "Invalid or expired invite link");
    }
    if (invite.inviteeId !== req.user.id) {
      const msg =
        invite.inviterId === req.user.id
          ? `You sent this invite to ${invite.invitee.email}. Sign in as ${invite.invitee.email} to accept it.`
          : `This invite was sent to ${invite.invitee.email}, but you are signed in as ${req.user.email}. Please sign in with ${invite.invitee.email}.`;
      throw new HttpError(403, msg);
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

export default router;
