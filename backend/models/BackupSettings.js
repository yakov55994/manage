import mongoose from "mongoose";

const backupSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    hour: { type: Number, default: 23, min: 0, max: 23 },
    minute: { type: Number, default: 0, min: 0, max: 59 },
    email: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("BackupSettings", backupSettingsSchema);
