import orderService from "../services/orderService.js";

const orderController = {
  getOrdersByProject: async (req, res) => {
    try {
      const data = await orderService.getOrdersByProject(req.params.projectId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  },

  createOrder: async (req, res) => {
    try {
      const order = await orderService.createOrder(req.params.projectId, req.body);
      res.status(201).json(order);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  getOrderById: async (req, res) => {
    try {
      const order = await orderService.getOrderById(
        req.params.projectId,
        req.params.id
      );
      if (!order) return res.status(404).json({ message: "לא נמצא" });
      res.json(order);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  },

  updateOrder: async (req, res) => {
    try {
      const updated = await orderService.updateOrder(
        req.params.projectId,
        req.params.id,
        req.body
      );
      if (!updated) return res.status(404).json({ message: "לא נמצא" });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  deleteOrder: async (req, res) => {
    try {
      const deleted = await orderService.deleteOrder(
        req.params.projectId,
        req.params.id
      );
      if (!deleted) return res.status(404).json({ message: "לא נמצא" });
      res.json({ message: "נמחק" });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

export default orderController;
