import { parentPort, workerData } from "node:worker_threads";
import sharp from "sharp";

/**
 * Panorama Worker Thread
 * Stitches multi-angle captured images into an equirectangular 360°x180° panorama.
 * Pure Node.js implementation using Sharp with feathered spherical blending.
 */

async function createFeatheredMask(width, height, featherRadius = 32) {
  // SVG with radial/gradient alpha feathering around the edges
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="feather" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="70%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="90%" stop-color="#ffffff" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="${featherRadius}" ry="${featherRadius}" fill="url(#feather)" />
    </svg>
  `;
  return Buffer.from(svg);
}

async function processSinglePanorama(buffer, targetWidth = 3600, targetHeight = 1800) {
  // Direct panorama normalization
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const processed = await image
    .resize(targetWidth, targetHeight, {
      fit: "fill",
      withoutEnlargement: false,
    })
    .modulate({
      brightness: 1.02,
      saturation: 1.05,
    })
    .sharpen()
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return processed;
}

async function stitchMultiPhotos(images, options = {}) {
  const width = options.width || 3600;
  const height = options.height || 1800;
  const quality = options.quality || 85;

  // Background canvas: warm neutral ambient room sphere base
  const baseCanvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 243, g: 244, b: 246, alpha: 1 },
    },
  });

  // Calculate tile size from typical smartphone camera FOV
  // FOV ~65° horizontal, ~50° vertical on 360x180 canvas
  const tileWidth = Math.round(width * (75 / 360)); // ~750px
  const tileHeight = Math.round(height * (60 / 180)); // ~600px

  const maskSvg = await createFeatheredMask(tileWidth, tileHeight, 28);
  const compositeItems = [];

  // Sort images to composite bottom (floor) first, middle (eye level), then top (ceiling)
  // or ordered by capture index
  const sortedImages = [...images].sort((a, b) => {
    if (a.pitch !== b.pitch) return a.pitch - b.pitch;
    return a.yaw - b.yaw;
  });

  for (let i = 0; i < sortedImages.length; i++) {
    const item = sortedImages[i];
    const pitch = typeof item.pitch === "number" ? item.pitch : 0; // -90 (down) to +90 (up)
    const yaw = typeof item.yaw === "number" ? item.yaw : (i * (360 / sortedImages.length)); // 0 to 360

    try {
      // Resize tile and apply feathered alpha mask for seamless edge blending
      const tile = await sharp(item.buffer)
        .resize(tileWidth, tileHeight, { fit: "cover", position: "center" })
        .composite([
          {
            input: maskSvg,
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();

      // Equirectangular projection mapping
      // Yaw: 0 to 360° maps to 0 to width
      // Pitch: +90° (zenith/ceiling) is y=0, -90° (nadir/floor) is y=height
      const normYaw = ((yaw % 360) + 360) % 360;
      const centerX = Math.round((normYaw / 360) * width);
      const centerY = Math.round(((90 - pitch) / 180) * height);

      const left = Math.round(centerX - tileWidth / 2);
      const top = Math.max(0, Math.min(height - tileHeight, Math.round(centerY - tileHeight / 2)));

      if (left >= 0 && left + tileWidth <= width) {
        compositeItems.push({
          input: tile,
          left,
          top,
          blend: "over",
        });
      } else {
        // Wrap around seam at 0° / 360°
        if (left < 0) {
          // Visible on the left edge
          const visibleWidthOnLeft = tileWidth + left;
          if (visibleWidthOnLeft > 0) {
            const leftPart = await sharp(tile)
              .extract({ left: -left, top: 0, width: visibleWidthOnLeft, height: tileHeight })
              .toBuffer();
            compositeItems.push({
              input: leftPart,
              left: 0,
              top,
              blend: "over",
            });
          }

          // Wrapped onto the right edge
          const wrapWidthOnRight = -left;
          if (wrapWidthOnRight > 0) {
            const rightPart = await sharp(tile)
              .extract({ left: 0, top: 0, width: wrapWidthOnRight, height: tileHeight })
              .toBuffer();
            compositeItems.push({
              input: rightPart,
              left: width - wrapWidthOnRight,
              top,
              blend: "over",
            });
          }
        } else if (left + tileWidth > width) {
          const overflow = left + tileWidth - width;
          const leftWidth = tileWidth - overflow;

          if (leftWidth > 0) {
            const leftPart = await sharp(tile)
              .extract({ left: 0, top: 0, width: leftWidth, height: tileHeight })
              .toBuffer();
            compositeItems.push({
              input: leftPart,
              left,
              top,
              blend: "over",
            });
          }

          if (overflow > 0) {
            const wrappedPart = await sharp(tile)
              .extract({ left: leftWidth, top: 0, width: overflow, height: tileHeight })
              .toBuffer();
            compositeItems.push({
              input: wrappedPart,
              left: 0,
              top,
              blend: "over",
            });
          }
        }
      }
    } catch (tileErr) {
      console.error(`[PanoramaWorker] Error processing tile #${i}:`, tileErr.message);
    }
  }

  // Composite all blended spherical tiles onto equirectangular canvas
  const stitchedBuffer = await baseCanvas
    .composite(compositeItems)
    .modulate({
      brightness: 1.02,
      saturation: 1.06,
    })
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  return stitchedBuffer;
}

async function run() {
  try {
    const { images, options } = workerData || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error("No valid image buffers provided to panorama worker.");
    }

    let outputBuffer;
    if (images.length === 1) {
      outputBuffer = await processSinglePanorama(
        images[0].buffer,
        options?.width,
        options?.height,
      );
    } else {
      outputBuffer = await stitchMultiPhotos(images, options);
    }

    parentPort.postMessage({
      success: true,
      buffer: outputBuffer,
      imageCount: images.length,
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message || "Panorama stitching failed",
    });
  }
}

run();
