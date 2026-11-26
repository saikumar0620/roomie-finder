import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const hasCloudinary =
  Boolean(env.cloudinary.cloudName) &&
  Boolean(env.cloudinary.apiKey) &&
  Boolean(env.cloudinary.apiSecret);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `roomie-finder/${folder}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Save an uploaded image to Cloudinary when configured,
 * falling back to local disk (/uploads) in local development.
 */
export async function saveFile(file, folder = "general") {
  if (hasCloudinary) {
    return await uploadToCloudinary(file.buffer, folder);
  }

  const targetDir = path.join(UPLOADS_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = EXT_BY_MIME[file.mimetype] || ".bin";
  const filename = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(targetDir, filename);

  await fs.writeFile(fullPath, file.buffer);
  return `/uploads/${folder}/${filename}`;
}
