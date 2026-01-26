import express from "express";
import { protect } from "../middleware/auth.js";
import notificationController from "../controller/notificationControllers.js";

const router = express.Router();

// 🔑 קבלת VAPID Public Key (ציבורי - לא דורש אותנטיקציה)
router.get("/vapid-key", notificationController.getVapidKey);

// 📬 קבלת התראות
router.get("/", protect, notificationController.getNotifications);

// 🔔 רישום Push Subscription
router.post("/subscribe", protect, notificationController.subscribe);

// 🔕 הסרת Push Subscription
router.post("/unsubscribe", protect, notificationController.unsubscribe);

// 🧪 התראת בדיקה
router.post("/test", protect, notificationController.sendTestNotification);

// 🗑️ מחיקת כל ההתראות
router.delete("/all", protect, notificationController.deleteAllNotifications);

// ✅ סימון כל ההתראות כנקראו (חייב להיות לפני /:id)
router.put("/read-all", protect, notificationController.markAllAsRead);

// ✅ סימון התראה ספציפית כנקראה
router.put("/:id/read", protect, notificationController.markAsRead);

// 🗑️ מחיקת התראה
router.delete("/:id", protect, notificationController.deleteNotification);

export default router;
