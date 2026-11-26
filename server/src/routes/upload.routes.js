import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/rateLimit.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { saveFile } from "../services/storage.service.js";

const router = Router();
router.use(uploadLimiter);

router.post(
  "/images",
  requireAuth,
  upload.array("images", 6),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) {
      throw new HttpError(400, "At least one image file is required");
    }
    const urls = await Promise.all(
      req.files.map((file) => saveFile(file, "listings"))
    );
    res.status(201).json({ urls });
  })
);

router.post(
  "/avatar",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "Avatar file is required");
    }
    const url = await saveFile(req.file, "avatars");
    res.status(201).json({ url });
  })
);

export default router;

