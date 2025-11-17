// services/orderService.js
import Order from "../models/Order.js";

function canView(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(p => String(p.project) === String(projectId));
}

function canEdit(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(p =>
    String(p.project) === String(projectId) &&
    p.modules?.orders === "edit"
  );
}

export default {

  async getOrders(user) {
    console.log("ORDER PERMISSIONS:", user.permissions);

    if (user.role === "admin") return Order.find();

    const allowed = user.permissions.map(p => p.project);
    return Order.find({ projectId: { $in: allowed } });
  },

  async getOrdersByProject(user, projectId) {
    if (!canView(user, projectId)) throw new Error("אין גישה");

    return Order.find({ projectId });
  },

  async getOrderById(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) return null;

    if (!canView(user, order.projectId))
      throw new Error("אין גישה להזמנה");

    return order;
  },

async createBulkOrders(user, ordersArray) {
  if (!Array.isArray(ordersArray)) {
    throw new Error("orders חייב להיות מערך");
  }

  const results = [];

  for (const order of ordersArray) {
    const {
      projectId,
      orderNumber,
      sum,
      status,
      invitingName,
      detail,
      files,
      Contact_person,
      createdAt
    } = order;

    // הרשאות
    if (user.role !== "admin") {
      const allowedProjects = user.permissions.map(p => String(p.project));
      if (!allowedProjects.includes(String(projectId))) {
        throw new Error("אין הרשאה לפרויקט זה");
      }
    }

    // ולידציה בסיסית
    if (!projectId) throw new Error("חסר projectId");
    if (!orderNumber) throw new Error("חסר מספר הזמנה");
    if (!invitingName) throw new Error("חסר שם מזמין");
    if (!sum || Number(sum) <= 0) throw new Error("סכום לא תקין");
    if (!detail) throw new Error("חסר פירוט הזמנה");
    if (!Contact_person) throw new Error("חסר איש קשר");
    if (!createdAt) throw new Error("חסר תאריך יצירה");

    const newOrder = await Order.create({
      projectId,
      projectName: order.projectName,
      orderNumber,
      sum,
      status,
      invitingName,
      detail,
      files,
      Contact_person,
      createdAt
    });

    results.push(newOrder);
  }

  return results;
},
  async createOrder(req, res) {
    try {
      const order = await orderService.createOrder(req.user, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  },
  async updateOrder(user, orderId, data) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("לא נמצא");

    if (!canEdit(user, order.projectId))
      throw new Error("אין הרשאה לערוך");

    Object.assign(order, data);
    return order.save();
  },

  async deleteOrder(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("לא נמצא");

    if (!canEdit(user, order.projectId))
      throw new Error("אין הרשאה למחוק");

    await order.deleteOne();
    return true;
  }
};
