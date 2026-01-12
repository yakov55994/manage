// ===============================================
// SUBMISSION ROUTES - ניהול הגשת חשבוניות
// ===============================================

import express from "express";
import submissionControllers from "../controller/submissionControllers.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// קבלת כל החשבוניות שהוגשו מכל הפרויקטים
router.get("/all/invoices", protect, submissionControllers.getAllSubmissionInvoices);

// הורדת Excel של כל החשבוניות
router.get("/all/excel", protect, submissionControllers.downloadAllExcel);

// הורדת PDF של כל החשבוניות
router.get("/all/pdf", protect, submissionControllers.downloadAllPDF);

// קבלת חשבוניות להגשה לפרויקט
router.get("/:projectId/invoices", protect, submissionControllers.getSubmissionInvoices);

// הורדת Excel
router.get("/:projectId/excel", protect, submissionControllers.downloadExcel);

// הורדת PDF
router.get("/:projectId/pdf", protect, submissionControllers.downloadPDF);

export default router;
