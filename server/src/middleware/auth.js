import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function extractToken(req) {
  return (
    req.cookies?.token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null)
  );
}

export function signToken(user, sessionId) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, sessionId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: SESSION_TTL_MS,
  });
}

export async function verifySessionToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  if (!payload?.sessionId) {
    throw new Error("Missing session");
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw new Error("Session expired or revoked");
  }

  return payload;
}

export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.user = await verifySessionToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
