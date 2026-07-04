import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";

const JWT_SECRET = process.env.JWT_SECRET || "rentpe-dev-secret-change-in-production";

function getAuthUser(auth) {
  if (!auth?.token) return null;
  try {
    return jwt.verify(auth.token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        callback(null, true);
      },
      credentials: true,
    },
  });

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
    const user = socket.user;
    const userEmail = user.email;

    onlineUsers.set(userEmail, { socketId: socket.id, lastSeen: new Date() });
    io.emit("user:online", { email: userEmail, online: true });

    socket.on("join:conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave:conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        email: userEmail,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
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
