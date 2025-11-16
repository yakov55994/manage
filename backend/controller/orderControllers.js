// controllers/orderController.js
import Order from "../models/Order.js";
import orderService from "../services/orderService.js";

const orderController = {

    async getAllOrdersWithoutRestrictions(req, res) {
    try {
      const suppliers = await Order.find();
      res.json({ success: true, data: suppliers });
    } catch (e) {
  return res.status(403).json({ message: "אין הרשאה" });
}

  },
  // ✔ שליפה של כל ההזמנות לפי ההרשאות
  async getOrders(req, res) {
    try {
      const data = await orderService.getOrders(req.user);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // ✔ שליפה לפי פרויקט (רק אם מותר)
  async getOrdersByProject(req, res) {
    try {
      const data = await orderService.getOrdersByProject(
        req.user,
        req.params.projectId
      );

      res.json({ success: true, data });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
    }
  },

  async getOrderById(req, res) {
    try {
      const order = await orderService.getOrderById(
        req.user,
        req.params.id
      );

      if (!order) return res.status(404).json({ message: "לא נמצא" });

      res.json({ success: true, data: order });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
    }
  },

  async createBulkOrders(req, res) {
  try {
    const orders = req.body.orders;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "חייב לשלוח מערך הזמנות תקין",
      });
    }

    const results = await orderService.createBulkOrders(req.user, orders);

    res.status(201).json({
      success: true,
      count: results.length,
      data: results,
    });

  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
},
  async createOrder(req, res) {
    try {
      const order = await orderService.createOrder(req.user, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  },

  async updateOrder(req, res) {
    try {
      const updated = await orderService.updateOrder(
        req.user,
        req.params.id,
        req.body
      );

      res.json({ success: true, data: updated });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
    }
  },

  async deleteOrder(req, res) {
    try {
      await orderService.deleteOrder(req.user, req.params.id);

      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
    }
  }
};

export default orderController;
