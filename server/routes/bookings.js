import { Router } from "express";
import rateLimit from "express-rate-limit";

import { isMongoConnected } from "../config/db.js";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { requireAuth } from "../middleware/auth.js";

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many booking requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

const memoryBookings = [];

router.get("/", requireAuth, async (request, response, next) => {
  try {
    const userEmail = request.authUser.email || "";
    if (!isMongoConnected()) {
      const bookings = memoryBookings
        .filter((b) => b.seekerEmail === userEmail || b.ownerEmail === userEmail)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      response.json(bookings);
      return;
    }
    const bookings = await Booking.find({
      $or: [{ seekerEmail: userEmail }, { ownerEmail: userEmail }],
    })
      .sort({ createdAt: -1 })
      .lean();
    response.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.post("/", bookingLimiter, requireAuth, async (request, response, next) => {
  try {
    const { roomSlug, visitDate, notes } = request.body;
    const seekerEmail = request.authUser.email || "";

    if (!roomSlug) {
      response.status(400).json({ message: "Room slug is required." });
      return;
    }

    if (isMongoConnected()) {
      const room = await Room.findOne({ slug: roomSlug }).lean();
      if (!room) {
        response.status(404).json({ message: "Room not found." });
        return;
      }
      if (room.ownerEmail === seekerEmail) {
        response.status(403).json({ message: "You cannot book your own room." });
        return;
      }

      const existing = await Booking.findOne({ seekerEmail, roomSlug, status: { $in: ["pending", "confirmed"] } }).lean();
      if (existing) {
        response.status(409).json({ message: "You already have a pending or confirmed booking for this room." });
        return;
      }

      const booking = await Booking.create({
        roomSlug,
        roomTitle: room.title,
        roomPrice: room.price,
        roomImage: room.images?.[0] || "",
        seekerEmail,
        ownerEmail: room.ownerEmail,
        visitDate: visitDate ? new Date(visitDate) : undefined,
        notes: notes || "",
      });
      response.status(201).json(booking);
      return;
    }

    const booking = {
      _id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomSlug,
      seekerEmail,
      ownerEmail: "owner@example.com",
      status: "pending",
      visitDate: visitDate ? new Date(visitDate).toISOString() : undefined,
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryBookings.unshift(booking);
    response.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireAuth, async (request, response, next) => {
  try {
    const { id } = request.params;
    const { status } = request.body;
    const userEmail = request.authUser.email || "";

    if (!["confirmed", "cancelled", "completed"].includes(status)) {
      response.status(400).json({ message: "Invalid status." });
      return;
    }

    if (!isMongoConnected()) {
      const idx = memoryBookings.findIndex((b) => b._id === id && b.ownerEmail === userEmail);
      if (idx === -1) {
        response.status(404).json({ message: "Booking not found." });
        return;
      }
      memoryBookings[idx].status = status;
      if (status === "cancelled") memoryBookings[idx].cancelledAt = new Date().toISOString();
      if (status === "confirmed") memoryBookings[idx].confirmedAt = new Date().toISOString();
      response.json(memoryBookings[idx]);
      return;
    }

    const booking = await Booking.findOne({ _id: id, ownerEmail: userEmail });
    if (!booking) {
      response.status(404).json({ message: "Booking not found." });
      return;
    }
    booking.status = status;
    if (status === "cancelled") booking.cancelledAt = new Date();
    if (status === "confirmed") booking.confirmedAt = new Date();
    await booking.save();
    response.json(booking);
  } catch (error) {
    next(error);
  }
});

export default router;
