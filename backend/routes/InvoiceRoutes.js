// import express from "express";
// import { protect, checkAccess, requireAdmin } from "../middleware/auth.js";
// import invoiceController from "../controller/invoiceControllers.js";

// const router = express.Router();

// // 🔍 חיפוש — אין checkAccess
// router.get("/search", protect, invoiceController.searchInvoices);

// // 📌 רשימת חשבוניות — אין checkAccess
// router.get("/", protect, invoiceController.getInvoices);

// // 📌 בדיקת כפילות — אין checkAccess
// router.get("/check/duplicate", protect, invoiceController.checkDuplicate);

// // 📌 חשבונית בודדת — כן
// router.get("/:invoiceId", protect, checkAccess("invoices", "view"), invoiceController.getInvoiceById);

// // 📌 יצירה — כן
// router.post("/", protect, checkAccess("invoices", "edit"), invoiceController.createInvoice);

// // 📌 עדכון — כן
// router.put("/:invoiceId", protect, checkAccess("invoices", "edit"), invoiceController.updateInvoice);

// router.put("/:invoiceId/move", protect, checkAccess("invoices", "edit"), invoiceController.moveInvoice);

// // 📌 עדכון סטטוס תשלום — כן
// router.put("/:invoiceId/status", protect, checkAccess("invoices", "edit"), invoiceController.updatePaymentStatus);

// router.delete("/:invoiceId/", protect, requireAdmin, checkAccess("invoices", "edit"), invoiceController.deleteInvoice);

// export default router;



import express from "express";
import { protect, checkAccess, requireAdmin } from "../middleware/auth.js";
import invoiceController from "../controller/invoiceControllers.js";
import analyticsController from "../controller/analyticsControllers.js";

const router = express.Router();

// 🔍 חיפוש — אין checkAccess
router.get("/search", protect, invoiceController.searchInvoices);

// 📊 Analytics - התפלגות סטטוס תשלומים
router.get("/analytics/payment-status", protect, analyticsController.getPaymentStatusDistribution);

// 📌 רשימת חשבוניות — אין checkAccess
router.get("/", protect, invoiceController.getInvoices);

// 📌 בדיקת כפילות — אין checkAccess
router.get("/check/duplicate", protect, invoiceController.checkDuplicate);

// 📌 חשבונית בודדת — משתמש ב־:id (מתוקן!)
router.get("/:id", protect, checkAccess("invoices", "view"), invoiceController.getInvoiceById);

// 📌 יצירת חשבונית
router.post("/", protect, checkAccess("invoices", "edit"), invoiceController.createInvoice);

// 📌 עדכון — משתמש ב־:id (מתוקן!)
router.put("/:id", protect, checkAccess("invoices", "edit"), invoiceController.updateInvoice);

// 📌 העברה בין פרויקטים — משתמש ב־:id (מתוקן!)
router.put("/:id/move", protect, checkAccess("invoices", "edit"), invoiceController.moveInvoice);

// 📌 עדכון סטטוס תשלום — משתמש ב־:id (מתוקן!)
router.put("/:id/status", protect, checkAccess("invoices", "edit"), invoiceController.updatePaymentStatus);

// 📌 עדכון סטטוס מרובה (bulk update)
router.put("/bulk/update-status", protect, checkAccess("invoices", "edit"), invoiceController.bulkUpdatePaymentStatus);

// 📌 מחיקה — משתמש ב־:id (מתוקן!)
router.delete("/:id", protect, requireAdmin, checkAccess("invoices", "edit"), invoiceController.deleteInvoice);

export default router;
