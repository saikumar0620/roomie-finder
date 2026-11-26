import rateLimit from "express-rate-limit";

function createLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: message });
    },
  });
}

// General API protection: 100 requests per 15 minutes per IP
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests. Please slow down and try again shortly.",
});

// Strict brute-force protection for login/signup: 10 attempts per 15 minutes
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

// File upload protection: 20 uploads per 15 minutes
export const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Upload limit reached. Please wait a few minutes before uploading again.",
});

// Chat / message spam protection: 60 messages per minute
export const messageLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: "You are sending messages too quickly. Please wait a moment.",
});
