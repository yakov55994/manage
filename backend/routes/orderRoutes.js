import express from "express";
import { protect, checkAccess, requireAdmin } from "../middleware/auth.js";
import orderController from "../controller/orderControllers.js";

const router = express.Router();

// 🔍 חיפוש — לא לפי פרויקט ספציפי → אין checkAccess
router.get("/search", protect, orderController.searchOrders);

// 📌 רשימת כל ההזמנות של המשתמש — ההרשאה בפנים בשירות
router.get("/", protect, orderController.getOrders);

// 📌 הזמנה בודדת לפי ID — כן checkAccess
router.get("/:orderId", protect, checkAccess("orders", "view"), orderController.getOrderById);

// 📌 יצירת הזמנה — כן checkAccess (בגלל module = "orders")
router.post("/", protect, checkAccess("orders", "edit"), orderController.createOrder);

// 📌 יצירת הרבה הזמנות — כן checkAccess
router.post("/bulk", protect, orderController.createBulkOrders);

// 📌 מחיקת הזמנות מרובה — אדמין בלבד
router.post("/bulk/delete", protect, requireAdmin, orderController.bulkDeleteOrders);

// 📌 עדכון הזמנה — כן checkAccess
router.put("/:orderId", protect, checkAccess("orders", "edit"), orderController.updateOrder);

// 📌 שיוך הזמנה לחשבוניות/משכורות/הזמנות
router.put("/:orderId/link", protect, orderController.linkOrder);

// 📌 עדכון סטטוס תשלום — כן
router.put("/:orderId/status", protect, checkAccess("orders", "edit"), orderController.updatePaymentStatus);

// 📌 מחיקה — כן
router.delete("/:orderId", protect, requireAdmin, checkAccess("orders", "edit"), orderController.deleteOrder);

export default router;
