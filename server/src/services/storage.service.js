import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * Save an uploaded file buffer to local disk.
 * Abstracted here so it can later be swapped for Neon Object Storage / S3.
 */
export async function saveFile(file, folder = "general") {
  const targetDir = path.join(UPLOADS_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = EXT_BY_MIME[file.mimetype] || ".bin";
  const filename = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(targetDir, filename);

  await fs.writeFile(fullPath, file.buffer);
  return `/uploads/${folder}/${filename}`;
}

