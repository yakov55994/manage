import express from "express";
import { protect } from "../middleware/auth.js";
import supplierController from "../controller/SupplierController.js";
import { checkAccess } from "../middleware/auth.js";

const router = express.Router();

router.get("/search", protect, supplierController.searchSuppliers);

router.get(
  "/",
  protect,
  supplierController.getSuppliers
);

router.get("/:id",
  protect,
  checkAccess("supplier", "view"),
  supplierController.getSupplierById
);

router.post("/",
  protect,
  checkAccess("supplier", "edit"),
  supplierController.createSupplier
);

router.put("/:id",
  protect,
  checkAccess("supplier", "edit"),
  supplierController.updateSupplier
);

router.delete("/:id",
  protect,
  checkAccess("supplier", "edit"),
  supplierController.deleteSupplier
);


export default router;