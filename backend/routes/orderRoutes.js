import express from "express";
import { protect, checkAccess } from "../middleware/auth.js";
import orderController from "../controller/orderControllers.js";

const router = express.Router();

// 🔍 חיפוש
router.get("/search", protect, orderController.searchOrders);

// כל ההזמנות למשתמש לפי הרשאות
router.get(
  "/",
  protect,
  checkAccess("orders", "view"),
  orderController.getOrders
);

// הזמנה לפי ID
router.get(
  "/:orderId",
  protect,
  checkAccess("orders", "view"),
  orderController.getOrderById
);

// יצירה
router.post(
  "/",
  protect,
  checkAccess("orders", "edit"),
  orderController.createOrder
);

// עדכון
router.put(
  "/:orderId",
  protect,
  checkAccess("orders", "edit"),
  orderController.updateOrder
);

// סטטוס תשלום
router.put(
  "/:orderId/status",
  protect,
  checkAccess("orders", "edit"),
  orderController.updatePaymentStatus
);

// מחיקה
router.delete(
  "/:orderId",
  protect,
  checkAccess("orders", "edit"),
  orderController.deleteOrder
);

export default router;
