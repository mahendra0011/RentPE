import "dotenv/config";
import crypto from "node:crypto";

import { connectDB } from "../config/db.js";
import User from "../models/User.js";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { hash, salt };
}

async function upsertUser({ email, name, role, password }) {
  const { hash, salt } = hashPassword(password);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        name,
        role,
        passwordHash: hash,
        passwordSalt: salt,
        authProvider: "password",
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean();

  return user;
}

const demoUsers = [
  { email: "admin@rentpe.demo", name: "Demo Admin", role: "admin", password: "admin123" },
  { email: "owner@rentpe.demo", name: "Demo Owner", role: "owner", password: "owner123" },
  { email: "user@rentpe.demo", name: "Demo User", role: "seeker", password: "user123" },
];

async function seed() {
  try {
    await connectDB();

    const envAdminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || "";
    const envAdminName = (process.env.ADMIN_NAME || "Admin").trim();

    if (envAdminEmail && envAdminPassword) {
      const admin = await upsertUser({
        email: envAdminEmail,
        name: envAdminName,
        role: "admin",
        password: envAdminPassword,
      });
      console.log(`Admin user seeded: ${admin.email} (${admin.name})`);
    } else {
      console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set in .env — skipping env admin.");
    }

    for (const demo of demoUsers) {
      const user = await upsertUser(demo);
      console.log(`Demo ${demo.role} seeded: ${user.email} (${user.name})`);
    }

    console.log("\nSeed complete.");
    console.log("--- Demo accounts ---");
    console.log("Admin: admin@rentpe.demo / admin123");
    console.log("Owner: owner@rentpe.demo / owner123");
    console.log("User:  user@rentpe.demo / user123");

    if (envAdminEmail) {
      console.log(`Env Admin: ${envAdminEmail} / password from .env`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
