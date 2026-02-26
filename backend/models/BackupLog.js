import mongoose from "mongoose";

const backupLogSchema = new mongoose.Schema({
  backupDate: { type: Date, default: Date.now, required: true },
  type: { type: String, enum: ["manual", "scheduled"], required: true },
  recordCounts: { type: mongoose.Schema.Types.Mixed },
  filesCount: { type: Number, default: 0 },
  status: { type: String, enum: ["success", "failed"], required: true },
  error: { type: String, default: null },
  filePath: { type: String, default: null },
}, { timestamps: true });

const BackupLog = mongoose.model("BackupLog", backupLogSchema);
export default BackupLog;
