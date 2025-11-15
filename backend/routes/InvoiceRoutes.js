import express from "express";
import invoiceController from "../controller/invoiceControllers.js";
import { protect } from "../middleware/auth.js";
import { checkProjectPermission } from "../middleware/permissions.js";

const router = express.Router();

// כל החשבוניות בפרויקט
router.get(
  "/project/:projectId",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.getInvoicesByProject
);

// יצירה
router.post(
  "/:projectId",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.createInvoice
);

// חשבונית בודדת
router.get(
  "/:projectId/:id",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.getInvoiceById
);

// עדכון
router.put(
  "/:projectId/:id",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.updateInvoice
);

// מחיקה
router.delete(
  "/:projectId/:id",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.deleteInvoice
);

// חיפוש
router.get(
  "/project/:projectId/search",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.search
);

// עדכון סטטוס תשלום
router.put(
  "/:projectId/:id/payment",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.updatePaymentStatus
);

// עדכון תאריך תשלום בלבד
router.put(
  "/:projectId/:id/payment/date",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.updatePaymentDate
);

// העברה בין פרויקטים
router.put(
  "/:projectId/:id/move",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.moveInvoice
);

// בדיקת כפילות
router.get(
  "/:projectId/check-duplicate",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.checkDuplicate
);

// חשבוניות של ספק
router.get(
  "/supplier/:id",
  protect,
  invoiceController.getSupplierInvoices
);

export default router;
