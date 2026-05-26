import { Router } from "express";

import { isMongoConnected } from "../config/db.js";
import User from "../models/User.js";
import { sendOtpEmail } from "../services/brevo.js";

const router = Router();
const otpStore = new Map();
const memoryUsers = new Map();

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createToken(user) {
  return Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      name: user.name || "",
      issuedAt: Date.now(),
    }),
  ).toString("base64url");
}

function safeUser(user) {
  return {
    email: user.email,
    role: user.role,
    name: user.name || "",
  };
}

async function upsertUser({ email, role, name }) {
  if (isMongoConnected()) {
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          role,
          name: name || email.split("@")[0],
          lastLoginAt: new Date(),
        },
      },
      { new: true, upsert: true },
    ).lean();

    return user;
  }

  const existing = memoryUsers.get(email) || {};
  const user = {
    email,
    role,
    name: name || existing.name || email.split("@")[0],
    lastLoginAt: new Date(),
  };
  memoryUsers.set(email, user);
  return user;
}

router.post("/request-otp", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const role = request.body.isOwner ? "owner" : "seeker";

    if (!email || !email.includes("@")) {
      response.status(400).json({ message: "Valid email is required." });
      return;
    }

    const otp = createOtp();
    otpStore.set(email, {
      otp,
      role,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const delivery = await sendOtpEmail({ email, otp });
    response.json({
      ok: true,
      delivered: delivery.delivered,
      devOtp: delivery.devOtp,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp || "").trim();
    const stored = otpStore.get(email);

    if (!stored || stored.expiresAt < Date.now()) {
      response.status(400).json({ message: "OTP expired. Request a new code." });
      return;
    }

    if (stored.otp !== otp) {
      response.status(400).json({ message: "Incorrect OTP." });
      return;
    }

    otpStore.delete(email);
    const user = await upsertUser({
      email,
      role: stored.role,
      name: request.body.name,
    });

    response.json({
      ok: true,
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
