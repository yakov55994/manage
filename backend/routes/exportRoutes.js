import express from "express";
import { protect, requireAdmin } from "../middleware/auth.js";
import { exportToExcel, exportToPDF } from "../controller/exportController.js";

const router = express.Router();

// ייצוא לאקסל - למנהלים בלבד
router.get("/excel", protect, requireAdmin, exportToExcel);

// ייצוא ל-PDF - למנהלים בלבד
router.get("/pdf", protect, requireAdmin, exportToPDF);

export default router;
