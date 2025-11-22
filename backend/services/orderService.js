// services/orderService.js
import Order from "../models/Order.js";
import Project from "../models/Project.js";

function canView(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(
    (p) => String(p.project) === String(projectId)
  );
}

function canEdit(user, projectId) {
  if (user.role === "admin") return true;

  return user.permissions.some(
    (p) =>
      String(p.project) === String(projectId) &&
      p.modules?.orders === "edit"
  );
}

export default {
  // 🔎 חיפוש
  async searchOrders(query) {
    const regex = new RegExp(query, "i");

    return Order.find({
      $or: [
        { orderNumber: regex },
        { projectName: regex },
        { invitingName: regex },
        { detail: regex },
        { status: regex },
      ],
    }).limit(50);
  },

  // כל ההזמנות לפי הרשאות
  async getOrders(user) {
    if (user.role === "admin") return Order.find().sort({ createdAt: -1 });

    const allowed = user.permissions.map((p) => p.project);
    return Order.find({ projectId: { $in: allowed } }).sort({ createdAt: -1 });
  },

  // לפי פרויקט
  async getOrdersByProject(user, projectId) {
    if (!canView(user, projectId)) throw new Error("אין גישה לפרויקט");
    return Order.find({ projectId }).sort({ createdAt: -1 });
  },

  // לפי מזהה
  async getOrderById(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) return null;

    if (!canView(user, order.projectId)) throw new Error("אין גישה להזמנה");

    return order;
  },

  // יצירת הזמנה – מוסיפה תקציב!
  async createOrder(user, data) {
    const { projectId, sum } = data;

    if (!canEdit(user, projectId))
      throw new Error("אין הרשאה ליצור הזמנה בפרויקט זה");

    const project = await Project.findById(projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    // ✔ הזמנה מוסיפה תקציב פנוי
    project.remainingBudget += Number(sum);
    await project.save();

    return Order.create(data);
  },

  // יצירת מרובות
  async createBulkOrders(user, orders) {
    const results = [];
    for (const data of orders) {
      const created = await this.createOrder(user, data);
      results.push(created);
    }
    return results;
  },

  // עדכון הזמנה
  async updateOrder(user, orderId, data) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("לא נמצא");

    if (!canEdit(user, order.projectId))
      throw new Error("אין הרשאה לערוך");

    const project = await Project.findById(order.projectId);

    // ✔ להחזיר ישן = מוריד את התוספת של ההזמנה הישנה
    project.remainingBudget -= Number(order.sum);

    // ✔ להוסיף חדש = מוסיף את התוספת החדשה
    project.remainingBudget += Number(data.sum);

    await project.save();

    Object.assign(order, data);
    return order.save();
  },

  // מחיקה
  async deleteOrder(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("לא נמצא");

    if (!canEdit(user, order.projectId))
      throw new Error("אין הרשאה למחוק הזמנה");

    const project = await Project.findById(order.projectId);

    // ✔ מחיקת הזמנה = להוריד את מה שהוסיפה
    project.remainingBudget -= Number(order.sum);
    await project.save();

    await order.deleteOne();
    return true;
  },
};
