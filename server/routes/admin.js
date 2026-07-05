import { Router } from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import Room from "../models/Room.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Review from "../models/Review.js";
import { requireAdmin } from "../middleware/auth.js";
import { isMongoConnected } from "../config/db.js";

const router = Router();

const auditLog = [];

router.use((request, response, next) => {
  requireAdmin(request, response, next).catch(next);
});

router.get("/stats", async (_request, response, next) => {
  try {
    const [totalUsers, totalRooms, stats] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Promise.all([
        Room.countDocuments({ status: "live" }),
        Room.countDocuments({ status: "reported" }),
        Room.countDocuments({ availability: "available" }),
        Room.countDocuments({ availability: "occupied" }),
        User.countDocuments({ role: "owner" }),
        User.countDocuments({ role: "seeker" }),
        Room.distinct("city"),
      ]),
    ]);

    response.json({
      totalUsers,
      totalRooms,
      liveRooms: stats[0],
      reportedRooms: stats[1],
      availableRooms: stats[2],
      occupiedRooms: stats[3],
      totalOwners: stats[4],
      totalSeekers: stats[5],
      totalCities: stats[6].length,
      cities: stats[6],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (request, response, next) => {
  try {
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(request.query.search || "")
      .trim()
      .toLowerCase();

    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { mobile: { $regex: search, $options: "i" } },
        ],
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash -passwordSalt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    response.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:email/role", async (request, response, next) => {
  try {
    const { role } = request.body;
    const email = String(request.params.email || "")
      .toLowerCase()
      .trim();

    if (!email) {
      response.status(400).json({ message: "User email is required." });
      return;
    }

    if (email === request.authUser.email) {
      response.status(400).json({ message: "Cannot change your own role." });
      return;
    }

    if (!["seeker", "owner", "admin"].includes(role)) {
      response.status(400).json({ message: "Invalid role. Must be seeker, owner, or admin." });
      return;
    }

    const user = await User.findOneAndUpdate({ email }, { role }, { new: true }).select(
      "-passwordHash -passwordSalt",
    );

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    auditLog.push({ action: "role-change", target: email, value: role, by: request.authUser.email, at: new Date() });

    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:email", async (request, response, next) => {
  try {
    const email = String(request.params.email || "")
      .toLowerCase()
      .trim();

    if (!email) {
      response.status(400).json({ message: "User email is required." });
      return;
    }

    if (email === request.authUser.email) {
      response.status(400).json({ message: "Cannot delete your own account." });
      return;
    }

    const user = await User.findOneAndDelete({ email });

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    await Room.deleteMany({ ownerEmail: email });
    if (isMongoConnected()) {
      await Review.deleteMany({ userEmail: email });
      const convs = await Conversation.find({ participants: email }).lean();
      const convIds = convs.map((c) => c._id);
      await Message.deleteMany({ conversationId: { $in: convIds } });
      await Conversation.deleteMany({ _id: { $in: convIds } });
    }

    auditLog.push({ action: "delete-user", target: email, by: request.authUser.email, at: new Date() });

    response.json({ message: "User, rooms, reviews, and conversations deleted." });
  } catch (error) {
    next(error);
  }
});

router.get("/rooms", async (request, response, next) => {
  try {
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = request.query.status;
    const city = request.query.city;
    const search = String(request.query.search || "").trim();

    let query = {};
    if (status && ["live", "reported"].includes(status)) {
      query.status = status;
    }
    if (city) {
      query.city = city;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { ownerEmail: { $regex: search, $options: "i" } },
      ];
    }

    const [rooms, total] = await Promise.all([
      Room.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Room.countDocuments(query),
    ]);

    response.json({
      rooms,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/rooms/:slug/status", async (request, response, next) => {
  try {
    const { status } = request.body;
    const slug = String(request.params.slug || "").trim();

    if (!slug) {
      response.status(400).json({ message: "Room slug is required." });
      return;
    }

    if (!["live", "reported"].includes(status)) {
      response.status(400).json({ message: "Invalid status. Must be live or reported." });
      return;
    }

    const room = await Room.findOneAndUpdate({ slug }, { status }, { new: true }).lean();

    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    response.json({ room });
  } catch (error) {
    next(error);
  }
});

router.delete("/rooms/:slug", async (request, response, next) => {
  try {
    const slug = String(request.params.slug || "").trim();

    if (!slug) {
      response.status(400).json({ message: "Room slug is required." });
      return;
    }

    const room = await Room.findOneAndDelete({ slug });

    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    if (isMongoConnected()) {
      await Review.deleteMany({ roomSlug: slug });
      const convs = await Conversation.find({ roomSlug: slug }).lean();
      const convIds = convs.map((c) => c._id);
      await Message.deleteMany({ conversationId: { $in: convIds } });
      await Conversation.deleteMany({ _id: { $in: convIds } });
    }

    auditLog.push({ action: "delete-room", target: slug, by: request.authUser.email, at: new Date() });

    response.json({ message: "Room, reviews, and conversations deleted." });
  } catch (error) {
    next(error);
  }
});

router.get("/reports", async (_request, response, next) => {
  try {
    const rooms = await Room.find({ reports: { $gt: 0 } })
      .sort({ reports: -1, updatedAt: -1 })
      .lean();

    response.json({ rooms });
  } catch (error) {
    next(error);
  }
});

router.get("/flagged-messages", async (_request, response, next) => {
  try {
    const messages = await Message.find({ flagged: true }).sort({ createdAt: -1 }).lean();
    response.json({ messages });
  } catch (error) {
    next(error);
  }
});

router.patch("/flagged-messages/:id/dismiss", async (request, response, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
      response.status(400).json({ message: "Invalid message ID." });
      return;
    }
    await Message.updateOne(
      { _id: request.params.id },
      { $set: { flagged: false, flagReason: "", flaggedBy: "" } },
    );
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/rooms/:slug/verify", async (request, response, next) => {
  try {
    const slug = String(request.params.slug || "").trim();
    if (!slug) {
      response.status(400).json({ message: "Room slug is required." });
      return;
    }
    const room = await Room.findOneAndUpdate(
      { slug },
      { $set: { "owner.verified": true } },
      { new: true },
    ).lean();
    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }
    response.json({ room });
  } catch (error) {
    next(error);
  }
});

router.patch("/owners/:email/verify", async (request, response, next) => {
  try {
    const email = String(request.params.email || "").toLowerCase().trim();
    if (!email) {
      response.status(400).json({ message: "Owner email is required." });
      return;
    }
    if (isMongoConnected()) {
      const user = await User.findOne({ email }).lean();
      if (!user) {
        response.status(404).json({ message: "User not found." });
        return;
      }
    }
    const result = await Room.updateMany(
      { ownerEmail: email },
      { $set: { "owner.verified": true } },
    );
    auditLog.push({ action: "verify-owner", target: email, by: request.authUser.email, at: new Date() });
    response.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-log", async (_request, response) => {
  response.json({ entries: auditLog.slice(-100) });
});

export default router;
