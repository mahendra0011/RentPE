import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  roomSlug: { type: String, required: true, index: true },
  roomTitle: { type: String, required: true },
  roomPrice: { type: Number },
  roomImage: { type: String },
  seekerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  visitDate: { type: Date },
  notes: { type: String, trim: true, maxlength: 1000 },
  cancelledAt: { type: Date },
  confirmedAt: { type: Date },
}, { timestamps: true });

bookingSchema.index({ seekerEmail: 1, roomSlug: 1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

export default Booking;
