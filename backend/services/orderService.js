import Order from "../models/Order.js";
import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Salary from "../models/Salary.js";
import { recalculateRemainingBudget } from "./invoiceService.js";
import notificationService from "./notificationService.js";


// ======================================================
// פונקציית עזר — חישוב תקציב מחדש מהזמנות
// ======================================================
async function recalcProjectBudget(projectId) {
  const orders = await Order.find({ projectId });

  const total = orders.reduce((acc, o) => acc + Number(o.sum || 0), 0);

  await Project.findByIdAndUpdate(projectId, {
    budget: total
  });

  // 🔥 חשב מחדש את התקציב הנותר (budget - חשבוניות)
  await recalculateRemainingBudget(projectId);

  return total;
}



// ======================================================
// שירות ההזמנות
// ======================================================
export default {

  async searchOrders(query) {
    const regex = new RegExp(query, "i");

    const isNumber = !isNaN(query);

    const conditions = [
      { projectName: regex },
      { invitingName: regex },
      { detail: regex },
      { status: regex }
    ];

    if (isNumber) {
      conditions.push({ orderNumber: Number(query) });
    }

    return Order.find({ $or: conditions }).limit(50);
  },


  async getOrders(user) {
    let query = {};

    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      query = { projectId: { $in: allowed } };
    }

    return Order.find(query)
      .populate({
        path: "supplierId",
        select: "name phone email bankDetails"
      })
      .populate({
        path: "projectId",
        select: "name invitingName"
      })
      .sort({ createdAt: -1 });
  },


  async getOrderById(user, orderId) {
    const order = await Order.findById(orderId)
      .populate({ path: "supplierId", select: "name phone email" })
      .populate({ path: "projectId", select: "name budget remainingBudget invitingName" });

    if (!order) return null;

    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );

      if (!allowed.includes(String(order.projectId._id))) {
        throw new Error("אין הרשאה לצפות בהזמנה זו");
      }
    }

    return order;
  },


  // ======================================================
  // יצירת הזמנה
  // ======================================================
  async createOrder(user, data) {
    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      if (!allowed.includes(String(data.projectId))) {
        throw new Error("אין הרשאה להוסיף הזמנה לפרויקט זה");
      }
    }

    const project = await Project.findById(data.projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    const sum = Number(data.sum);
    if (isNaN(sum)) throw new Error("סכום ההזמנה אינו תקין");

    const orderData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || "משתמש"
    };

    const order = await Order.create(orderData);

    await Project.findByIdAndUpdate(
      data.projectId,
      { $push: { orders: order._id } }
    );

    // 🔥 חשב מחדש את התקציב מכל ההזמנות
    await recalcProjectBudget(data.projectId);

    // 📢 שליחת התראה על הזמנה חדשה
    await notificationService.notifyNewOrder(order, user._id);

    return order;
  },


  // ======================================================
  // יצירה מרובה — (ייבוא אקסל)
  // ======================================================
  async createBulkOrders(user, orders) {
    const created = [];
    const projectsToRecalc = new Set();

    for (const data of orders) {
      const project = await Project.findById(data.projectId);
      if (!project) throw new Error("פרויקט לא נמצא");

      const sum = Number(data.sum);
      if (isNaN(sum) || sum <= 0) {
        throw new Error("סכום ההזמנה אינו תקין");
      }

      const order = await Order.create({
        ...data,
        createdBy: user._id,
        createdByName: user.username || user.name || "משתמש"
      });

      await Project.findByIdAndUpdate(
        data.projectId,
        { $push: { orders: order._id } }
      );

      projectsToRecalc.add(String(data.projectId));
      created.push(order);
    }

    // 🔥 חשב מחדש תקציב לכל הפרויקטים שנגעו בהם
    for (const projectId of projectsToRecalc) {
      await recalcProjectBudget(projectId);
    }

    return created;
  },



  // ======================================================
  // עדכון הזמנה — כולל חישוב תקציב מחדש
  // ======================================================
  async updateOrder(user, orderId, data) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    const updatedOrder = await Order.findByIdAndUpdate(orderId, data, { new: true });

    // 🟢 מחשבים תקציב מחדש מכל ההזמנות של הפרויקט
    await recalcProjectBudget(order.projectId);

    return updatedOrder;
  },



  // ======================================================
  // שינוי סטטוס תשלום
  // ======================================================
  async updatePaymentStatus(user, orderId, status, paymentDate) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    return Order.findByIdAndUpdate(
      orderId,
      { paid: status, paymentDate },
      { new: true }
    );
  },



  // ======================================================
  // מחיקת הזמנה — כולל חישוב תקציב מחדש
  // ======================================================
  async deleteOrder(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    const projectId = order.projectId;

    await order.deleteOne();

    // 🟢 חישוב התקציב מחדש מכל ההזמנות שנשארו בפרויקט
    await recalcProjectBudget(projectId);

    return order;
  },

  // ======================================================
  // שיוך הזמנה לחשבוניות, משכורות והזמנות
  // ======================================================
  async linkOrder(user, orderId, invoiceIds, salaryIds, orderIds) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    let totalLinkedAmount = 0;

    // חישוב סכום חשבוניות
    if (invoiceIds && invoiceIds.length > 0) {
      const invoices = await Invoice.find({ _id: { $in: invoiceIds } });
      totalLinkedAmount += invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    }

    // חישוב סכום משכורות
    if (salaryIds && salaryIds.length > 0) {
      const salaries = await Salary.find({ _id: { $in: salaryIds } });
      totalLinkedAmount += salaries.reduce((sum, sal) => sum + (Number(sal.finalAmount) || 0), 0);
    }

    // חישוב סכום הזמנות אחרות
    if (orderIds && orderIds.length > 0) {
      const otherOrders = await Order.find({ _id: { $in: orderIds } });
      totalLinkedAmount += otherOrders.reduce((sum, ord) => sum + (Number(ord.sum) || 0), 0);
    }

    const orderAmount = Number(order.sum) || 0;
    const tolerance = 0.01;
    const hasLinks = (invoiceIds?.length > 0) || (salaryIds?.length > 0) || (orderIds?.length > 0);

    // בדיקת סכומים (אם יש שיוכים)
    if (hasLinks && totalLinkedAmount > 0 && Math.abs(orderAmount - totalLinkedAmount) > tolerance) {
      throw new Error(
        `סכום ההזמנה (${orderAmount.toLocaleString('he-IL')} ₪) חייב להיות זהה לסכום הפריטים המשויכים (${totalLinkedAmount.toLocaleString('he-IL')} ₪)`
      );
    }

    // עדכון השיוכים
    order.linkedInvoices = invoiceIds || [];
    order.linkedSalaries = salaryIds || [];
    order.linkedOrders = orderIds || [];
    order.isCredited = hasLinks;

    await order.save();

    // החזרת ההזמנה עם populate
    const populatedOrder = await Order.findById(orderId)
      .populate("linkedInvoices", "invoiceNumber totalAmount")
      .populate("linkedSalaries", "employeeName finalAmount")
      .populate("linkedOrders", "orderNumber sum")
      .populate("supplierId", "name phone email")
      .populate("projectId", "name");

    return populatedOrder;
  }

};
