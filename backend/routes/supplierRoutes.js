import express from 'express'
import { protect } from '../middleware/auth.js';
import { checkProjectPermission } from '../middleware/permissions.js';
import supplierController from '../controller/supplierController.js'

const router = express.Router({ mergeParams: true });


router.get(
  "/all",
  protect,
  supplierController.getAllSuppliers
);


// כל הספקים של פרויקט
router.get(
  '/:projectId/suppliers',
  protect,
  checkProjectPermission("suppliers", "view"),
  supplierController.getSuppliersByProject
);

// יצירת ספק
router.post(
  '/:projectId/suppliers',
  protect,
  checkProjectPermission("suppliers", "edit"),
  supplierController.createSupplier
);

// ספק לפי ID
router.get(
  '/:projectId/suppliers/:id',
  protect,
  checkProjectPermission("suppliers", "view"),
  supplierController.getSupplierById
);

router.put(
  '/:projectId/suppliers/:id',
  protect,
  checkProjectPermission("suppliers", "edit"),
  supplierController.updateSupplier
);

router.delete(
  '/:projectId/suppliers/:id',
  protect,
  checkProjectPermission("suppliers", "edit"),
  supplierController.deleteSupplier
);

export default router;
