import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { protect, requireAdmin } from "../middleware/auth.js";
import pendingInvoiceController from "../controller/pendingInvoiceController.js";

const router = express.Router();

const uploadsDir = path.resolve("uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pending_invoice_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ציבורי — ללא אימות
router.get("/projects", pendingInvoiceController.getPublicProjects);
router.post("/submit", upload.array("files", 10), pendingInvoiceController.submitPublicInvoice);

// Admin בלבד
router.get("/", protect, requireAdmin, pendingInvoiceController.getPendingInvoices);
router.put("/:id", protect, requireAdmin, pendingInvoiceController.updateInvoice);
router.post("/:id/approve", protect, requireAdmin, pendingInvoiceController.approveInvoice);
router.post("/:id/reject", protect, requireAdmin, pendingInvoiceController.rejectInvoice);
router.post("/:id/set-pending", protect, requireAdmin, pendingInvoiceController.setPendingStatus);

export default router;
