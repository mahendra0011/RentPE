import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { isMongoConnected } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "rentpe-dev-secret-change-in-production";

export function getAuthUser(request) {
  const header = request.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(request, response, next) {
  const user = getAuthUser(request);
  if (!user) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }
  request.authUser = user;
  next();
}

export async function requireAdmin(request, response, next) {
  const decoded = getAuthUser(request);
  if (!decoded) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }
  if (isMongoConnected()) {
    const dbUser = await User.findOne({ email: decoded.email }).select("role tokenVersion").lean();
    if (!dbUser || dbUser.role !== "admin") {
      response.status(403).json({ message: "Admin access required." });
      return;
    }
    if ((dbUser.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      response.status(401).json({ message: "Session expired. Please login again." });
      return;
    }
    request.authUser = { ...decoded, role: dbUser.role, tokenVersion: dbUser.tokenVersion };
  } else {
    if (decoded.role !== "admin") {
      response.status(403).json({ message: "Admin access required." });
      return;
    }
    request.authUser = decoded;
  }
  next();
}

