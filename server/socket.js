import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";

const JWT_SECRET = process.env.JWT_SECRET || "rentpe-dev-secret-change-in-production";
const ALLOWED_SOCKET_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
 .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    "http://localhost:5180",
  ])
  .filter(Boolean);

function isOriginAllowed(origin, callback) {
  if (!origin) {
    if (typeof callback === "function") callback(null, true);
    return true;
  }
  const normalized = origin.replace(/\/$/, "");
  const isAllowed =
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalized) ||
    /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(normalized) ||
    ALLOWED_SOCKET_ORIGINS.some((a) => a.replace(/\/$/, "") === normalized);

  if (typeof callback === "function") {
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
  return isAllowed;
}

function getAuthUser(auth) {
  if (!auth?.token) return null;
  try {
    return jwt.verify(auth.token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function isParticipant(conversationId, email) {
  try {
    const conversation = await Conversation.findById(conversationId).lean();
    return conversation?.participants?.includes(email) === true;
  } catch {
    return false;
  }
}

let globalIo = null;

export function getSocketIo() {
  return globalIo;
}

export function emitToUser(email, event, data) {
  if (!globalIo || !email) return;
  globalIo.to(`user:${String(email).toLowerCase()}`).emit(event, data);
}

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: isOriginAllowed,
      credentials: true,
    },
  });
  globalIo = io;

  const onlineUsers = new Map();

  io.use((socket, next) => {
    const user = getAuthUser(socket.handshake.auth || socket.handshake.query);
    if (!user) {
      return next(new Error("Authentication required"));
    }
    socket.user = user;
    next();
  });

  io.on("connection", (socket) => {
    socket.on("error", (err) => {
      console.warn(`[Socket] Error on socket ${socket.id}:`, err.message);
    });

    const user = socket.user;
    const userEmail = user.email.toLowerCase();

    socket.join(`user:${userEmail}`);
    onlineUsers.set(userEmail, { socketId: socket.id, lastSeen: new Date() });
    socket.emit("online:snapshot", Object.fromEntries(onlineUsers));
    socket.broadcast.emit("user:online", { email: userEmail, online: true });

    socket.on("join:conversation", async (conversationId) => {
      if (!conversationId) return;
      const allowed = await isParticipant(conversationId, userEmail);
      if (!allowed) {
        socket.emit("error", { message: "Access denied to this conversation." });
        return;
      }
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave:conversation", (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        email: userEmail,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        conversationId,
        email: userEmail,
      });
    });

    socket.on("message:read", async ({ conversationId, messageIds }) => {
      try {
        if (messageIds?.length) {
          await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { status: "read", read: true } },
          );
        }
        await Conversation.updateOne(
          { _id: conversationId },
          { $set: { [`unreadCount.${userEmail}`]: 0 } },
        );
        socket.to(`conversation:${conversationId}`).emit("message:read", {
          conversationId,
          readBy: userEmail,
          messageIds,
        });
      } catch {
        // ignore
      }
    });

    socket.on("message:delivered", async ({ conversationId, messageIds }) => {
      try {
        if (messageIds?.length) {
          await Message.updateMany(
            { _id: { $in: messageIds }, status: "sent" },
            { $set: { status: "delivered" } },
          );
        }
        socket.to(`conversation:${conversationId}`).emit("message:delivered", {
          conversationId,
          deliveredTo: userEmail,
          messageIds,
        });
      } catch {
        // ignore
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userEmail);
      io.emit("user:online", { email: userEmail, online: false, lastSeen: new Date() });
    });
  });

  return { io, onlineUsers };
}
