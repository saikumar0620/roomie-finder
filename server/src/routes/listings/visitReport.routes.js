import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { sendVisitRequestEmail } from "../../services/email.service.js";
import {
  serializeConversation,
  serializeMessage,
} from "../../utils/serializers.js";

const router = Router();

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

const visitRequestSchema = z.object({
  visitDate: z.string().datetime(),
  note: z.string().max(400).optional().default(""),
});

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
      update: { reason, details },
    });

    res.status(201).json({ report });
  })
);

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

export default router;
