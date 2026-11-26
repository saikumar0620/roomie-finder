import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

function createLimiter({ windowMs, limit, message, skipInDev = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => skipInDev && env.nodeEnv !== "production",
    handler: (_req, res) => {
      res.status(429).json({ error: message });
    },
  });
}

// General API protection: 500 requests per 15 minutes in production (skipped in local dev)
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  skipInDev: true,
  message: "Too many requests. Please slow down and try again shortly.",
});

// Strict brute-force protection for login/signup: 20 attempts per 15 minutes
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

// File upload protection: 30 uploads per 15 minutes
export const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Upload limit reached. Please wait a few minutes before uploading again.",
});

// Chat / message spam protection: 60 messages per minute
export const messageLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: "You are sending messages too quickly. Please wait a moment.",
});
