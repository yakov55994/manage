import express from "express";
import { protect, checkAccess, requireAdmin } from "../middleware/auth.js";
import invoiceController from "../controller/invoiceControllers.js";

const router = express.Router();

// 🔍 חיפוש — אין checkAccess
router.get("/search", protect, invoiceController.searchInvoices);

// 📌 רשימת חשבוניות — אין checkAccess
router.get("/", protect, invoiceController.getInvoices);

// 📌 בדיקת כפילות — אין checkAccess
router.get("/check/duplicate", protect, invoiceController.checkDuplicate);

// 📌 חשבונית בודדת — כן
router.get("/:invoiceId", protect, checkAccess("invoices", "view"), invoiceController.getInvoiceById);

// 📌 יצירה — כן
router.post("/", protect, checkAccess("invoices", "edit"), invoiceController.createInvoice);

router.post(
  "/split/:id",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.splitInvoice
);

// 📌 עדכון — כן
router.put("/:invoiceId", protect, checkAccess("invoices", "edit"), invoiceController.updateInvoice);

router.put("/:invoiceId/move", protect, checkAccess("invoices", "edit"), invoiceController.moveInvoice);

// 📌 עדכון סטטוס תשלום — כן
router.put("/:invoiceId/status", protect, checkAccess("invoices", "edit"), invoiceController.updatePaymentStatus);

router.delete("/:invoiceId/", protect, requireAdmin, checkAccess("invoices", "edit"), invoiceController.deleteInvoice);

export default router;
