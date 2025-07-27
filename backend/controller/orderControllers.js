import orderService from '../services/orderService.js';
import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId.createFromTime(Date.now());

const orderController = {
  createOrders: async (req, res) => {
    try {
      let { orders } = req.body;
  
      if (!orders || (Array.isArray(orders) && orders.length === 0)) {
        return res.status(400).json({ message: "Invalid orders data" });
      }
  
      if (!Array.isArray(orders)) {
        orders = [orders]; // עוטפים את האובייקט במערך
      }
  
      const processedOrders = orders.map(order => {
        if (!order.orderNumber) {
          console.error("Missing orderNumber:", order);
          return null;
        }
  
        let files = [];
        if (Array.isArray(order.files) && order.files.length > 0) {
          files = order.files.map(file => ({
            name: file?.name || file?.fileName || 'unknown',
            url: file?.url || file?.fileUrl || '',
            type: file?.type || file?.fileType || 'application/octet-stream',
            size: file?.size || 0
          }));
        }
  
        console.log(`Processing order ${order.orderNumber} with ${files.length} files.`);
        return { ...order, files };
      }).filter(order => order !== null); // מסננים הזמנות לא תקינות
  
      if (processedOrders.length === 0) {
        return res.status(400).json({ message: "No valid orders to process" });
      }
  
      const newOrders = await orderService.createOrders(processedOrders);
      res.status(201).json(newOrders);
    } catch (error) {
      console.error("Error in createOrders:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // קבלת כל ההזמנות
  getAllOrders: async (req, res) => {
    try {
      const orders = await orderService.getAllOrders();
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // קבלת הזמנה לפי ID
  getOrderById: async (req, res) => {
    try {
      const order = await orderService.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // מחיקת הזמנה לפי ID
  deleteOrder: async (req, res) => {
    try {
      const deletedOrder = await orderService.deleteOrder(req.params.id);
      if (!deletedOrder) return res.status(404).json({ error: 'Order not found' });

      // שליחת תשובה ללקוח
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },


  // עדכון הזמנה – מצפים לקבל ב-body את השדות שברצונך לעדכן (למשל: status, invitingName, detail וכו')
  updateOrder: async (req, res) => {
    try {
      const updatedOrder = await orderService.updateOrder(req.body._id, req.body);
      if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
      res.status(200).json(updatedOrder);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // חיפוש הזמנות – ניתן להעביר פרמטרים לחיפוש דרך req.query
  search: async (req, res) => {
    try {
      const searchQuery = req.query.query; // קבלת המחרוזת הנכונה מהבקשה

      if (!searchQuery) {
        return res.status(400).json({ error: "מילת חיפוש לא נמצאה" });
      }

      const orders = await orderService.search(searchQuery);
      res.status(200).json(orders);
    } catch (error) {
      console.error("שגיאה במהלך החיפוש:", error.message);
      res.status(500).json({ error: error.message });
    }
  }

};

export default orderController;
