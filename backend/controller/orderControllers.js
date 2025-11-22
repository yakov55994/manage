// controllers/orderController.js
import orderService from "../services/orderService.js";
import { sendError } from "../utils/sendError.js";

const orderController = {

  async searchOrders (req, res) {
  try {
    const q = req.query.query || "";
    const results = await orderService.searchOrders(q);
    res.json(results);
  } catch (e) {
    console.error("❌ searchOrders ERROR:", e);
    res.status(500).json({ message: "Search failed" });
  }
},

  // ✔ שליפה מלאה (שימוש פנימי בלבד)
  async getAllOrdersWithoutRestrictions(req, res) {
    try {
      const orders = await orderService.getAllOrdersWithoutRestrictions();
      res.json({ success: true, data: orders });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ שליפת הזמנות לפי הרשאות
  async getOrders(req, res) {
    try {
      const data = await orderService.getOrders(req.user);
      res.json({ success: true, data });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ שליפה לפי פרויקט
  async getOrdersByProject(req, res) {
    try {
      const data = await orderService.getOrdersByProject(
        req.user,
        req.params.projectId
      );
      res.json({ success: true, data });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ שליפה לפי מזהה
  async getOrderById(req, res) {
    try {
      const order = await orderService.getOrderById(
        req.user,
        req.params.id
      );

      if (!order) throw new Error("לא נמצא");

      res.json({ success: true, data: order });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ יצירת הזמנות בכמות
  async createBulkOrders(req, res) {
    try {
      const { orders } = req.body;

      if (!Array.isArray(orders) || orders.length === 0)
        throw new Error("חייב לשלוח מערך הזמנות תקין");

      const results = await orderService.createBulkOrders(req.user, orders);

      res.status(201).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ יצירת הזמנה
  async createOrder(req, res) {
    try {
      const order = await orderService.createOrder(req.user, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ עדכון הזמנה
  async updateOrder(req, res) {
    try {
      const updated = await orderService.updateOrder(
        req.user,
        req.params.id,
        req.body
      );

      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ מחיקת הזמנה
  async deleteOrder(req, res) {
    try {
      await orderService.deleteOrder(req.user, req.params.id);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e);
    }
  },
};

export default orderController;
