import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import {
  extractToken,
  requireAuth,
  SESSION_TTL_MS,
  setAuthCookie,
  signToken,
} from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { serializeUser } from "../utils/serializers.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required").max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

async function createSessionForUser(user, req) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      userAgent: req.headers["user-agent"]?.slice(0, 255) || null,
      ipAddress: req.ip || null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return signToken(user, session.id);
}

router.post(
  "/signup",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name } = signupSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        profile: {
          create: { name },
        },
      },
    });

    const token = await createSessionForUser(user, req);
    setAuthCookie(res, token);
    res.status(201).json({ user: serializeUser(user), token });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = await createSessionForUser(user, req);
    setAuthCookie(res, token);
    res.json({ user: serializeUser(user), token });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = extractToken(req);
    if (token) {
      try {
        const payload = jwt.verify(token, env.jwtSecret);
        if (payload?.sessionId) {
          await prisma.session.deleteMany({ where: { id: payload.sessionId } });
        }
      } catch {
        // Ignore invalid/expired token on logout
      }
    }
    res.clearCookie("token");
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    res.json({ user: serializeUser(user) });
  })
);

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

export default router;
