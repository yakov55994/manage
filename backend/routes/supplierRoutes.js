// routes/supplierRoutes.js
import express from "express";
import supplierController from "../controller/supplierController.js";
import { protect } from "../middleware/auth.js";
import { checkProjectPermission } from "../middleware/permissions.js";

const router = express.Router({ mergeParams: true });

router.get(
  "/suppliers",
  protect,
  checkProjectPermission("suppliers", "view"),
  supplierController.getSuppliersByProject
);

router.get(
  "/suppliers/search",
  protect,
  checkProjectPermission("suppliers", "view"),
  supplierController.search
);

router.post(
  "/suppliers",
  protect,
  checkProjectPermission("suppliers", "edit"),
  supplierController.createSupplier
);

router.get(
  "/suppliers/:id",
  protect,
  checkProjectPermission("suppliers", "view"),
  supplierController.getSupplierById
);

router.put(
  "/suppliers/:id",
  protect,
  checkProjectPermission("suppliers", "edit"),
  supplierController.updateSupplier
);

router.delete(
  "/suppliers/:id",
  protect,
  checkProjectPermission("suppliers", "edit"),
  supplierController.deleteSupplier
);

export default router;
