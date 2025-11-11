// routes/order.routes.js
import express from 'express';
import orderControllers from '../controller/orderControllers.js';

// אימות
import { protect } from '../middleware/auth.js';

// סקופ והרשאות לפי מודולים
import {
  withScope,
  requireOp,
  applyOrderListFilter,
  ensureOrderAccess,
} from '../middleware/scope.js';

const router = express.Router();

// כל המסלולים כאן מוגנים + טוענים scope למשתמש
router.use(protect, withScope);

// ---- קריאה (READ) ----

// רשימת הזמנות (מסונן לפי הרשאות/סקופ)
router.get(
  '/',
  requireOp('orders', 'read'),
  applyOrderListFilter(),          // ימלא req.queryFilter לשימוש בקונטרולר
  orderControllers.getAllOrders    // דאג שהקונטרולר יקרא מ-req.queryFilter אם קיים
);

// חיפוש הזמנות (עדיין קריאה) — מסונן ע"י applyOrderListFilter
router.get(
  '/search',
  requireOp('orders', 'read'),
  applyOrderListFilter(),
  orderControllers.search
);

// הזמנה לפי ID (בדיקת גישה ישירה לישות)
router.get(
  '/:id',
  requireOp('orders', 'read'),
  ensureOrderAccess,               // יוודא שההזמנה שייכת לסקופ של המשתמש
  orderControllers.getOrderById
);

// ---- כתיבה/עדכון/מחיקה ----

// יצירת הזמנה
router.post(
  '/',
  requireOp('orders', 'write'),
  orderControllers.createOrders
);

// עדכון הזמנה
router.put(
  '/:id',
  requireOp('orders', 'write'),
  ensureOrderAccess,
  orderControllers.updateOrder
);

// מחיקת הזמנה
router.delete(
  '/:id',
  requireOp('orders', 'del'),
  ensureOrderAccess,
  orderControllers.deleteOrder
);

export default router;
