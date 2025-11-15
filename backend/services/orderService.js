import mongoose from "mongoose";
import Order from "../models/Order.js";
import Project from "../models/Project.js";

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.map(f => ({
    name: f.name || f.fileName || "",
    url: f.url || f.fileUrl || "",
    type: f.type || f.fileType || "",
    size: f.size || 0,
    publicId: f.publicId || "",
    resourceType: f.resourceType || ""
  }));
}

const orderService = {
  // 📌 כל ההזמנות בפרויקט
  async getOrdersByProject(projectId) {
    return Order.find({ projectId }).sort({ createdAt: -1 });
  },

  // 📌 הזמנה בודדת
  async getOrderById(projectId, id) {
    return Order.findOne({ _id: id, projectId });
  },

  // ➕ יצירת הזמנה אחת (אצלך אתה יוצר רק אחת כל פעם)
  async createOrder(projectId, data) {
    if (!projectId) throw new Error("projectId is required");

    // בדיקת כפילות במספר הזמנה בפרויקט
    const exists = await Order.findOne({
      orderNumber: data.orderNumber,
      projectId
    });

    if (exists) {
      throw new Error(`הזמנה מספר ${data.orderNumber} כבר קיימת בפרויקט זה`);
    }

    const newOrder = await Order.create({
      ...data,
      projectId,
      files: normalizeFiles(data.files)
    });

    // עדכון פרויקט
    await Project.findByIdAndUpdate(
      projectId,
      {
        $push: { orders: newOrder._id },
        $inc: { remainingBudget: -Number(newOrder.sum || 0) }
      },
      { new: true }
    );

    return newOrder;
  },

  // ✏️ עדכון הזמנה
  async updateOrder(projectId, id, data) {
    if (data.files) data.files = normalizeFiles(data.files);

    return Order.findOneAndUpdate(
      { _id: id, projectId },
      data,
      { new: true, runValidators: true }
    );
  },

  // 🗑️ מחיקה + עדכון תקציב בפרויקט
  async deleteOrder(projectId, id) {
    const order = await Order.findOne({ _id: id, projectId });
    if (!order) return null;

    await Project.findByIdAndUpdate(
      projectId,
      {
        $pull: { orders: order._id },
        $inc: { remainingBudget: Number(order.sum || 0) }
      }
    );

    await Order.deleteOne({ _id: id });

    return order;
  },

  // 🔎 חיפוש בפרויקט
  async search(projectId, q) {
    const filter = { projectId };

    if (q) {
      const or = [
        { invitingName: { $regex: q, $options: "i" } },
        { detail: { $regex: q, $options: "i" } },
        { projectName: { $regex: q, $options: "i" } }
      ];

      if (!isNaN(q)) {
        or.push({ orderNumber: Number(q) });
        or.push({ sum: Number(q) });
      }

      filter.$or = or;
    }

    return Order.find(filter).sort({ createdAt: -1 });
  }
};

export default orderService;
