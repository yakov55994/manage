import express from "express";
import { protect, checkAccess } from "../middleware/auth.js";
import invoiceController from "../controller/invoiceControllers.js";

const router = express.Router();

// ============ SEARCH ============
router.get("/search", protect, invoiceController.searchInvoices);

// ============ CHECK DUPLICATE ============
router.get(
  "/check/duplicate",
  protect,
  checkAccess("invoices", "view"),
  invoiceController.checkDuplicate
);

// ============ GET ALL ============
router.get(
  "/",
  protect,
  checkAccess("invoices", "view"),
  invoiceController.getInvoices
);

// ============ GET BY ID ============
router.get(
  "/:invoiceId",
  protect,
  checkAccess("invoices", "view"),
  invoiceController.getInvoiceById
);

// ============ CREATE ============
router.post(
  "/",
  protect,
  checkAccess("invoices", "edit"),
  invoiceController.createInvoice
);

// ============ UPDATE ============
router.put(
  "/:invoiceId",
  protect,
  checkAccess("invoices", "edit"),
  invoiceController.updateInvoice
);

// ============ UPDATE STATUS ============
router.put(
  "/:invoiceId/status",
  protect,
  checkAccess("invoices", "edit"),
  invoiceController.updatePaymentStatus
);

// ============ MOVE ============
router.put(
  "/:invoiceId/move",
  protect,
  checkAccess("invoices", "edit"),
  invoiceController.moveInvoice
);

// ============ DELETE ============
router.delete(
  "/:invoiceId",
  protect,
  checkAccess("invoices", "edit"),
  invoiceController.deleteInvoice
);

export default router;
