import express from 'express'
import { protect } from '../middleware/auth.js';
import { checkProjectPermission } from '../middleware/permissions.js';
import invoiceController from '../controller/invoiceControllers.js'

const router = express.Router({ mergeParams: true });

router.get(
  "/",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.getInvoicesByProject
);

router.post(
  "/",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.createInvoice
);

router.get(
  "/:id",
  protect,
  checkProjectPermission("invoices", "view"),
  invoiceController.getInvoiceById
);

router.put(
  "/:id",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.updateInvoice
);

router.delete(
  "/:id",
  protect,
  checkProjectPermission("invoices", "edit"),
  invoiceController.deleteInvoice
);

export default router