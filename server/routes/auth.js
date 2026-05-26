import { Router } from "express";
import crypto from "node:crypto";

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
      mobile: user.mobile || "",
      issuedAt: Date.now(),
    }),
  ).toString("base64url");
}

function safeUser(user) {
  return {
    email: user.email,
    role: user.role,
    name: user.name || "",
    mobile: user.mobile || "",
  };
}

function normalizeMobile(mobile) {
  return String(mobile || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

async function upsertUser({ email, role, name, mobile }) {
  if (isMongoConnected()) {
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          role,
          name: name || email.split("@")[0],
          mobile,
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
    mobile: mobile || existing.mobile || "",
    passwordHash: existing.passwordHash,
    passwordSalt: existing.passwordSalt,
    lastLoginAt: new Date(),
  };
  memoryUsers.set(email, user);
  return user;
}

router.post("/signup", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const name = String(request.body.name || "").trim();
    const mobile = normalizeMobile(request.body.mobile);
    const password = String(request.body.password || "");
    const role = request.body.isOwner ? "owner" : "seeker";

    if (!name || name.length < 2) {
      response.status(400).json({ message: "Name is required." });
      return;
    }

    if (!email || !email.includes("@")) {
      response.status(400).json({ message: "Valid email is required." });
      return;
    }

    if (mobile.length !== 10) {
      response.status(400).json({ message: "Valid 10 digit mobile number is required." });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    const { hash, salt } = hashPassword(password);

    let user;
    if (isMongoConnected()) {
      const existing = await User.findOne({ email }).lean();
      if (existing?.passwordHash) {
        response.status(409).json({ message: "Account already exists. Please login." });
        return;
      }

      user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            name,
            email,
            mobile,
            role,
            passwordHash: hash,
            passwordSalt: salt,
            lastLoginAt: new Date(),
          },
        },
        { new: true, upsert: true },
      ).lean();
    } else {
      const existing = memoryUsers.get(email);
      if (existing?.passwordHash) {
        response.status(409).json({ message: "Account already exists. Please login." });
        return;
      }

      user = {
        email,
        name,
        mobile,
        role,
        passwordHash: hash,
        passwordSalt: salt,
        lastLoginAt: new Date(),
      };
      memoryUsers.set(email, user);
    }

    response.status(201).json({
      ok: true,
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const mobile = normalizeMobile(request.body.mobile);
    const password = String(request.body.password || "");
    const requestedRole = request.body.isOwner ? "owner" : "seeker";

    if (!email || !email.includes("@") || !password) {
      response.status(400).json({ message: "Email and password are required." });
      return;
    }

    let user = isMongoConnected()
      ? await User.findOne({ email }).lean()
      : memoryUsers.get(email) || null;

    if (!user || !verifyPassword(password, user)) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const nextRole = requestedRole === "owner" ? "owner" : user.role || "seeker";
    const updates = {
      role: nextRole,
      mobile: mobile || user.mobile || "",
      name: request.body.name || user.name || email.split("@")[0],
      lastLoginAt: new Date(),
    };

    if (isMongoConnected()) {
      user = await User.findOneAndUpdate({ email }, { $set: updates }, { new: true }).lean();
    } else {
      user = { ...user, ...updates };
      memoryUsers.set(email, user);
    }

    response.json({
      ok: true,
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

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
      mobile: normalizeMobile(request.body.mobile),
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
