import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

import { isMongoConnected } from "../config/db.js";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendOtpEmail } from "../services/brevo.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "rentpe-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Rate limiters
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many reset requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const memoryOtpStore = new Map();
const resetTokenStore = new Map();
const memoryUsers = new Map();
let googleCertCache = { expiresAt: 0, keys: [] };

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function createOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function otpKey(email, purpose = "login") {
  return `${purpose}:${email}`;
}

async function storeOtp({ email, role, purpose = "login" }) {
  const otp = createOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  if (isMongoConnected()) {
    await Otp.deleteMany({ email, purpose });
    await Otp.create({ email, otp, role, purpose, expiresAt });
  } else {
    memoryOtpStore.set(otpKey(email, purpose), { otp, role, purpose, expiresAt });
  }
  return otp;
}

async function consumeOtp({ email, otp, purpose = "login" }) {
  if (isMongoConnected()) {
    const doc = await Otp.findOne({ email, purpose });
    if (!doc || doc.expiresAt < new Date()) {
      if (doc) await Otp.deleteOne({ _id: doc._id });
      return { ok: false, message: "OTP expired. Request a new code." };
    }
    if (doc.otp !== otp) {
      doc.attempts += 1;
      if (doc.attempts >= 5) {
        await Otp.deleteOne({ _id: doc._id });
        return { ok: false, message: "Too many incorrect attempts. Request a new OTP." };
      }
      await doc.save();
      return { ok: false, message: "Incorrect OTP." };
    }
    await Otp.deleteOne({ _id: doc._id });
    return { ok: true, role: doc.role };
  }

  const key = otpKey(email, purpose);
  const stored = memoryOtpStore.get(key);
  if (!stored || stored.expiresAt < new Date()) {
    memoryOtpStore.delete(key);
    return { ok: false, message: "OTP expired. Request a new code." };
  }
  if (stored.otp !== otp) {
    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts >= 5) {
      memoryOtpStore.delete(key);
      return { ok: false, message: "Too many incorrect attempts. Request a new OTP." };
    }
    return { ok: false, message: "Incorrect OTP." };
  }
  memoryOtpStore.delete(key);
  return { ok: true, role: stored.role };
}

function createResetToken(email) {
  const token = crypto.randomBytes(32).toString("hex");
  resetTokenStore.set(token, { email, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

function consumeResetToken(token, email) {
  const stored = resetTokenStore.get(token);
  if (!stored || stored.expiresAt < Date.now() || stored.email !== email) {
    resetTokenStore.delete(token);
    return false;
  }
  resetTokenStore.delete(token);
  return true;
}

function createToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      name: user.name || "",
      mobile: user.mobile || "",
      avatarUrl: user.avatarUrl || "",
      emailVerified: Boolean(user.emailVerifiedAt),
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function safeUser(user) {
  return {
    email: user.email,
    role: user.role,
    name: user.name || "",
    mobile: user.mobile || "",
    avatarUrl: user.avatarUrl || "",
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function getGoogleClientId() {
  return process.env.VITE_GOOGLE_CLIENT_ID || "";
}

function decodeJwtPart(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

async function getGooglePublicKeys() {
  if (googleCertCache.expiresAt > Date.now() && googleCertCache.keys.length) {
    return googleCertCache.keys;
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) {
    const error = new Error("Unable to verify Google login right now.");
    error.status = 503;
    throw error;
  }

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  const payload = await response.json();

  googleCertCache = {
    expiresAt: Date.now() + maxAge * 1000,
    keys: payload.keys || [],
  };

  return googleCertCache.keys;
}

async function verifyGoogleCredential(credential) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    const error = new Error("Google login is not configured.");
    error.status = 500;
    throw error;
  }

  const tokenParts = String(credential || "").split(".");
  if (tokenParts.length !== 3) {
    const error = new Error("Invalid Google credential.");
    error.status = 400;
    throw error;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = tokenParts;
  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);

  if (header.alg !== "RS256") {
    const error = new Error("Unsupported Google credential signature.");
    error.status = 400;
    throw error;
  }

  const keys = await getGooglePublicKeys();
  const jwk = keys.find((key) => key.kid === header.kid);

  if (!jwk) {
    googleCertCache = { expiresAt: 0, keys: [] };
    const error = new Error("Google credential key was not found.");
    error.status = 400;
    throw error;
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, "base64url"),
  );

  if (!verified) {
    const error = new Error("Invalid Google credential signature.");
    error.status = 401;
    throw error;
  }

  const validIssuer = ["accounts.google.com", "https://accounts.google.com"].includes(payload.iss);
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (!validIssuer || payload.aud !== clientId || Number(payload.exp || 0) < nowInSeconds) {
    const error = new Error("Google credential expired or does not match this app.");
    error.status = 401;
    throw error;
  }

  if (!payload.email || payload.email_verified !== true) {
    const error = new Error("Google account email must be verified.");
    error.status = 401;
    throw error;
  }

  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email),
    name: payload.name || payload.email.split("@")[0],
    avatarUrl: payload.picture || "",
  };
}

async function upsertGoogleUser({ profile, role }) {
  const updates = {
    email: profile.email,
    role,
    name: profile.name,
    googleSub: profile.sub,
    avatarUrl: profile.avatarUrl,
    authProvider: "google",
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
  };

  if (isMongoConnected()) {
    const user = await User.findOneAndUpdate(
      { email: profile.email },
      { $set: updates },
      {
        new: true,
        upsert: true,
      },
    ).lean();

    return user;
  }

  const existing = memoryUsers.get(profile.email) || {};
  const user = {
    ...existing,
    ...updates,
    passwordHash: existing.passwordHash,
    passwordSalt: existing.passwordSalt,
    mobile: existing.mobile || "",
  };
  memoryUsers.set(profile.email, user);
  return user;
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
          emailVerifiedAt: new Date(),
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
    emailVerifiedAt: existing.emailVerifiedAt || new Date(),
    lastLoginAt: new Date(),
  };
  memoryUsers.set(email, user);
  return user;
}

router.post("/signup", authLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const name = String(request.body.name || "").trim();
    const mobile = normalizeMobile(request.body.mobile);
    const password = String(request.body.password || "");
    const otp = String(request.body.otp || "").trim();

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

    if (!otp) {
      response.status(400).json({ message: "Email OTP is required." });
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

      const verifiedOtp = await consumeOtp({ email, otp, purpose: "signup" });
      if (!verifiedOtp.ok) {
        response.status(400).json({ message: verifiedOtp.message });
        return;
      }

      user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            name,
            email,
            mobile,
            role: verifiedOtp.role,
            passwordHash: hash,
            passwordSalt: salt,
            emailVerifiedAt: new Date(),
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

      const verifiedOtp = await consumeOtp({ email, otp, purpose: "signup" });
      if (!verifiedOtp.ok) {
        response.status(400).json({ message: verifiedOtp.message });
        return;
      }

      user = {
        email,
        name,
        mobile,
        role: verifiedOtp.role,
        passwordHash: hash,
        passwordSalt: salt,
        emailVerifiedAt: new Date(),
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

router.post("/login", authLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
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

    if (requestedRole === "owner" && user.role !== "owner" && user.role !== "admin") {
      response.status(403).json({ message: "Owner access not available for this account." });
      return;
    }
    const updates = {
      mobile: user.mobile || "",
      name: user.name || email.split("@")[0],
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

router.post("/google", authLimiter, async (request, response, next) => {
  try {
    const credential = String(request.body.credential || "");
    const role = request.body.isOwner ? "owner" : "seeker";

    if (!credential) {
      response.status(400).json({ message: "Google credential is required." });
      return;
    }

    const profile = await verifyGoogleCredential(credential);
    const user = await upsertGoogleUser({ profile, role });

    response.json({
      ok: true,
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/request-otp", otpLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const role = request.body.isOwner ? "owner" : "seeker";
    const purpose = ["signup", "reset"].includes(request.body.purpose)
      ? request.body.purpose
      : "login";

    if (!email || !email.includes("@")) {
      response.status(400).json({ message: "Valid email is required." });
      return;
    }

    if (purpose === "signup") {
      const existing = isMongoConnected()
        ? await User.findOne({ email }).lean()
        : memoryUsers.get(email) || null;

      if (existing?.passwordHash) {
        response.status(409).json({ message: "Account already exists. Please login." });
        return;
      }
    }

    if (purpose === "reset") {
      const existing = isMongoConnected()
        ? await User.findOne({ email }).lean()
        : memoryUsers.get(email) || null;

      if (!existing?.passwordHash) {
        response.status(404).json({ message: "No account found with this email." });
        return;
      }
    }

    const otp = await storeOtp({ email, role, purpose });

    const delivery = await sendOtpEmail({ email, otp, purpose });
    response.json({
      ok: true,
      delivered: delivery.delivered,
      devOtp: delivery.devOtp,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", resetLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp || "").trim();
    const resetToken = String(request.body.resetToken || "").trim();
    const password = String(request.body.password || "");

    if (!email || !email.includes("@")) {
      response.status(400).json({ message: "Valid email is required." });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    if (!otp && !resetToken) {
      response.status(400).json({ message: "Reset verification is required." });
      return;
    }

    const existing = isMongoConnected()
      ? await User.findOne({ email }).lean()
      : memoryUsers.get(email) || null;

    if (!existing?.passwordHash) {
      response.status(404).json({ message: "No account found with this email." });
      return;
    }

    if (resetToken) {
      if (!consumeResetToken(resetToken, email)) {
        response.status(400).json({ message: "Reset session expired. Request a new OTP." });
        return;
      }
    } else {
      const verifiedOtp = await consumeOtp({ email, otp, purpose: "reset" });
      if (!verifiedOtp.ok) {
        response.status(400).json({ message: verifiedOtp.message });
        return;
      }
    }

    const { hash, salt } = hashPassword(password);
    const updates = {
      passwordHash: hash,
      passwordSalt: salt,
      emailVerifiedAt: existing.emailVerifiedAt || new Date(),
      tokenVersion: (existing.tokenVersion || 0) + 1,
    };

    if (isMongoConnected()) {
      await User.findOneAndUpdate({ email }, { $set: updates });
    } else {
      memoryUsers.set(email, { ...existing, ...updates });
    }

    response.json({ ok: true, message: "Password reset successfully. Please login." });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-reset-otp", resetLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp || "").trim();

    if (!email || !email.includes("@")) {
      response.status(400).json({ message: "Valid email is required." });
      return;
    }

    if (!otp) {
      response.status(400).json({ message: "Email OTP is required." });
      return;
    }

    const existing = isMongoConnected()
      ? await User.findOne({ email }).lean()
      : memoryUsers.get(email) || null;

    if (!existing?.passwordHash) {
      response.status(404).json({ message: "No account found with this email." });
      return;
    }

    const verifiedOtp = await consumeOtp({ email, otp, purpose: "reset" });
    if (!verifiedOtp.ok) {
      response.status(400).json({ message: verifiedOtp.message });
      return;
    }

    response.json({
      ok: true,
      email,
      resetToken: createResetToken(email),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", authLimiter, async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp || "").trim();
    const verifiedOtp = await consumeOtp({ email, otp, purpose: "login" });

    if (!verifiedOtp.ok) {
      response.status(400).json({ message: verifiedOtp.message });
      return;
    }

    const user = await upsertUser({
      email,
      role: verifiedOtp.role,
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
