import { Router } from "express";
import crypto from "node:crypto";

import { isMongoConnected } from "../config/db.js";
import User from "../models/User.js";
import { sendOtpEmail } from "../services/brevo.js";

const router = Router();
const otpStore = new Map();
const resetTokenStore = new Map();
const memoryUsers = new Map();
let googleCertCache = { expiresAt: 0, keys: [] };

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createResetToken(email) {
  const token = crypto.randomBytes(32).toString("hex");
  resetTokenStore.set(token, {
    email,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
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
  return Buffer.from(
    JSON.stringify({
      email: user.email,
      role: user.role,
      name: user.name || "",
      mobile: user.mobile || "",
      avatarUrl: user.avatarUrl || "",
      emailVerified: Boolean(user.emailVerifiedAt),
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

function otpKey(email, purpose = "login") {
  return `${purpose}:${email}`;
}

function storeOtp({ email, role, purpose = "login" }) {
  const otp = createOtp();
  otpStore.set(otpKey(email, purpose), {
    otp,
    role,
    purpose,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return otp;
}

function consumeOtp({ email, otp, purpose = "login" }) {
  const key = otpKey(email, purpose);
  const stored = otpStore.get(key);

  if (!stored || stored.expiresAt < Date.now()) {
    otpStore.delete(key);
    return { ok: false, message: "OTP expired. Request a new code." };
  }

  if (stored.otp !== otp) {
    return { ok: false, message: "Incorrect OTP." };
  }

  otpStore.delete(key);
  return { ok: true, role: stored.role };
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

router.post("/signup", async (request, response, next) => {
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

      const verifiedOtp = consumeOtp({ email, otp, purpose: "signup" });
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

      const verifiedOtp = consumeOtp({ email, otp, purpose: "signup" });
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

router.post("/login", async (request, response, next) => {
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

    const nextRole = requestedRole === "owner" ? "owner" : user.role || "seeker";
    const updates = {
      role: nextRole,
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

router.post("/google", async (request, response, next) => {
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

router.post("/request-otp", async (request, response, next) => {
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

    const otp = storeOtp({ email, role, purpose });

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

router.post("/reset-password", async (request, response, next) => {
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
      const verifiedOtp = consumeOtp({ email, otp, purpose: "reset" });
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

router.post("/verify-reset-otp", async (request, response, next) => {
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

    const verifiedOtp = consumeOtp({ email, otp, purpose: "reset" });
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

router.post("/verify-otp", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp || "").trim();
    const verifiedOtp = consumeOtp({ email, otp, purpose: "login" });

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
