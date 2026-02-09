import express from "express";
import { protect, requireAdmin } from "../middleware/auth.js";
import { createBackup, getBackupStatus, downloadLatestBackup } from "../controller/backupController.js";

const router = express.Router();

router.get("/download", protect, requireAdmin, createBackup);
router.get("/status", protect, requireAdmin, getBackupStatus);
router.get("/download-latest", protect, requireAdmin, downloadLatestBackup);

export default router;
