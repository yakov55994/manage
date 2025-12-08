import Order from "../models/Order.js";
import Project from "../models/Project.js";


// ======================================================
// פונקציית עזר — חישוב תקציב מחדש מהזמנות
// ======================================================
async function recalcProjectBudget(projectId) {
  const orders = await Order.find({ projectId });

  const total = orders.reduce((acc, o) => acc + Number(o.sum || 0), 0);

  await Project.findByIdAndUpdate(projectId, {
    budget: total
  });

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
      });
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

    project.budget = sum;
    await project.save();

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

    return order;
  },


  // ======================================================
  // יצירה מרובה — (ייבוא אקסל)
  // ======================================================
  async createBulkOrders(user, orders) {
    const created = [];

    for (const data of orders) {
      const project = await Project.findById(data.projectId);
      if (!project) throw new Error("פרויקט לא נמצא");

      const sum = Number(data.sum);
      if (isNaN(sum) || sum <= 0) {
        throw new Error("סכום ההזמנה אינו תקין");
      }

      project.budget = sum;
      await project.save();

      const order = await Order.create({
        ...data,
        createdBy: user._id,
        createdByName: user.username || user.name || "משתמש"
      });

      await Project.findByIdAndUpdate(
        data.projectId,
        { $push: { orders: order._id } }
      );

      created.push(order);
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
  }

};
