import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { getAuthUser } from "../middleware/auth.js";
import { uploadBuffer } from "../config/cloudinary.js";
import { processEmailDigest } from "../services/emailDigest.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const DAILY_INQUIRY_LIMIT = parseInt(process.env.DAILY_INQUIRY_LIMIT || "5", 10);

const SUSPICIOUS_KEYWORDS = [
  "advance",
  "payment",
  "deposit",
  "booking amount",
  "security deposit",
  "pay first",
  "send money",
  "transfer",
  "upi",
  "bank account",
  "pay before visit",
  "refundable deposit",
  "registration fee",
  "processing fee",
  "hold amount",
  "token amount",
  "paytm",
  "google pay",
  "phone pe",
  "net banking",
];

function isSuspicious(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SUSPICIOUS_KEYWORDS.some((kw) => lower.includes(kw));
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many messages. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

let io;
export function setSocketIO(socketIO) {
  io = socketIO;
}

async function isBlocked(email, targetEmail) {
  const user = await User.findOne({ email }).select("blockedUsers").lean();
  return user?.blockedUsers?.includes(targetEmail) || false;
}

function buildBlockError(action = "message") {
  return {
    status: 403,
    message: `You cannot ${action} this user as they have blocked you or you have blocked them.`,
  };
}

router.use((request, response, next) => {
  const user = getAuthUser(request);
  if (!user) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }
  request.authUser = user;
  next();
});

router.get("/conversations", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const showArchived = request.query.showArchived === "true";

    let conversations = await Conversation.find({
      participants: email,
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!showArchived) {
      conversations = conversations.filter((c) => !(c.archivedBy || []).includes(email));
    }

    const otherEmails = conversations.map((c) => c.participants.find((p) => p !== email));
    const otherUsers = await User.find({ email: { $in: otherEmails } })
      .select("email name avatarUrl lastSeen awayEnabled awayUntil")
      .lean();
    const userMap = {};
    for (const u of otherUsers) {
      const awayUntil = u.awayUntil || null;
      const awayExpired = awayUntil && new Date(awayUntil) <= new Date();
      userMap[u.email] = {
        name: u.name,
        avatarUrl: u.avatarUrl,
        lastSeen: u.lastSeen,
        awayEnabled: awayExpired ? false : (u.awayEnabled || false),
      };
    }

    const roomSlugs = [...new Set(conversations.map((c) => c.roomSlug))];
    const rooms = await Room.find({ slug: { $in: roomSlugs } })
      .select("slug availability")
      .lean();
    const roomAvailabilityMap = {};
    for (const r of rooms) {
      roomAvailabilityMap[r.slug] = r.availability;
    }

    const enriched = conversations.map((c) => {
      const otherEmail = c.participants.find((p) => p !== email);
      return {
        ...c,
        otherUser: userMap[otherEmail] || null,
        muted: (c.mutedBy || []).includes(email),
        archived: (c.archivedBy || []).includes(email),
        roomAvailable: roomAvailabilityMap[c.roomSlug] === "available",
      };
    });

    response.json({ conversations: enriched });
  } catch (error) {
    next(error);
  }
});

router.get("/inquiry-daily-limit", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const { start, end } = getTodayRange();

    const count = await Conversation.countDocuments({
      seekerEmail: email,
      inquiryStatus: "pending",
      createdAt: { $gte: start, $lte: end },
    });

    response.json({
      remaining: Math.max(0, DAILY_INQUIRY_LIMIT - count),
      limit: DAILY_INQUIRY_LIMIT,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/inquiry", async (request, response, next) => {
  try {
    const { roomSlug, message: inquiryText } = request.body;
    const seekerEmail = request.authUser.email;

    if (!roomSlug || !inquiryText?.trim()) {
      response.status(400).json({ message: "Room slug and message are required." });
      return;
    }

    const room = await Room.findOne({ slug: roomSlug }).lean();
    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    if (room.ownerEmail === seekerEmail) {
      response.status(400).json({ message: "Cannot inquire about your own listing." });
      return;
    }

    if (await isBlocked(seekerEmail, room.ownerEmail)) {
      response.status(403).json({ message: "Cannot send inquiry — the owner has blocked you." });
      return;
    }
    if (await isBlocked(room.ownerEmail, seekerEmail)) {
      response.status(403).json({ message: "Cannot send inquiry — you have blocked this owner." });
      return;
    }

    const { start, end } = getTodayRange();
    const todayCount = await Conversation.countDocuments({
      seekerEmail,
      inquiryStatus: "pending",
      createdAt: { $gte: start, $lte: end },
    });

    if (todayCount >= DAILY_INQUIRY_LIMIT) {
      response.status(429).json({
        message: `Daily inquiry limit (${DAILY_INQUIRY_LIMIT}) reached. Try again tomorrow.`,
        limit: DAILY_INQUIRY_LIMIT,
      });
      return;
    }

    const participants = [room.ownerEmail, seekerEmail].sort();

    let conversation = await Conversation.findOne({
      roomSlug,
      participants: { $all: participants, $size: 2 },
    });

    if (conversation) {
      response.status(409).json({ message: "You already have a conversation about this room." });
      return;
    }

    conversation = await Conversation.create({
      participants,
      roomSlug,
      roomTitle: room.title,
      roomImage: room.images?.[0] || "",
      roomPrice: room.price,
      ownerEmail: room.ownerEmail,
      seekerEmail,
      inquiryStatus: "pending",
      lastMessage: {
        text: inquiryText.trim(),
        senderEmail: seekerEmail,
        timestamp: new Date(),
      },
      unreadCount: { [room.ownerEmail]: 1 },
    });

    const message = await Message.create({
      conversationId: conversation._id,
      type: "inquiry",
      senderEmail: seekerEmail,
      text: inquiryText.trim(),
      status: "sent",
    });

    if (io) {
      io.to(`conversation:${conversation._id}`).emit("message:new", {
        conversationId: conversation._id,
        message,
      });
      io.to(`user:${room.ownerEmail}`).emit("conversation:new", {
        conversationId: conversation._id,
      });
    }

    const updated = await Conversation.findById(conversation._id).lean();
    response.status(201).json({ conversation: updated });
  } catch (error) {
    next(error);
  }
});

router.post("/inquiry/:id/respond", async (request, response, next) => {
  try {
    const conversationId = request.params.id;
    const ownerEmail = request.authUser.email;
    const { action } = request.body;

    if (!action || !["accept", "reject"].includes(action)) {
      response.status(400).json({ message: "Action must be 'accept' or 'reject'." });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    if (conversation.ownerEmail !== ownerEmail) {
      response.status(403).json({ message: "Only the owner can respond to an inquiry." });
      return;
    }

    if (conversation.inquiryStatus !== "pending") {
      response.status(400).json({ message: "Inquiry already responded to." });
      return;
    }

    conversation.inquiryStatus = action === "accept" ? "accepted" : "rejected";
    conversation.lastMessage = {
      text: action === "accept" ? "Inquiry accepted — chat is now open." : "Inquiry declined.",
      senderEmail: ownerEmail,
      timestamp: new Date(),
    };
    await conversation.save();

    if (io) {
      io.to(`conversation:${conversationId}`).emit("inquiry:responded", {
        conversationId,
        inquiryStatus: conversation.inquiryStatus,
      });
      io.to(`user:${conversation.seekerEmail}`).emit("conversation:new", {
        conversationId,
      });
    }

    response.json({ inquiryStatus: conversation.inquiryStatus });
  } catch (error) {
    next(error);
  }
});

router.post("/conversations", async (request, response, next) => {
  try {
    const { roomSlug, message: firstMessage } = request.body;
    const seekerEmail = request.authUser.email;

    if (!roomSlug || !firstMessage?.trim()) {
      response.status(400).json({ message: "Room slug and message are required." });
      return;
    }

    const room = await Room.findOne({ slug: roomSlug }).lean();
    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    if (room.chatEnabled === false) {
      response.status(400).json({ message: "Chat is disabled for this room." });
      return;
    }

    if (room.ownerEmail === seekerEmail) {
      response.status(400).json({ message: "Cannot chat with yourself." });
      return;
    }

    if (await isBlocked(seekerEmail, room.ownerEmail)) {
      response.status(403).json({ message: "Cannot start conversation — the owner has blocked you." });
      return;
    }
    if (await isBlocked(room.ownerEmail, seekerEmail)) {
      response.status(403).json({ message: "Cannot start conversation — you have blocked this owner." });
      return;
    }

    const participants = [room.ownerEmail, seekerEmail].sort();

    let conversation = await Conversation.findOne({
      roomSlug,
      participants: { $all: participants, $size: 2 },
    });

    if (!conversation) {
      if (seekerEmail !== room.ownerEmail) {
        const { start, end } = getTodayRange();
        const todayCount = await Conversation.countDocuments({
          seekerEmail,
          inquiryStatus: "pending",
          createdAt: { $gte: start, $lte: end },
        });
        if (todayCount >= DAILY_INQUIRY_LIMIT) {
          response.status(429).json({
            message: `Daily inquiry limit (${DAILY_INQUIRY_LIMIT}) reached. Try again tomorrow.`,
            limit: DAILY_INQUIRY_LIMIT,
          });
          return;
        }
      }

      const inquiryStatus = seekerEmail === room.ownerEmail ? "accepted" : "pending";

      conversation = await Conversation.create({
        participants,
        roomSlug,
        roomTitle: room.title,
        roomImage: room.images?.[0] || "",
        roomPrice: room.price,
        ownerEmail: room.ownerEmail,
        seekerEmail,
        inquiryStatus,
        lastMessage: {
          text: firstMessage.trim(),
          senderEmail: seekerEmail,
          timestamp: new Date(),
        },
        unreadCount: { [room.ownerEmail]: 1 },
      });

      const message = await Message.create({
        conversationId: conversation._id,
        type: inquiryStatus === "pending" ? "inquiry" : "text",
        senderEmail: seekerEmail,
        text: firstMessage.trim(),
        status: "sent",
      });

      if (io) {
        io.to(`conversation:${conversation._id}`).emit("message:new", {
          conversationId: conversation._id,
          message,
        });
        io.to(`user:${room.ownerEmail}`).emit("conversation:new", {
          conversationId: conversation._id,
        });
      }
    } else {
      const message = await Message.create({
        conversationId: conversation._id,
        senderEmail: seekerEmail,
        text: firstMessage.trim(),
        status: "sent",
      });

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessage: {
              text: firstMessage.trim(),
              senderEmail: seekerEmail,
              timestamp: message.createdAt,
            },
          },
          $inc: { [`unreadCount.${room.ownerEmail}`]: 1 },
        },
      );

      if (io) {
        io.to(`conversation:${conversation._id}`).emit("message:new", {
          conversationId: conversation._id,
          message,
        });
      }
    }

    const updated = await Conversation.findById(conversation._id).lean();

    response.status(201).json({ conversation: updated });
  } catch (error) {
    next(error);
  }
});

router.get("/conversations/:id/messages", async (request, response, next) => {
  try {
    const conversationId = request.params.id;
    const email = request.authUser.email;

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    if (!conversation.participants.includes(email)) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments({ conversationId }),
    ]);

    response.json({
      messages: messages.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/conversations/:id/messages", messageLimiter, async (request, response, next) => {
  try {
    const conversationId = request.params.id;
    const senderEmail = request.authUser.email;
    const { text, mediaUrl, mediaType, mediaName } = request.body;

    if (!text?.trim() && !mediaUrl) {
      response.status(400).json({ message: "Message text or media is required." });
      return;
    }

    if (text && text.length > 5000) {
      response.status(400).json({ message: "Text must be 5000 characters or less." });
      return;
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    if (!conversation.participants.includes(senderEmail)) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    if (conversation.inquiryStatus === "pending") {
      response.status(400).json({ message: "Inquiry pending. Wait for owner to accept." });
      return;
    }

    const receiverEmail = conversation.participants.find((p) => p !== senderEmail);

    if (await isBlocked(senderEmail, receiverEmail)) {
      response.status(403).json({ message: "Cannot send message — you have blocked this user." });
      return;
    }
    if (await isBlocked(receiverEmail, senderEmail)) {
      response.status(403).json({ message: "Cannot send message — this user has blocked you." });
      return;
    }

    const message = await Message.create({
      conversationId,
      senderEmail,
      text: text?.trim() || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
      mediaName: mediaName || "",
      status: "sent",
      flagged: senderEmail === conversation.ownerEmail && isSuspicious(text),
      flagReason:
        senderEmail === conversation.ownerEmail && isSuspicious(text)
          ? "Suspicious payment request"
          : "",
      flaggedBy: senderEmail === conversation.ownerEmail && isSuspicious(text) ? "system" : "",
    });

    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessage: {
            text:
              text?.trim() || (mediaUrl ? (mediaType === "image" ? "📷 Photo" : "📎 File") : ""),
            senderEmail,
            timestamp: message.createdAt,
          },
        },
        $inc: { [`unreadCount.${receiverEmail}`]: 1 },
      },
    );

    if (senderEmail === conversation.ownerEmail) {
      const earlierSeekerMsg = await Message.findOne({
        conversationId,
        senderEmail: conversation.seekerEmail,
      })
        .sort({ createdAt: 1 })
        .lean();

      if (earlierSeekerMsg) {
        const responseTime = message.createdAt - earlierSeekerMsg.createdAt;
        const owner = await User.findOne({ email: senderEmail });

        if (owner) {
          const newTotalIncoming = (owner.totalIncoming || 0) + 1;
          const newTotalResponses = (owner.totalResponses || 0) + 1;
          const oldAvg = owner.responseTimeAvg || 0;
          const oldCount = owner.totalResponses || 0;
          const newAvg =
            oldCount > 0 ? (oldAvg * oldCount + responseTime) / newTotalResponses : responseTime;
          const computedRate = newTotalIncoming > 0 ? Math.round((newTotalResponses / newTotalIncoming) * 100) : 0;

          await User.updateOne(
            { email: senderEmail },
            {
              $set: {
                responseTimeAvg: Math.round(newAvg),
                totalResponses: newTotalResponses,
                totalIncoming: newTotalIncoming,
                responseRate: computedRate,
              },
            },
          );
        }
      }
    }

    if (io) {
      io.to(`conversation:${conversationId}`).emit("message:new", {
        conversationId,
        message,
      });
    }

    if (senderEmail !== conversation.ownerEmail) {
      const owner = await User.findOne({ email: conversation.ownerEmail }).lean();
      if (owner?.awayEnabled && owner.awayMessage?.trim()) {
        const isStillAway = !owner.awayUntil || new Date(owner.awayUntil) > new Date();
        if (isStillAway) {
          const autoReply = await Message.create({
            conversationId,
            senderEmail: "auto-reply@rentpe",
            text: owner.awayMessage.trim(),
          });
          await Conversation.updateOne(
            { _id: conversationId },
            {
              $set: {
                lastMessage: {
                  text: owner.awayMessage.trim(),
                  senderEmail: "auto-reply@rentpe",
                  timestamp: autoReply.createdAt,
                },
              },
              $inc: { [`unreadCount.${senderEmail}`]: 1 },
            },
          );
          io.to(`conversation:${conversationId}`).emit("message:new", {
            conversationId,
            message: autoReply,
          });
        }
      }
    }

    response.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

router.patch("/conversations/:id/read", async (request, response, next) => {
  try {
    const conversationId = request.params.id;
    const email = request.authUser.email;

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    if (!conversation.participants.includes(email)) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const result = await Message.updateMany(
      { conversationId, senderEmail: { $ne: email }, read: false },
      { $set: { status: "read", read: true } },
    );

    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { [`unreadCount.${email}`]: 0 } },
    );

    if (io && result.modifiedCount > 0) {
      io.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId,
        readBy: email,
      });
    }

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/unread-count", async (request, response, next) => {
  try {
    const email = request.authUser.email;

    const conversations = await Conversation.find({
      participants: email,
    })
      .select("unreadCount")
      .lean();

    const totalUnread = conversations.reduce((sum, conv) => {
      const count = conv.unreadCount?.[email] || 0;
      return sum + count;
    }, 0);

    response.json({ totalUnread });
  } catch (error) {
    next(error);
  }
});

router.get("/users/:email", async (request, response, next) => {
  try {
    const otherEmail = request.params.email.toLowerCase();
    const user = await User.findOne({ email: otherEmail })
      .select(
        "email name avatarUrl lastSeen role responseTimeAvg responseRate awayEnabled awayMessage",
      )
      .lean();
    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }
    const room = await Room.findOne({ ownerEmail: otherEmail }).select("owner.verified").lean();
    const responseTimeMin = user.responseTimeAvg ? Math.round(user.responseTimeAvg / 60000) : 0;
    response.json({
      ...user,
      verified: room?.owner?.verified || false,
      responseTimeMin,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/quick-replies", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const user = await User.findOne({ email }).select("chatQuickReplies role").lean();

    if (user?.chatQuickReplies?.length) {
      response.json({ quickReplies: user.chatQuickReplies });
      return;
    }

    const defaults = ["Available hai", "Visit kal 4pm", "Rent ₹X/month"];

    response.json({ quickReplies: defaults });
  } catch (error) {
    next(error);
  }
});

router.put("/quick-replies", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const { quickReplies } = request.body;
    if (!Array.isArray(quickReplies)) {
      response.status(400).json({ message: "quickReplies must be an array." });
      return;
    }
    await User.updateOne({ email }, { $set: { chatQuickReplies: quickReplies.slice(0, 10) } });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/away-mode", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const user = await User.findOne({ email }).select("awayEnabled awayMessage awayUntil").lean();
    const awayUntil = user?.awayUntil || null;
    const expired = awayUntil && new Date(awayUntil) <= new Date();
    if (expired) {
      await User.updateOne({ email }, { $set: { awayEnabled: false, awayUntil: null } });
    }
    response.json({
      awayEnabled: expired ? false : (user?.awayEnabled || false),
      awayMessage: user?.awayMessage || "",
      awayUntil: expired ? null : awayUntil,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/away-mode", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const { awayEnabled, awayMessage, awayUntil } = request.body;
    const update = {};
    if (typeof awayEnabled === "boolean") update.awayEnabled = awayEnabled;
    if (awayMessage?.trim()) update.awayMessage = awayMessage.trim();
    if (awayUntil) update.awayUntil = new Date(awayUntil);
    else update.awayUntil = null;
    await User.updateOne({ email }, { $set: update });
    response.json({ ok: true, ...update });
  } catch (error) {
    next(error);
  }
});

router.post("/report", async (request, response, next) => {
  try {
    const reporterEmail = request.authUser.email;
    const { conversationId, reason } = request.body;

    if (!conversationId || !reason?.trim()) {
      response.status(400).json({ message: "Conversation ID and reason are required." });
      return;
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    const reportedEmail = conversation.participants.find((p) => p !== reporterEmail);
    if (!reportedEmail) {
      response.status(400).json({ message: "Cannot report yourself." });
      return;
    }

    await Message.updateMany(
      { conversationId, senderEmail: reportedEmail },
      { $set: { flagged: true, flagReason: reason.trim(), flaggedBy: reporterEmail } },
    );

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/block/:email", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const blockEmail = request.params.email.toLowerCase();

    if (email === blockEmail) {
      response.status(400).json({ message: "Cannot block yourself." });
      return;
    }

    await User.updateOne({ email }, { $addToSet: { blockedUsers: blockEmail } });

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/unblock/:email", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const blockEmail = request.params.email.toLowerCase();
    await User.updateOne({ email }, { $pull: { blockedUsers: blockEmail } });
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/blocked", async (request, response, next) => {
  try {
    const email = request.authUser.email;
    const user = await User.findOne({ email }).select("blockedUsers").lean();
    response.json({ blockedUsers: user?.blockedUsers || [] });
  } catch (error) {
    next(error);
  }
});

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function getMediaType(mime, filename = "") {
  const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const pdfTypes = ["application/pdf"];
  const docTypes = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  if (imageTypes.includes(mime)) return "image";
  if (pdfTypes.includes(mime)) return "pdf";
  if (docTypes.includes(mime)) return "doc";
  // Check by file extension for text files and others
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "doc";
  return "file";
}

router.post("/upload", upload.single("file"), async (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({ message: "File is required." });
      return;
    }
    const mime = request.file.mimetype || "";
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      response.status(415).json({
        message: `File type '${mime}' is not allowed. Allowed: images, PDF, DOC, TXT.`,
      });
      return;
    }
    const mediaType = getMediaType(mime, request.file.originalname);
    const url = await uploadBuffer(request.file);
    response.json({
      url,
      mediaType,
      mediaName: request.file.originalname || "",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/messages/:id/react", async (request, response, next) => {
  try {
    const messageId = request.params.id;
    const email = request.authUser.email;
    const { emoji } = request.body;

    if (!emoji || typeof emoji !== "string") {
      response.status(400).json({ message: "Emoji is required." });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      response.status(404).json({ message: "Message not found." });
      return;
    }

    const conversation = await Conversation.findById(message.conversationId).lean();
    if (!conversation || !conversation.participants.includes(email)) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.userEmail === email,
    );
    if (existingIndex >= 0) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ emoji, userEmail: email });
    }

    await message.save();

    if (io) {
      io.to(`conversation:${message.conversationId}`).emit("message:reacted", {
        conversationId: message.conversationId,
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    response.json({ reactions: message.reactions });
  } catch (error) {
    next(error);
  }
});

router.patch("/messages/:id", async (request, response, next) => {
  try {
    const messageId = request.params.id;
    const email = request.authUser.email;
    const { text } = request.body;

    if (!text?.trim()) {
      response.status(400).json({ message: "Text is required." });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      response.status(404).json({ message: "Message not found." });
      return;
    }

    if (message.senderEmail !== email) {
      response.status(403).json({ message: "Can only edit your own messages." });
      return;
    }

    const now = Date.now();
    const msgTime = new Date(message.createdAt).getTime();
    if (now - msgTime > 15 * 60 * 1000) {
      response.status(400).json({ message: "Can only edit messages within 15 minutes." });
      return;
    }

    message.text = text.trim();
    message.edited = true;
    await message.save();

    if (io) {
      io.to(`conversation:${message.conversationId}`).emit("message:edited", {
        conversationId: message.conversationId,
        messageId: message._id,
        text: message.text,
        edited: true,
      });
    }

    response.json({ message });
  } catch (error) {
    next(error);
  }
});

router.delete("/messages/:id", async (request, response, next) => {
  try {
    const messageId = request.params.id;
    const email = request.authUser.email;

    const message = await Message.findById(messageId);
    if (!message) {
      response.status(404).json({ message: "Message not found." });
      return;
    }

    if (message.senderEmail !== email) {
      response.status(403).json({ message: "Can only delete your own messages." });
      return;
    }

    const now = Date.now();
    const msgTime = new Date(message.createdAt).getTime();
    if (now - msgTime > 15 * 60 * 1000) {
      response.status(400).json({ message: "Can only delete messages within 15 minutes." });
      return;
    }

    message.deleted = true;
    message.text = "";
    message.mediaUrl = "";
    await message.save();

    if (io) {
      io.to(`conversation:${message.conversationId}`).emit("message:deleted", {
        conversationId: message.conversationId,
        messageId: message._id,
      });
    }

    response.json({ message });
  } catch (error) {
    next(error);
  }
});

router.patch("/conversations/:id/mute", async (request, response, next) => {
  try {
    const conversationId = request.params.id;
    const email = request.authUser.email;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    if (!conversation.participants.includes(email)) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const mutedIndex = conversation.mutedBy.indexOf(email);
    if (mutedIndex >= 0) {
      conversation.mutedBy.splice(mutedIndex, 1);
    } else {
      conversation.mutedBy.push(email);
    }

    await conversation.save();
    response.json({ muted: conversation.mutedBy.includes(email) });
  } catch (error) {
    next(error);
  }
});

router.patch("/conversations/:id/archive", async (request, response, next) => {
  try {
    const conversationId = request.params.id;
    const email = request.authUser.email;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      response.status(404).json({ message: "Conversation not found." });
      return;
    }

    if (!conversation.participants.includes(email)) {
      response.status(403).json({ message: "Access denied." });
      return;
    }

    const archivedIndex = conversation.archivedBy.indexOf(email);
    if (archivedIndex >= 0) {
      conversation.archivedBy.splice(archivedIndex, 1);
    } else {
      conversation.archivedBy.push(email);
    }

    await conversation.save();
    response.json({ archived: conversation.archivedBy.includes(email) });
  } catch (error) {
    next(error);
  }
});

router.post("/send-unread-digest", async (request, response, next) => {
  try {
    if (request.authUser.role !== "admin") {
      response.status(403).json({ message: "Admin access required." });
      return;
    }
    const result = await processEmailDigest();
    response.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/conversations/with/:email", async (request, response, next) => {
  try {
    const userEmail = request.authUser.email;
    const otherEmail = request.params.email.toLowerCase();

    if (userEmail === otherEmail) {
      response.status(400).json({ message: "Cannot delete chats with yourself." });
      return;
    }

    const conversations = await Conversation.find({
      participants: { $all: [userEmail, otherEmail], $size: 2 },
    }).lean();

    const conversationIds = conversations.map((c) => c._id);

    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });

    if (io) {
      for (const id of conversationIds) {
        io.to(`conversation:${id}`).emit("conversation:deleted", { conversationId: id });
      }
    }

    response.json({ deleted: conversationIds.length });
  } catch (error) {
    next(error);
  }
});

router.post("/notify-room-inquiries/:slug", async (request, response, next) => {
  try {
    const { slug } = request.params;
    const email = request.authUser.email;

    const room = await Room.findOne({ slug }).lean();
    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    if (room.ownerEmail !== email) {
      response.status(403).json({ message: "Only the owner can notify inquiries." });
      return;
    }

    const conversations = await Conversation.find({
      roomSlug: slug,
      inquiryStatus: "pending",
    }).lean();

    let notified = 0;
    for (const conv of conversations) {
      const msg = await Message.create({
        conversationId: conv._id,
        type: "text",
        senderEmail: "system@rentpe",
        text: `📢 The listing "${room.title}" has been updated by the owner. Check the latest details.`,
        status: "sent",
      });

      await Conversation.updateOne(
        { _id: conv._id },
        {
          $set: {
            lastMessage: {
              text: msg.text,
              senderEmail: "system@rentpe",
              timestamp: msg.createdAt,
            },
          },
          $inc: { [`unreadCount.${conv.seekerEmail}`]: 1 },
        },
      );

      if (io) {
        io.to(`conversation:${conv._id}`).emit("message:new", {
          conversationId: conv._id,
          message: msg,
        });
        io.to(`user:${conv.seekerEmail}`).emit("conversation:new", {
          conversationId: conv._id,
        });
      }
      notified++;
    }

    response.json({ notified });
  } catch (error) {
    next(error);
  }
});

export default router;
