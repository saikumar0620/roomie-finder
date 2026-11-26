import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { UPLOADS_DIR } from "./services/storage.service.js";

import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import expenseRoutes from "./routes/expense.routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", globalLimiter);

  app.use("/uploads", express.static(UPLOADS_DIR));

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: "connected" });
    } catch {
      res.status(503).json({ ok: false, db: "disconnected" });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/profiles", profileRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/conversations", chatRoutes);
  app.use("/api", expenseRoutes);

  app.use(errorHandler);
  return app;
}
