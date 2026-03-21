import mongoose from "mongoose";

const MasavBroadcastSchema = new mongoose.Schema({
  month: { type: String, required: true }, // פורמט: "YYYY-MM"
  fileName: { type: String, required: true },
  fileBase64: { type: String, required: true },
  fileType: { type: String, default: "application/octet-stream" },
  fileSize: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  uploadedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
  },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

MasavBroadcastSchema.index({ month: -1 });

const MasavBroadcast = mongoose.model("MasavBroadcast", MasavBroadcastSchema);

export default MasavBroadcast;
