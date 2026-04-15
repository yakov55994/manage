import express from "express";
import multer from "multer";
import { protect, requireAdmin } from "../middleware/auth.js";
import { createBackup, getBackupStatus, downloadLatestBackup, restoreFromBackup, createAndDownloadBackup, getBackupScheduleSettings, updateBackupScheduleSettings } from "../controller/backupController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post("/create", protect, requireAdmin, createBackup);
router.get("/status", protect, requireAdmin, getBackupStatus);
router.get("/download-latest", protect, requireAdmin, downloadLatestBackup);
router.get("/create-and-download", protect, requireAdmin, createAndDownloadBackup);
router.post("/restore", protect, requireAdmin, upload.single("backup"), restoreFromBackup);
router.get("/schedule-settings", protect, requireAdmin, getBackupScheduleSettings);
router.put("/schedule-settings", protect, requireAdmin, updateBackupScheduleSettings);

export default router;
