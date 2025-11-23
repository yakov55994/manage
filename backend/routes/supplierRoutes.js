import express from "express";
import { protect } from "../middleware/auth.js";
import supplierController from "../controller/SupplierController.js";

const router = express.Router();

// כל הספקים – זמין לכל משתמש מחובר
router.get("/", protect, supplierController.getAllSuppliersWithoutRestrictions);

// ספק בודד (אם תרצה future permissions)
router.get("/:supplierId", protect, supplierController.getSupplierById);

// הוספת ספק (רק אדמין)
router.post("/", protect, supplierController.createSupplier);

// עדכון ספק (רק אדמין)
router.put("/:supplierId", protect, supplierController.updateSupplier);

// מחיקה (רק אדמין)
router.delete("/:supplierId", protect, supplierController.deleteSupplier);

export default router;
