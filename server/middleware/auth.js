import jwt from "jsonwebtoken";

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

export function requireAdmin(request, response, next) {
  const user = getAuthUser(request);
  if (!user) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }
  if (user.role !== "admin") {
    response.status(403).json({ message: "Admin access required." });
    return;
  }
  request.authUser = user;
  next();
}

