import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["seeker", "owner"], default: "seeker" },
    name: { type: String, trim: true },
    mobile: { type: String, trim: true },
    passwordHash: { type: String },
    passwordSalt: { type: String },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
