import Order from "../models/Order.js";
import Project from "../models/Project.js";



export default {


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

  async getOrders(user) {
    let query = {};

    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      query = { projectId: { $in: allowed } };
    }

    return Order.find(query)
      .populate("supplierId", "name")
      .populate("projectId", "name");
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
async createBulkOrders(user, orders) {
  const normalizeId = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val._id) return String(val._id);
    return String(val);
  };

  const created = [];

  for (const data of orders) {
    // 🔐 הרשאות
    if (user.role !== "admin") {
      if (!user.permissions || !Array.isArray(user.permissions)) {
        throw new Error("למשתמש אין הרשאות מוגדרות");
      }

      const allowed = user.permissions.map(
        (p) => normalizeId(p.project)
      );

      const userProjectId = normalizeId(data.projectId);

      if (!allowed.includes(userProjectId)) {
        throw new Error(`אין הרשאה לפרויקט ${userProjectId}`);
      }
    }

    // 📌 שליפת הפרויקט
    const project = await Project.findById(data.projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    // 📌 סכום
    const sum = Number(data.sum);
    if (isNaN(sum) || sum <= 0) {
      throw new Error("סכום ההזמנה אינו תקין");
    }

    // 📌 ודא שתקציב מוגדר
    project.remainingBudget = Number(project.remainingBudget || 0);

    // 📌 הוסף סכום ההזמנה לתקציב הנותר
    project.remainingBudget += sum;

    await project.save();

    // ✅ הוספת פרטי המשתמש שיצר
    const orderData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || 'משתמש'
    };

    // 📌 יצירת ההזמנה
    const order = await Order.create(orderData);
    created.push(order);
  }

  return created;
},

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

    // 🔺 הוספת סכום ההזמנה לתקציב הנותר
    // ודא שסכום קיים
    const sum = Number(data.sum);
    if (isNaN(sum)) throw new Error("סכום ההזמנה אינו תקין");

    // ודא שתקציב מוגדר
    project.remainingBudget = Number(project.remainingBudget || 0);

    // הוסף סכום להזמנה
    project.remainingBudget = project.remainingBudget + sum;

    await project.save();

    return Order.create(data);

  },

  async updateOrder(user, orderId, data) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    const project = await Project.findById(order.projectId);

    const oldSum = Number(order.sum);
    const newSum = Number(data.sum ?? order.sum);
    const diff = newSum - oldSum;

    // 🔺 אם diff חיובי — להוסיף / אם שלילי — להוריד (כלומר מבטל)
    project.remainingBudget += diff;
    await project.save();

    return Order.findByIdAndUpdate(orderId, data, { new: true });
  },

  async updatePaymentStatus(user, orderId, status, paymentDate) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    return Order.findByIdAndUpdate(
      orderId,
      { paid: status, paymentDate },
      { new: true }
    );
  },

  async deleteOrder(user, orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("הזמנה לא נמצאה");

    const project = await Project.findById(order.projectId);
    project.remainingBudget -= Number(order.sum); // מבטל את התוספת
    await project.save();

    return Order.findByIdAndDelete(orderId);
  }

};
