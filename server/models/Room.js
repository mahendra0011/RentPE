import mongoose from "mongoose";

const ownerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    since: { type: String, default: () => String(new Date().getFullYear()) },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return value.length === 2 && value.every(Number.isFinite);
        },
        message: "Coordinates must be [longitude, latitude].",
      },
    },
  },
  { _id: false },
);

const roomSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    tag: { type: String, trim: true },
    type: { type: String, enum: ["PG", "Hostel", "Flat"], required: true },
    gender: { type: String, enum: ["Girls", "Boys", "Co-ed"], required: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    amenities: [{ type: String, trim: true }],
    images: [{ type: String }],
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    locationLabel: { type: String, trim: true },
    location: { type: locationSchema, default: undefined },
    localEssentials: [
      {
        name: { type: String, trim: true },
        type: { type: String, trim: true },
        distance: { type: String, trim: true },
      },
    ],
    ownerEmail: { type: String, lowercase: true, trim: true, index: true },
    furnished: { type: Boolean, default: true },
    availability: { type: String, enum: ["available", "occupied"], default: "available" },
    reports: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "live", "reported"], default: "live" },
    owner: ownerSchema,
  },
  { timestamps: true },
);

roomSchema.index({ title: "text", address: "text", city: "text", landmark: "text" });

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;
