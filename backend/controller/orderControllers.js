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

  async createBulkOrders(req, res) {
    try {
      const orders = await orderService.createBulkOrders(req.user, req.body.orders);
      res.json({ success: true, data: orders });
    } catch (e) {
      sendError(res, e);
    }
  },
  async createOrder(req, res) {
    try {
      let orderData = { ...req.body };

      // טיפול בקבצים - אותו קוד כמו updateOrder
      if (orderData.files) {
        if (typeof orderData.files === 'string') {
          try {
            orderData.files = JSON.parse(orderData.files);
          } catch (e) {
            console.error('Failed to parse files:', e);
            return res.status(400).json({
              success: false,
              message: "פורמט קבצים לא תקין"
            });
          }
        }

        if (!Array.isArray(orderData.files)) {
          orderData.files = [];
        }

        // ✅ שמור את כל השדות החשובים
        orderData.files = orderData.files.map(file => {
          const cleanFile = {
            name: file.name,
            url: file.url,
            type: file.type,
            size: file.size,
          };

          if (file.publicId) cleanFile.publicId = file.publicId;
          if (file.resourceType) cleanFile.resourceType = file.resourceType;
          if (file.folder) cleanFile.folder = file.folder;

          return cleanFile;
        });
      }

      const newOrder = await orderService.createOrder(req.user, orderData);
      res.status(201).json({ success: true, data: newOrder });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updateOrder(req, res) {
    try {
      const orderId = req.params.orderId;
      let updateData = { ...req.body };

      console.log('📥 Raw req.body:', JSON.stringify(req.body, null, 2));
      console.log('📥 Files received - type:', typeof updateData.files);
      console.log('📥 Files received - is Array?:', Array.isArray(updateData.files));
      console.log('📥 Files received - value:', updateData.files);

      // טיפול בקבצים
      if (updateData.files) {
        // אם זה string - נסה לפענח
        if (typeof updateData.files === 'string') {
          try {
            console.log('🔄 Parsing files from string...');
            updateData.files = JSON.parse(updateData.files);
            console.log('✅ Files parsed:', updateData.files);
          } catch (e) {
            console.error('❌ Failed to parse files:', e);
            return res.status(400).json({
              success: false,
              message: "פורמט קבצים לא תקין"
            });
          }
        }

        // ודא שזה מערך
        if (!Array.isArray(updateData.files)) {
          console.error('⚠️ Files is not an array:', typeof updateData.files);
          updateData.files = [];
        }

        // ✅ ניקוי - אבל שמור את publicId, resourceType, folder!
        updateData.files = updateData.files.map(file => {
          const cleanFile = {
            name: file.name,
            url: file.url,
            type: file.type,
            size: file.size,
          };

          // ✅ שמור שדות נוספים אם קיימים
          if (file.publicId) cleanFile.publicId = file.publicId;
          if (file.resourceType) cleanFile.resourceType = file.resourceType;
          if (file.folder) cleanFile.folder = file.folder;

          return cleanFile;
        });

        console.log('✅ Cleaned files:', updateData.files);
      }

      console.log('📤 Sending to service:', JSON.stringify(updateData, null, 2));

      const updated = await orderService.updateOrder(req.user, orderId, updateData);

      res.json({ success: true, data: updated });
    } catch (e) {
      console.error('❌ Controller error:', e);
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
