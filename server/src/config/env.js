import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev_only_secret_change_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

if (
  env.nodeEnv === "production" &&
  (!env.databaseUrl || env.jwtSecret.startsWith("dev_only_"))
) {
  throw new Error(
    "DATABASE_URL and a strong JWT_SECRET must be set in production."
  );
}
