import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    state: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

citySchema.index({ name: 1 });

const City = mongoose.models.City || mongoose.model("City", citySchema);

export default City;