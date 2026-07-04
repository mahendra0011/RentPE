import "dotenv/config";

import cors from "cors";
import express from "express";
import http from "node:http";

import { isCloudinaryReady } from "./config/cloudinary.js";
import { connectDB, isMongoConnected } from "./config/db.js";
import { setupSocket } from "./socket.js";
import { setSocketIO } from "./routes/chat.js";
import { setSocketIO as setRoomsSocketIO } from "./routes/rooms.js";
import { processEmailDigest } from "./services/emailDigest.js";
import adminRouter from "./routes/admin.js";
import citiesRouter from "./routes/cities.js";
import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import geoRouter from "./routes/geo.js";
import reviewsRouter from "./routes/reviews.js";
import roomsRouter from "./routes/rooms.js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const normalizeOrigin = (value) =>
  value
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");
const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.CORS_ORIGINS || "").split(","),
    "http://localhost:5180",
  ]
    .map(normalizeOrigin)
    .filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      const requestOrigin = normalizeOrigin(origin);
      const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin || "");
      const renderOrigin = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(requestOrigin || "");

      if (!requestOrigin || allowedOrigins.has(requestOrigin) || localDevOrigin || renderOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "RentPE API",
    mongodb: isMongoConnected() ? "connected" : "not connected",
    cloudinary: isCloudinaryReady() ? "configured" : "not configured",
  });
});

app.use("/api/admin", adminRouter);
app.use("/api/admin/cities", citiesRouter);
app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/geo", geoRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/rooms", roomsRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    message: error.message || "Internal server error",
  });
});

const ioData = setupSocket(server);
setSocketIO(ioData.io);
setRoomsSocketIO(ioData.io);

connectDB().finally(() => {
  server.listen(port, () => {
    console.log(`RentPE API running on http://localhost:${port}`);
  });

  const digestInterval =
    parseInt(process.env.BREVO_UNREAD_DIGEST_HOURS || "4", 10) * 60 * 60 * 1000;
  setInterval(() => {
    processEmailDigest().catch((err) => console.error("[Digest] Error:", err));
  }, digestInterval);
});
