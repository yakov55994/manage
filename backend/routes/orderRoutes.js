// import express from 'express';
// import orderControllers from '../controller/orderControllers.js';

// const router = express.Router();

// router.post('/', orderControllers.createOrders);

// router.get('/search', orderControllers.search);

// router.get('/', orderControllers.getAllOrders);

// router.get('/:id', orderControllers.getOrderById);

// router.put('/:id', orderControllers.updateOrder);

// router.delete('/:id', orderControllers.deleteOrder);


// export default router;

import express from 'express';
import orderControllers from '../controller/orderControllers.js';
import { protect } from '../middleware/auth.js';
import {
  withScope,
  requireOp,
  applyOrderListFilter,
  ensureOrderAccess,
} from '../middleware/scope.js';

const router = express.Router();

// כל מסלולי ההזמנות מוגנים ונטען scope של המשתמש
router.use(protect, withScope);

// יצירת הזמנה (כתיבה)
router.post(
  '/',
  requireOp('orders', 'write'),
  orderControllers.createOrders
);

// חיפוש הזמנות (קריאה) — סינון לפי הרשאות
router.get(
  '/search',
  requireOp('orders', 'read'),
  applyOrderListFilter(),   // ימלא req.queryFilter
  orderControllers.search
);

// כל ההזמנות (קריאה) — סינון לפי הרשאות
router.get(
  '/',
  requireOp('orders', 'read'),
  applyOrderListFilter(),   // ימלא req.queryFilter
  orderControllers.getAllOrders
);

// הזמנה לפי ID (קריאה) — בדיקת גישה לפי פרויקט/ספק של ההזמנה
router.get(
  '/:id',
  requireOp('orders', 'read'),
  ensureOrderAccess,
  orderControllers.getOrderById
);

// עדכון הזמנה (כתיבה) — בדיקת גישה
router.put(
  '/:id',
  requireOp('orders', 'write'),
  ensureOrderAccess,
  orderControllers.updateOrder
);

// מחיקת הזמנה (מחיקה) — בדיקת גישה
router.delete(
  '/:id',
  requireOp('orders', 'del'),
  ensureOrderAccess,
  orderControllers.deleteOrder
);

export default router;
