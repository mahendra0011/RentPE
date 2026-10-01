import express from "express";
import multer from "multer";
import { getAuthUser } from "../middleware/auth.js";
import { executePanoramaStitchJob, getJobStatus } from "../services/panoramaStitcher.js";
import Room from "../models/Room.js";

const router = express.Router();

// Configure memory storage for uploaded photos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max per image
    files: 36, // up to 36 photos per panorama capture session
  },
});

/**
 * POST /api/panorama/upload
 * Accepts batch photo uploads with pitch/yaw angle metadata and listingId.
 * Responds immediately with a jobId; executes stitching in a background worker thread.
 */
router.post("/upload", upload.array("photos", 36), async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const userEmail = authUser?.email || req.body.ownerEmail || "owner@roomsfind.com";
    const { listingId } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No photos provided for 360° panorama stitching.",
      });
    }

    // Parse orientation metadata array if provided
    let metadataList = [];
    if (req.body.metadata) {
      try {
        metadataList = typeof req.body.metadata === "string"
          ? JSON.parse(req.body.metadata)
          : req.body.metadata;
      } catch {
        metadataList = [];
      }
    }

    const jobId = `pano_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const images = req.files.map((file, idx) => {
      const meta = metadataList[idx] || {};
      return {
        buffer: file.buffer,
        pitch: typeof meta.pitch === "number" ? meta.pitch : 0,
        yaw: typeof meta.yaw === "number" ? meta.yaw : idx * (360 / req.files.length),
        order: typeof meta.order === "number" ? meta.order : idx,
      };
    });

    // Respond immediately so mobile client isn't blocked waiting
    res.status(202).json({
      ok: true,
      jobId,
      status: "processing",
      photoCount: images.length,
      listingId: listingId || null,
      message: "Photos received. 360° stitching job queued.",
    });

    // Run stitching asynchronously in background worker thread
    executePanoramaStitchJob({
      jobId,
      listingId,
      userEmail,
      images,
      options: {
        width: 3600,
        height: 1800,
        quality: 88,
      },
    }).catch((err) => {
      console.error(`[PanoramaRoute] Background job ${jobId} failed:`, err);
    });
  } catch (error) {
    console.error("[PanoramaRoute] Upload error:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to process panorama upload.",
    });
  }
});

/**
 * GET /api/panorama/status/:jobId
 * Polling fallback for status check
 */
router.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = getJobStatus(jobId);

  if (!job) {
    return res.status(404).json({
      ok: false,
      message: `Job ${jobId} not found.`,
    });
  }

  res.json({
    ok: true,
    job,
  });
});

/**
 * POST /api/panorama/direct-url
 * Attach an existing 360 equirectangular panorama URL directly to a room
 */
router.post("/direct-url", async (req, res) => {
  try {
    const { listingId, panoramaUrl } = req.body;
    if (!listingId || !panoramaUrl) {
      return res.status(400).json({
        ok: false,
        message: "listingId and panoramaUrl are required.",
      });
    }

    const updated = await Room.findOneAndUpdate(
      {
        $or: [
          { slug: listingId },
          ...(listingId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: listingId }] : []),
        ],
      },
      { $addToSet: { panoramaUrls: panoramaUrl } },
      { new: true },
    );

    res.json({
      ok: true,
      room: updated,
      panoramaUrl,
      message: "360° virtual tour added successfully to listing.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to attach panorama URL.",
    });
  }
});

export default router;
