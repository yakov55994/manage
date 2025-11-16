import express from "express";
import { protect } from "../middleware/auth.js";
import supplierController from "../controller/SupplierController.js";
import { checkAccess } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/",
  protect,
  supplierController.getSuppliers
);

router.get("/:id",
  protect,
  checkAccess("suppliers", "view"),
  supplierController.getSupplierById
);

router.post("/",
  protect,
  checkAccess("suppliers", "edit"),
  supplierController.createSupplier
);

router.put("/:id",
  protect,
  checkAccess("suppliers", "edit"),
  supplierController.updateSupplier
);

router.delete("/:id",
  protect,
  checkAccess("suppliers", "edit"),
  supplierController.deleteSupplier
);


export default router;