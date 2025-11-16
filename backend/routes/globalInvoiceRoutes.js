import express from "express";
import { protect } from "../middleware/auth.js";
import { checkProjectPermission } from "../middleware/permissions.js";
import invoiceController from "../controller/invoiceControllers.js";

const router = express.Router();

// כל החשבוניות (מנהל בלבד)
router.get(
  "/",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.getAllInvoices
);

export default router;
