import express from "express";
import { checkAccess, protect } from "../middleware/auth.js";
import supplierController from "../controller/SupplierController.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkAccess("supplier", "view"),
  supplierController.getAllSuppliers
);

router.get(
  "/:supplierId",
  protect,
  checkAccess("supplier", "view"),
  supplierController.getSupplierById
);

router.post(
  "/",
  protect,
  checkAccess("supplier", "edit"),
  supplierController.createSupplier
);

router.put(
  "/:supplierId",
  protect,
  checkAccess("supplier", "edit"),
  supplierController.updateSupplier
);

router.delete(
  "/:supplierId",
  protect,
  checkAccess("supplier", "edit"),
  supplierController.deleteSupplier
);

export default router;
