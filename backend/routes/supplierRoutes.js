import express from 'express';
import { supplierController } from '../controller/SupplierController.js';

// לעבוד תחת base: /api/projects/:projectId/suppliers
const router = express.Router({ mergeParams: true });

// הגנה + scope

// 🔎 חיפוש ספקים (קריאה)
router.get(
  '/search',
  supplierController.search
);

// ➕ יצירת ספק (כתיבה)
// מומלץ ב-controller: להצמיד supplier.project = req.params.projectId אם יש שדה כזה בסכמה
router.post(
  '/',

  supplierController.createSupplier
);

// 📃 כל הספקים (קריאה)
router.get(
  '/',
  supplierController.getAllSuppliers
);

// 📄 ספק לפי ID (קריאה)
router.get(
  '/:id',

  supplierController.getSupplierById
);

// ✏️ עדכון ספק (כתיבה)
router.put(
  '/:id',


  supplierController.updateSupplier
);

// 🗑️ מחיקת ספק (מחיקה)
router.delete(
  '/:id',

  supplierController.deleteSupplier
);

export default router;
