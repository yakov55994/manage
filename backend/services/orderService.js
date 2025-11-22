import Order from "../models/Order.js";
import Project from "../models/Project.js";

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

  async searchOrders (query) {
  const regex = new RegExp(query, "i");

  return Order.find({
    $or: [
      { projectName: regex },
      { invitingName: regex },
      { detail: regex },
      { status: regex },
    ],
  }).limit(50);
},
  async getOrders(user) {
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

  // ============================
  // ✔ יצירת הזמנה – מורידה remainingBudget
  // ============================
  async createOrder(user, data) {
    const {
      projectId,
      sum,
    } = data;

    if (!canEdit(user, projectId))
      throw new Error("אין הרשאה ליצור הזמנה בפרויקט זה");

    const project = await Project.findById(projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    // 🟦 מוריד תקציב פנוי
    project.remainingBudget = (project.remainingBudget || 0) - Number(sum);
    await project.save();

    // יצירת ההזמנה
    return Order.create(data);
  },

  // ============================
  // ✔ עדכון הזמנה – מחזיר את הישן ומחיל את החדש
  // ============================
  async updateOrder(user, orderId, data) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("לא נמצא");

    if (!canEdit(user, order.projectId))
      throw new Error("אין הרשאה לערוך");

    const project = await Project.findById(order.projectId);

    // ❗ להחזיר תקציב ישן
    project.remainingBudget += Number(order.sum);

    // ❗ להחיל תקציב חדש
    project.remainingBudget -= Number(data.sum);

    await project.save();

    Object.assign(order, data);
    return order.save();
  },

  // ============================
  // ✔ מחיקת הזמנה – מעלה תקציב חזרה
  // ============================
  async deleteOrder(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("לא נמצא");

    if (!canEdit(user, order.projectId))
      throw new Error("אין הרשאה למחוק");

    const project = await Project.findById(order.projectId);

    // 🟦 מחזיר תקציב פנוי
    project.remainingBudget += Number(order.sum);
    await project.save();

    await order.deleteOne();
    return true;
  }
};
