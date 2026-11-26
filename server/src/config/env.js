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
  cloudinary: {
    cloudName: (process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
    apiKey: (process.env.CLOUDINARY_API_KEY || "").trim(),
    apiSecret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
  },
  email: {
    brevoApiKey: (process.env.BREVO_API_KEY || "").trim(),
    senderEmail: (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || "").trim(),
    user: (process.env.SMTP_USER || "").trim(),
    pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    appUrl: (process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173")
      .split(",")[0]
      .trim()
      .replace(/\/+$/, ""),
  },
};

if (
  env.nodeEnv === "production" &&
  (!env.databaseUrl || env.jwtSecret.startsWith("dev_only_"))
) {
  throw new Error(
    "DATABASE_URL and a strong JWT_SECRET must be set in production."
  );
}
