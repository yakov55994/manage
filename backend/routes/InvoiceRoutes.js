import express from "express";
import { protect, checkAccess } from "../middleware/auth.js";
import invoiceController from "../controller/invoiceControllers.js";

const router = express.Router();

// חיפוש חשבוניות
router.get("/search", protect, invoiceController.searchInvoices);

// בדיקת כפילות – לא לפי invoiceId ולכן לא צריך checkAccess
router.get(
  "/check/duplicate",
  protect,
  invoiceController.checkDuplicate
);

// כל החשבוניות לפי הרשאות
router.get(
  "/",
  protect,
  checkAccess("invoice", "view"),
  invoiceController.getInvoices
);

// חשבונית לפי ID
router.get(
  "/:invoiceId",
  protect,
  checkAccess("invoice", "view"),
  invoiceController.getInvoiceById
);

// יצירה
router.post(
  "/",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.createInvoice
);

// עדכון
router.put(
  "/:invoiceId",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.updateInvoice
);

// עדכון סטטוס תשלום
router.put(
  "/:invoiceId/status",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.updatePaymentStatus
);

// העברה בין פרויקטים
router.put(
  "/:invoiceId/move",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.moveInvoice
);

// מחיקה
router.delete(
  "/:invoiceId",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.deleteInvoice
);

export default router;
