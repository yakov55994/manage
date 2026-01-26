import notificationService from "../services/notificationService.js";
import {
  getVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription
} from "../services/pushService.js";
import { sendError } from "../utils/sendError.js";

const notificationController = {
  /**
   * קבלת התראות של המשתמש
   * GET /api/notifications
   */
  async getNotifications(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const unreadOnly = req.query.unreadOnly === "true";

      const result = await notificationService.getUserNotifications(
        req.user._id,
        { page, limit, unreadOnly }
      );

      res.json({ success: true, data: result });
    } catch (e) {
      console.error("❌ getNotifications ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * סימון התראה כנקראה
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req, res) {
    try {
      const result = await notificationService.markAsRead(
        req.user._id,
        req.params.id
      );

      res.json({ success: true, data: result });
    } catch (e) {
      console.error("❌ markAsRead ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * סימון כל ההתראות כנקראו
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      res.json({ success: true, data: result });
    } catch (e) {
      console.error("❌ markAllAsRead ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * מחיקת התראה
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res) {
    try {
      await notificationService.deleteNotification(
        req.user._id,
        req.params.id
      );

      res.json({ success: true, message: "התראה נמחקה" });
    } catch (e) {
      console.error("❌ deleteNotification ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * קבלת VAPID Public Key
   * GET /api/notifications/vapid-key
   */
  async getVapidKey(req, res) {
    try {
      const vapidKey = getVapidPublicKey();
      res.json({ success: true, data: { vapidKey } });
    } catch (e) {
      console.error("❌ getVapidKey ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * רישום Push Subscription
   * POST /api/notifications/subscribe
   */
  async subscribe(req, res) {
    try {
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({
          success: false,
          error: "Subscription is required"
        });
      }

      await registerPushSubscription(req.user._id, subscription);
      res.json({ success: true, message: "Subscribed to push notifications" });
    } catch (e) {
      console.error("❌ subscribe ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * הסרת Push Subscription
   * POST /api/notifications/unsubscribe
   */
  async unsubscribe(req, res) {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({
          success: false,
          error: "Endpoint is required"
        });
      }

      await unregisterPushSubscription(req.user._id, endpoint);
      res.json({ success: true, message: "Unsubscribed from push notifications" });
    } catch (e) {
      console.error("❌ unsubscribe ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * שליחת התראת בדיקה
   * POST /api/notifications/test
   */
  async sendTestNotification(req, res) {
    try {
      const notification = await notificationService.createNotification(req.user._id, {
        type: "system_update",
        title: "התראת בדיקה 🔔",
        message: "זו התראת בדיקה. אם אתה רואה את זה - ההתראות עובדות!",
        entityType: null,
        entityId: null
      });

      res.json({
        success: true,
        message: "התראת בדיקה נשלחה",
        data: notification
      });
    } catch (e) {
      console.error("❌ sendTestNotification ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * מחיקת כל ההתראות
   * DELETE /api/notifications/all
   */
  async deleteAllNotifications(req, res) {
    try {
      const result = await notificationService.deleteAllNotifications(req.user._id);
      res.json({
        success: true,
        message: `נמחקו ${result.deletedCount} התראות`,
        data: result
      });
    } catch (e) {
      console.error("❌ deleteAllNotifications ERROR:", e);
      sendError(res, e);
    }
  }
};

export default notificationController;
