import express from "express";
import { protect, checkAccess } from "../middleware/auth.js";
import orderController from "../controller/orderControllers.js";

const router = express.Router();

// 🔍 חיפוש הזמנות
router.get("/search", protect, orderController.searchOrders);

// כל ההזמנות למשתמש (לפי permissions)
router.get(
  "/",
  protect,
  checkAccess("order", "view"),
  orderController.getOrders
);

// הזמנה לפי ID
router.get(
  "/:orderId",
  protect,
  checkAccess("order", "view"),
  orderController.getOrderById
);

// יצירת הזמנה
router.post(
  "/",
  protect,
  checkAccess("order", "edit"),
  orderController.createOrder
);

// עדכון הזמנה
router.put(
  "/:orderId",
  protect,
  checkAccess("order", "edit"),
  orderController.updateOrder
);

// עדכון סטטוס תשלום
router.put(
  "/:orderId/status",
  protect,
  checkAccess("order", "edit"),
  orderController.updatePaymentStatus
);

// מחיקה
router.delete(
  "/:orderId",
  protect,
  checkAccess("order", "edit"),
  orderController.deleteOrder
);

export default router;
