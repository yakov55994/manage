// controllers/orderController.js
import orderService from '../services/orderService.js';
import mongoose from 'mongoose';

const orderController = {
  // ➕ יצירת הזמנות לפרויקט
  createOrders: async (req, res) => {
    try {
      const { projectId } = req.params;
      let { orders } = req.body;

      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }
      if (!orders || (Array.isArray(orders) && orders.length === 0)) {
        return res.status(400).json({ message: "Invalid orders data" });
      }
      if (!Array.isArray(orders)) orders = [orders];

      const processed = orders
        .map(order => {
          if (!order.orderNumber) return null;

          const files = Array.isArray(order.files)
            ? order.files.map(file => ({
                name: file?.name || file?.fileName || 'unknown',
                url:  file?.url  || file?.fileUrl  || '',
                type: file?.type || file?.fileType || 'application/octet-stream',
                size: file?.size || 0,
              }))
            : [];

          return { ...order, project: projectId, files };
        })
        .filter(Boolean);

      if (processed.length === 0) {
        return res.status(400).json({ message: "No valid orders to process" });
      }

      const newOrders = await orderService.create(projectId, processed); // insertMany בתוך ה-service
      return res.status(201).json(newOrders);
    } catch (error) {
      console.error("Error in createOrders:", error);
      return res.status(500).json({ error: error.message });
    }
  },

  // 📃 כל ההזמנות בפרויקט (עם עמודים)
  getAllOrders: async (req, res) => {
    try {
      const orders = await orderService.getAllOrders();
      return res.status(200).json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת הזמנות', error: error.message });
    }
  },

  // 📄 הזמנה לפי ID בפרויקט
// controller
getOrderById: async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    const order = await orderService.getById(null, id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.status(200).json(order);
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ error: err.message });
  }
},

  // 🗑️ מחיקת הזמנה בפרויקט
  deleteOrder: async (req, res) => {
    try {
      const { projectId, id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      const deleted = await orderService.remove(projectId, id);
      if (!deleted) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json({ message: 'ההזמנה נמחקה בהצלחה' });
    } catch (error) {
      console.error("deleteOrder error:", error);
      return res.status(500).json({ error: error.message });
    }
  },

  // ✏️ עדכון הזמנה בפרויקט
  updateOrder: async (req, res) => {
    try {
      const { projectId, id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      const updated = await orderService.update(projectId, id, req.body);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json(updated);
    } catch (error) {
      console.error("updateOrder error:", error);
      return res.status(500).json({ error: error.message });
    }
  },

  // 🔎 חיפוש הזמנות בפרויקט
  search: async (req, res) => {
    try {
      const { projectId } = req.params;
      const searchQuery = req.query.query;
      if (!searchQuery) {
        return res.status(400).json({ error: "מילת חיפוש לא נמצאה" });
      }
      const orders = await orderService.search(projectId, searchQuery);
      return res.status(200).json(orders);
    } catch (error) {
      console.error("שגיאה במהלך החיפוש:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }
};

export default orderController;
