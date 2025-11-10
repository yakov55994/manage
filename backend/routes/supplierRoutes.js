// import express from 'express';
// import { supplierController } from '../controller/SupplierController.js';

// const router = express.Router();

// router.get('/search', supplierController.search);

// // POST /api/suppliers - יצירת ספק חדש
// router.post('/createSupplier', supplierController.createSupplier);

// // GET /api/suppliers - קבלת כל הספקים
// router.get('/getAllSuppliers', supplierController.getAllSuppliers);

// // GET /api/suppliers/:id - קבלת ספק לפי ID
// router.get('/:id', supplierController.getSupplierById);

// // PUT /api/suppliers/:id - עדכון ספק
// router.put('/:id', supplierController.updateSupplier);

// // DELETE /api/suppliers/:id - מחיקת ספק
// router.delete('/:id', supplierController.deleteSupplier);

// export default router;

// backend/routes/supplierRoutes.js
import express from 'express';
import { supplierController } from '../controller/SupplierController.js';
import { protect } from '../middleware/auth.js';
import {
  withScope,
  requireOp,
  applySupplierListFilter,
  ensureSupplierAccess
} from '../middleware/scope.js';

const router = express.Router();

// כל המסלולים כאן מוגנים + נטען scope של המשתמש
router.use(protect, withScope);

// 🔎 חיפוש ספקים (קריאה) — כולל סינון לפי הרשאות
router.get(
  '/search',
  requireOp('suppliers', 'read'),
  applySupplierListFilter(),         // ימלא req.queryFilter
  supplierController.search
);

// ➕ יצירת ספק חדש (כתיבה)
router.post(
  '/createSupplier',
  requireOp('suppliers', 'write'),
  supplierController.createSupplier
);

// 📃 כל הספקים (קריאה) — סינון לפי הרשאות
router.get(
  '/getAllSuppliers',
  requireOp('suppliers', 'read'),
  applySupplierListFilter(),         // ימלא req.queryFilter
  supplierController.getAllSuppliers
);

// 📄 ספק לפי ID (קריאה) — בדיקת גישה
router.get(
  '/:id',
  requireOp('suppliers', 'read'),
  ensureSupplierAccess,
  supplierController.getSupplierById
);

// ✏️ עדכון ספק (כתיבה) — בדיקת גישה
router.put(
  '/:id',
  requireOp('suppliers', 'write'),
  ensureSupplierAccess,
  supplierController.updateSupplier
);

// 🗑️ מחיקת ספק (מחיקה) — בדיקת גישה
router.delete(
  '/:id',
  requireOp('suppliers', 'del'),
  ensureSupplierAccess,
  supplierController.deleteSupplier
);

export default router;
