import express from "express";
import { protect } from "../middleware/auth.js";
import invoiceController from "../controller/invoiceControllers.js";
import { checkAccess } from "../middleware/auth.js";

const router = express.Router();


router.get("/search", protect, invoiceController.searchInvoices);

// 🟢 תמיד קודם ROUTES עם שמות!
router.get(
  "/check/duplicate",
  protect,
  invoiceController.checkDuplicate
);

// 🟢 אח"כ ה־root
router.get("/", protect, invoiceController.getInvoices);

// 🟢 ואז כל ה־id
router.get(
  "/:id",
  protect,
  checkAccess("invoice", "view"),
  invoiceController.getInvoiceById
);

router.post(
  "/",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.createInvoice
);

router.put(
  "/:id/edit",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.updateInvoice
);

router.put(
  "/:id/status",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.updatePaymentStatus
);

router.put(
  "/:id/move",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.moveInvoice
);

router.delete(
  "/:id",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.deleteInvoice
);

export default router;
