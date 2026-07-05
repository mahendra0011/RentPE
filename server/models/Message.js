import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["text", "inquiry"],
      default: "text",
    },
    senderEmail: { type: String, required: true, lowercase: true, trim: true },
    text: { type: String, trim: true, default: "", maxlength: 5000 },
    mediaUrl: { type: String, trim: true, default: "" },
    mediaType: { type: String, enum: ["", "image", "file", "pdf", "doc"], default: "" },
    mediaName: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    read: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reactions: [reactionSchema],
    flagged: { type: Boolean, default: false },
    flagReason: { type: String, trim: true, default: "" },
    flaggedBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
