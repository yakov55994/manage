import express from "express";
import { protect } from "../middleware/auth.js";
import invoiceController from "../controller/invoiceControllers.js";
import { checkAccess } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, invoiceController.getInvoices);

router.get("/:id",
  protect,
  checkAccess("invoice", "view"),
  invoiceController.getInvoiceById
);

router.get(
  "/check/duplicate",
  protect,
  invoiceController.checkDuplicate
);


router.post("/",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.createInvoice
);

router.put("/:id/edit",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.updateInvoice
);

router.put("/:id/status",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.updatePaymentStatus
);

router.put("/:id/move",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.moveInvoice
);

router.delete("/:id",
  protect,
  checkAccess("invoice", "edit"),
  invoiceController.deleteInvoice
);

export default router;