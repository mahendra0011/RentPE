import mongoose from "mongoose";

const roommatePostSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    occupation: {
      type: String,
      enum: ["Student", "Working professional", "Intern", "Other"],
      default: "Student",
    },
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    collegeOrOffice: { type: String, trim: true },
    budget: { type: Number, required: true, min: 0 },
    roomType: {
      type: String,
      enum: ["Any", "PG", "Flat", "Hostel", "Private room"],
      default: "Any",
    },
    genderPreference: {
      type: String,
      enum: ["Any", "Girls", "Boys", "Co-ed"],
      default: "Any",
    },
    moveIn: { type: String, trim: true },
    lifestyle: {
      type: String,
      enum: ["No preference", "Quiet", "Social", "Early riser", "Night owl"],
      default: "No preference",
    },
    phone: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

roommatePostSchema.index({ city: 1, budget: 1, status: 1 });

const RoommatePost =
  mongoose.models.RoommatePost || mongoose.model("RoommatePost", roommatePostSchema);

export default RoommatePost;
