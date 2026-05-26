import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { isCloudinaryReady } from "./config/cloudinary.js";
import { connectDB, isMongoConnected } from "./config/db.js";
import authRouter from "./routes/auth.js";
import roommatesRouter from "./routes/roommates.js";
import roomsRouter from "./routes/rooms.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin(origin, callback) {
      const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");

      if (!origin || origin === clientUrl || localDevOrigin) {
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

app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/roommates", roommatesRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    message: error.message || "Internal server error",
  });
});

connectDB().finally(() => {
  app.listen(port, () => {
    console.log(`RentPE API running on http://localhost:${port}`);
  });
});
