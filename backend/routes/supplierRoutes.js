import express from "express";
import { protect, checkAccess, requireAdmin } from "../middleware/auth.js";
import supplierController from "../controller/SupplierController.js";

const router = express.Router();

// 📌 רשימת ספקים — ללא checkAccess
router.get("/", protect, supplierController.getSuppliers);

// 📌 ספק יחיד — כן
router.get("/:supplierId", protect, checkAccess("suppliers", "view"), supplierController.getSupplierById);

// 📌 יצירה — כן
router.post("/", protect, checkAccess("suppliers", "edit"), supplierController.createSupplier);

// 📌 עדכון — כן
router.put("/:supplierId", protect, checkAccess("suppliers", "edit"), supplierController.updateSupplier);

// 📌 מחיקה — כן
router.delete("/:supplierId", protect, requireAdmin, checkAccess("suppliers", "edit"), supplierController.deleteSupplier);

export default router;
