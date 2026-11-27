import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../services/email.service.js";
import { serializeUser } from "../../utils/serializers.js";

const router = Router();

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name,
        token: rawToken,
        appUrl: req.headers.origin,
      }).catch((err) => console.error("Reset email failed:", err.message));
    }

    res.json({
      ok: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt <= new Date()
    ) {
      throw new HttpError(400, "Invalid or expired reset link");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    res.json({ ok: true, message: "Password updated! Please sign in." });
  })
);

router.post(
  "/send-verification",
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, isVerified: true },
    });
    if (!user) throw new HttpError(404, "User not found");
    if (user.isVerified) {
      return res.json({ ok: true, alreadyVerified: true });
    }

    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.$transaction([
      prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
      prisma.emailVerification.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      }),
    ]);

    await sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      code,
    });

    res.json({ ok: true, message: "Verification code sent to your email." });
  })
);

router.post(
  "/verify-email",
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      throw new HttpError(400, "Please enter a valid 6-digit code");
    }

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const record = await prisma.emailVerification.findFirst({
      where: {
        userId: req.user.id,
        codeHash,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new HttpError(400, "Invalid or expired verification code");
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { isVerified: true, verifiedAt: new Date() },
      }),
      prisma.emailVerification.deleteMany({ where: { userId: req.user.id } }),
    ]);

    res.json({ user: serializeUser(updatedUser) });
  })
);

export default router;
