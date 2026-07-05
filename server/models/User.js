import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["seeker", "owner", "admin"], default: "seeker" },
    name: { type: String, trim: true },
    mobile: { type: String, trim: true },
    googleSub: { type: String, trim: true, index: true },
    avatarUrl: { type: String, trim: true },
    authProvider: { type: String, enum: ["password", "google"], default: "password" },
    passwordHash: { type: String },
    passwordSalt: { type: String },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    lastSeen: { type: Date },
    blockedUsers: [{ type: String, lowercase: true, trim: true }],
    chatQuickReplies: [{ type: String, trim: true }],
    tokenVersion: { type: Number, default: 0 },
    responseTimeAvg: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
    totalResponses: { type: Number, default: 0 },
    totalIncoming: { type: Number, default: 0 },
    awayEnabled: { type: Boolean, default: false },
    awayMessage: {
      type: String,
      trim: true,
      default: "Thank you for your message. I am currently away and will get back to you shortly.",
    },
    awayUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
