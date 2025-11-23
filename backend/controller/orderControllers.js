import orderService from "../services/orderService.js";
import { sendError } from "../utils/sendError.js";

const orderController = {

  async searchOrders(req, res) {
    try {
      const q = req.query.query || "";
      const results = await orderService.searchOrders(q);
      res.json(results);
    } catch (e) {
      sendError(res, e);
    }
  },

  async getOrders(req, res) {
    try {
      const data = await orderService.getOrders(req.user);
      res.json({ success: true, data });
    } catch (e) {
      sendError(res, e);
    }
  },

  async getOrderById(req, res) {
    try {
      const orderId = req.params.orderId;

      const order = await orderService.getOrderById(req.user, orderId);

      if (!order) {
        return res.status(404).json({ message: "הזמנה לא נמצאה" });
      }

      res.json({ success: true, data: order });

    } catch (e) {
      sendError(res, e);
    }
  },

  async createOrder(req, res) {
    try {
      const order = await orderService.createOrder(req.user, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updateOrder(req, res) {
    try {
      const orderId = req.params.orderId;
      const updated = await orderService.updateOrder(req.user, orderId, req.body);
      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updatePaymentStatus(req, res) {
    try {
      const result = await orderService.updatePaymentStatus(
        req.user,
        req.params.orderId,
        req.body.status,
        req.body.paymentDate
      );
      res.json({ success: true, data: result });
    } catch (e) {
      sendError(res, e);
    }
  },

  async deleteOrder(req, res) {
    try {
      await orderService.deleteOrder(req.user, req.params.orderId);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e);
    }
  }
};

export default orderController;
