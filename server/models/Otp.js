import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  role: { type: String, enum: ["seeker", "owner", "admin"], default: "seeker" },
  purpose: { type: String, enum: ["login", "signup", "reset"], required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

const Otp = mongoose.models.Otp || mongoose.model("Otp", otpSchema);

export default Otp;
