import express from 'express';
import { supplierController } from '../controller/SupplierController.js';
import { protect } from '../middleware/auth.js';
import {
  withScope,
  requireOp,
  applySupplierListFilter,
  ensureSupplierAccess,
} from '../middleware/scope.js';

// לעבוד תחת base: /api/projects/:projectId/suppliers
const router = express.Router({ mergeParams: true });

// הגנה + scope
router.use(protect, withScope);

// 🔎 חיפוש ספקים (קריאה)
router.get(
  '/search',
  requireOp('suppliers', 'read'),
  applySupplierListFilter(),
  supplierController.search
);

// ➕ יצירת ספק (כתיבה)
// מומלץ ב-controller: להצמיד supplier.project = req.params.projectId אם יש שדה כזה בסכמה
router.post(
  '/',
  requireOp('suppliers', 'write'),
  supplierController.createSupplier
);

// 📃 כל הספקים (קריאה)
router.get(
  '/',
  requireOp('suppliers', 'read'),
  applySupplierListFilter(),
  supplierController.getAllSuppliers
);

// 📄 ספק לפי ID (קריאה)
router.get(
  '/:id',
  requireOp('suppliers', 'read'),
  ensureSupplierAccess,
  supplierController.getSupplierById
);

// ✏️ עדכון ספק (כתיבה)
router.put(
  '/:id',
  requireOp('suppliers', 'write'),
  ensureSupplierAccess,
  supplierController.updateSupplier
);

// 🗑️ מחיקת ספק (מחיקה)
router.delete(
  '/:id',
  requireOp('suppliers', 'del'),
  ensureSupplierAccess,
  supplierController.deleteSupplier
);

export default router;
