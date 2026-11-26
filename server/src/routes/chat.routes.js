import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { messageLimiter } from "../middleware/rateLimit.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { serializeConversation, serializeMessage } from "../utils/serializers.js";

const router = Router();
router.use(requireAuth);

const createConvSchema = z.object({
  otherUserId: z.string().uuid(),
  listingId: z.string().optional().nullable(),
});

const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

async function assertConversationMember(conversationId, userId) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conv) {
    throw new HttpError(404, "Conversation not found");
  }
  if (conv.user1Id !== userId && conv.user2Id !== userId) {
    throw new HttpError(403, "Not a participant in this conversation");
  }
  return conv;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 50,
    });
    const where = {
      OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
    };

    const [conversations, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where,
        include: { listing: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      conversations: conversations.map(serializeConversation),
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { otherUserId, listingId } = createConvSchema.parse(req.body);
    if (otherUserId === req.user.id) {
      throw new HttpError(400, "Cannot start a conversation with yourself");
    }

    const normalizedListingId =
      listingId && listingId !== "general" ? listingId : null;

    let conversation = await prisma.conversation.findFirst({
      where: {
        listingId: normalizedListingId,
        OR: [
          { user1Id: req.user.id, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: req.user.id },
        ],
      },
      include: { listing: { select: { title: true } } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          listingId: normalizedListingId,
          user1Id: req.user.id,
          user2Id: otherUserId,
        },
        include: { listing: { select: { title: true } } },
      });
    }

    const serialized = serializeConversation(conversation);
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${req.user.id}`)
        .to(`user:${otherUserId}`)
        .emit("conversation_updated", serialized);
    }

    res.status(201).json({ conversation: serialized });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await assertConversationMember(req.params.id, req.user.id);
    await prisma.conversation.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    await assertConversationMember(req.params.id, req.user.id);
    const { page, limit, skip } = parsePagination(req.query, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const where = { conversationId: req.params.id };

    const [messages, total] = await prisma.$transaction([
      prisma.message.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: limit,
        skip,
      }),
      prisma.message.count({ where }),
    ]);

    res.json({
      messages: messages.map(serializeMessage),
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  })
);

router.post(
  "/:id/messages",
  messageLimiter,
  asyncHandler(async (req, res) => {
    const { text } = sendMessageSchema.parse(req.body);
    const convId = req.params.id;
    const conv = await assertConversationMember(convId, req.user.id);

    const [message, updatedConv] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: convId,
          senderId: req.user.id,
          text,
        },
      }),
      prisma.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
        include: { listing: { select: { title: true } } },
      }),
    ]);

    const serializedMsg = serializeMessage(message);
    const serializedConv = serializeConversation(updatedConv);

    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${convId}`).emit("new_message", serializedMsg);
      io.to(`user:${conv.user1Id}`)
        .to(`user:${conv.user2Id}`)
        .emit("conversation_updated", serializedConv);
    }

    res.status(201).json({ message: serializedMsg });
  })
);

export default router;
