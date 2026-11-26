import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const firstMsg = err.errors[0]?.message || "Validation failed";
    return res.status(400).json({
      error: firstMsg,
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Account or resource already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Resource not found" });
    }
    if (err.code === "P2023") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
  }

  if (
    err?.message?.includes("images are allowed") ||
    err?.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error("Unhandled server error:", err);
  }
  return res.status(status).json({
    error: status >= 500 ? "Internal server error" : err.message,
  });
}
