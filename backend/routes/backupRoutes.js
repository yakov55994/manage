import express from "express";
import multer from "multer";
import { protect, requireAdmin } from "../middleware/auth.js";
import { createBackup, getBackupStatus, downloadLatestBackup, restoreFromBackup } from "../controller/backupController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post("/create", protect, requireAdmin, createBackup);
router.get("/status", protect, requireAdmin, getBackupStatus);
router.get("/download-latest", protect, requireAdmin, downloadLatestBackup);
router.post("/restore", protect, requireAdmin, upload.single("backup"), restoreFromBackup);

export default router;
