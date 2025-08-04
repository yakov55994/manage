import express from 'express';
import { supplierController } from '../controller/SupplierController.js';

const router = express.Router();

router.get('/search', supplierController.search);

// POST /api/suppliers - יצירת ספק חדש
router.post('/createSupplier', supplierController.createSupplier);

// GET /api/suppliers - קבלת כל הספקים
router.get('/getAllSuppliers', supplierController.getAllSuppliers);

// GET /api/suppliers/:id - קבלת ספק לפי ID
router.get('/:id', supplierController.getSupplierById);

// PUT /api/suppliers/:id - עדכון ספק
router.put('/:id', supplierController.updateSupplier);

// DELETE /api/suppliers/:id - מחיקת ספק
router.delete('/:id', supplierController.deleteSupplier);

export default router;