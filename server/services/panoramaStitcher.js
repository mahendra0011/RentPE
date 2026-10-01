import { Worker } from "node:worker_threads";
import { uploadBuffer, isCloudinaryReady } from "../config/cloudinary.js";
import { emitToUser } from "../socket.js";
import Room from "../models/Room.js";

// In-memory job state store for status polling
const jobs = new Map();

// Periodic cleanup of jobs older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
}, 10 * 60 * 1000);

export function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Executes panorama stitching in a dedicated Node.js worker thread
 * and updates DB & Socket.io upon completion.
 */
export async function executePanoramaStitchJob({ jobId, listingId, userEmail, images, options = {} }) {
  const job = {
    id: jobId,
    listingId,
    userEmail,
    status: "processing",
    progress: 15,
    message: "Initializing worker thread and aligning photos...",
    imageCount: images.length,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  // Notify client via Socket.io
  emitToUser(userEmail, "panorama:progress", {
    jobId,
    listingId,
    progress: 25,
    message: "Stitching photos into 360° spherical panorama...",
  });

  return new Promise((resolve) => {
    const workerUrl = new URL("./panoramaWorker.js", import.meta.url);
    const worker = new Worker(workerUrl, {
      workerData: {
        images,
        options: {
          width: options.width || 3600,
          height: options.height || 1800,
          quality: options.quality || 88,
        },
      },
    });

    worker.on("message", async (result) => {
      if (!result.success) {
        console.error(`[PanoramaStitcher] Job ${jobId} failed:`, result.error);
        job.status = "failed";
        job.error = result.error || "Stitching failed";
        job.failedAt = Date.now();

        emitToUser(userEmail, "panorama:failed", {
          jobId,
          listingId,
          error: job.error,
        });

        resolve({ success: false, error: job.error });
        return;
      }

      try {
        job.progress = 75;
        job.message = "Stitching complete! Uploading high-res 360° tour...";
        emitToUser(userEmail, "panorama:progress", {
          jobId,
          listingId,
          progress: 75,
          message: job.message,
        });

        let panoramaUrl = null;

        // Upload to Cloudinary if configured
        if (isCloudinaryReady()) {
          panoramaUrl = await uploadBuffer({
            buffer: result.buffer,
            mimetype: "image/jpeg",
          });
        } else {
          // Local/dev fallback: use base64 data URI
          console.warn("[PanoramaStitcher] Cloudinary not ready, using embedded preview URI.");
          panoramaUrl = `data:image/jpeg;base64,${result.buffer.toString("base64")}`;
        }

        // Save URL onto Room in MongoDB
        if (listingId) {
          try {
            await Room.findOneAndUpdate(
              {
                $or: [
                  { slug: listingId },
                  ...(listingId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: listingId }] : []),
                ],
              },
              { $addToSet: { panoramaUrls: panoramaUrl } },
              { new: true },
            );
          } catch (dbErr) {
            console.error("[PanoramaStitcher] Error updating room in DB:", dbErr.message);
          }
        }

        job.status = "completed";
        job.progress = 100;
        job.panoramaUrl = panoramaUrl;
        job.completedAt = Date.now();

        // Emit real-time completion to user
        emitToUser(userEmail, "panorama:complete", {
          jobId,
          listingId,
          panoramaUrl,
          message: "Your 360° interactive room view is ready!",
        });

        resolve({
          success: true,
          jobId,
          panoramaUrl,
        });
      } catch (uploadErr) {
        console.error("[PanoramaStitcher] Upload/DB error:", uploadErr);
        job.status = "failed";
        job.error = uploadErr.message;
        job.failedAt = Date.now();

        emitToUser(userEmail, "panorama:failed", {
          jobId,
          listingId,
          error: uploadErr.message,
        });

        resolve({ success: false, error: uploadErr.message });
      }
    });

    worker.on("error", (workerErr) => {
      console.error(`[PanoramaStitcher] Worker execution error on job ${jobId}:`, workerErr);
      job.status = "failed";
      job.error = workerErr.message;
      job.failedAt = Date.now();

      emitToUser(userEmail, "panorama:failed", {
        jobId,
        listingId,
        error: workerErr.message,
      });

      resolve({ success: false, error: workerErr.message });
    });

    worker.on("exit", (code) => {
      if (code !== 0 && job.status === "processing") {
        const errMsg = `Worker stopped with exit code ${code}`;
        job.status = "failed";
        job.error = errMsg;
        emitToUser(userEmail, "panorama:failed", { jobId, listingId, error: errMsg });
        resolve({ success: false, error: errMsg });
      }
    });
  });
}
