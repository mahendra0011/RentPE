import "dotenv/config";
import mongoose from "mongoose";

import { connectDB, isMongoConnected } from "../server/config/db.js";
import Room from "../server/models/Room.js";
import { defaultRoomImages, roomImageSets } from "../src/data/cloudinaryRoomImages.js";

const fallbackImageWindow = 3;

await connectDB();

if (!isMongoConnected()) {
  console.log("MongoDB is not connected. Seed image backfill skipped.");
  process.exit(0);
}

let seedUpdatedCount = 0;

for (const [slug, images] of Object.entries(roomImageSets)) {
  const result = await Room.updateOne(
    { slug },
    {
      $set: {
        images,
      },
    },
  );

  if (result.matchedCount) {
    seedUpdatedCount += result.modifiedCount;
    console.log(`${slug}: ${result.modifiedCount ? "updated" : "already current"}`);
  } else {
    console.log(`${slug}: not found`);
  }
}

const roomsMissingImages = await Room.find({
  $or: [{ images: { $exists: false } }, { images: { $size: 0 } }],
})
  .sort({ createdAt: -1, slug: 1 })
  .lean();

let missingUpdatedCount = 0;

for (let index = 0; index < roomsMissingImages.length; index += 1) {
  const room = roomsMissingImages[index];
  const images = getFallbackRoomImages(room, index);

  if (!images.length) continue;

  await Room.updateOne({ _id: room._id }, { $set: { images } });
  missingUpdatedCount += 1;
  console.log(`${room.slug}: filled missing images`);
}

console.log(
  `Room image backfill complete. Seed updates: ${seedUpdatedCount}. Missing-image updates: ${missingUpdatedCount}.`,
);
await mongoose.disconnect();

function getFallbackRoomImages(room = {}, index = 0) {
  const slugImages = roomImageSets[room.slug];
  if (slugImages?.length) return slugImages;
  if (!defaultRoomImages.length) return [];

  const startIndex = (index * fallbackImageWindow) % defaultRoomImages.length;
  return Array.from(
    { length: Math.min(fallbackImageWindow, defaultRoomImages.length) },
    (_, offset) => defaultRoomImages[(startIndex + offset) % defaultRoomImages.length],
  );
}
