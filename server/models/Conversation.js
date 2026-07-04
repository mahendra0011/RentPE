import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [String],
      required: true,
      validate: [(value) => value.length === 2, "Must have exactly 2 participants."],
    },
    roomSlug: { type: String, required: true, trim: true },
    roomTitle: { type: String, trim: true },
    roomImage: { type: String, trim: true },
    roomPrice: { type: Number },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    seekerEmail: { type: String, required: true, lowercase: true, trim: true },
    lastMessage: {
      text: { type: String, trim: true },
      senderEmail: { type: String, trim: true },
      timestamp: { type: Date },
    },
    unreadCount: {
      type: Object,
      default: {},
    },
    inquiryStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "accepted",
    },
    mutedBy: [{ type: String, lowercase: true, trim: true }],
    archivedBy: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ ownerEmail: 1, updatedAt: -1 });
conversationSchema.index({ seekerEmail: 1, updatedAt: -1 });
conversationSchema.index({ roomSlug: 1 });

const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

export default Conversation;
