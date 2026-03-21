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

// 🔢 מספר סידורי הבא לחשבוניות "אין צורך"
router.get("/next-no-doc-serial", protect, invoiceController.getNextNoDocSerial);

// 🔢 מספר סידורי הבא למסמכים (קבצים) – אטומי (שורף מספר)
router.get("/next-doc-serial", protect, invoiceController.getNextDocSerial);

// 🔢 תצוגה מקדימה של מספר סידורי הבא (לא שורף!)
router.get("/next-doc-serial/preview", protect, invoiceController.previewNextDocSerial);

// 🔢 מילוי מספרים סידוריים לכל הקבצים שאין להם מספר מסמך
router.post("/backfill-doc-serials", protect, requireAdmin, invoiceController.backfillDocSerials);

// 🔢 מילוי מספרים סידוריים לחשבוניות "אין צורך" קיימות
router.post("/backfill-no-doc-serials", protect, requireAdmin, invoiceController.backfillNoDocSerials);

// 📄 ייצוא סיכום חשבוניות ל-PDF
router.get("/export", protect, invoiceController.exportInvoices);
router.post("/export", protect, invoiceController.exportInvoices);

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

// 📎 הוספת קבצים לחשבונית
router.put("/:id/files", protect, checkAccess("invoices", "edit"), invoiceController.addFilesToInvoice);

// 📌 עדכון סטטוס מרובה (bulk update)
router.put("/bulk/update-status", protect, checkAccess("invoices", "edit"), invoiceController.bulkUpdatePaymentStatus);

// 📌 עדכון סטטוס הגשה מרובה (bulk update submission)
router.put("/bulk/update-submission-status", protect, checkAccess("invoices", "edit"), invoiceController.bulkUpdateSubmissionStatus);

// 📌 מחיקה — משתמש ב־:id (מתוקן!)
router.delete("/:id", protect, requireAdmin, checkAccess("invoices", "edit"), invoiceController.deleteInvoice);

export default router;
