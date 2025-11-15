// services/projectService.js
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const projectService = {
  // ➕ יצירת פרויקט חדש
  async createProject(data) {
    try {
      const clean = {
        name: String(data.name || "").trim(),
        budget: Number(data.budget || 0),
        remainingBudget: Number(data.budget || 0),
        invitingName: data.invitingName || "",
        Contact_person: data.Contact_person || "",
        usersPermissions: data.usersPermissions || [],
      };

      const exists = await Project.findOne({ name: clean.name });
      if (exists) {
        throw new Error(`פרויקט בשם "${clean.name}" כבר קיים`);
      }

      const project = new Project(clean);
      await project.save();
      return project;
    } catch (err) {
      throw new Error(err.message || "שגיאה ביצירת פרויקט");
    }
  },

  // 📃 שליפת כל הפרויקטים לפי הרשאות המידלוור
  async getAllProjects(filter = {}) {
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return projects;
  },

  // 📄 שליפת פרויקט לפי ID כולל חשבוניות + הזמנות + ספקים
  async getProjectById(projectId) {
    if (!isValidId(projectId)) throw new Error("ID לא תקין");

    const project = await Project.findById(projectId).lean();
    if (!project) return null;

    const [invoices, orders] = await Promise.all([
      Invoice.find({ projectId })
        .populate({ path: "supplierId", select: "name phone bankDetails" })
        .sort({ createdAt: -1 })
        .lean(),
      Order.find({ projectId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return {
      ...project,
      invoices,
      orders,
    };
  },

  // ✏️ עדכון פרויקט
  async updateProject(projectId, data = {}) {
    if (!isValidId(projectId)) throw new Error("ID לא תקין");

    const forbidden = ["_id", "createdAt", "updatedAt"];
    forbidden.forEach((f) => delete data[f]);

    const updated = await Project.findByIdAndUpdate(
      projectId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    return updated;
  },

  // 🗑️ מחיקת פרויקט כולל כל מה שמשויך אליו
  async deleteProjectById(projectId) {
    if (!isValidId(projectId)) throw new Error("ID לא תקין");

    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const project = await Project.findById(projectId).session(session);
      if (!project) throw new Error("פרויקט לא נמצא");

      await Invoice.deleteMany({ projectId }).session(session);
      await Order.deleteMany({ projectId }).session(session);

      await Project.findByIdAndDelete(projectId).session(session);
    });

    session.endSession();
    return { message: "הפרויקט נמחק בהצלחה" };
  },

  // 🔎 חיפוש לפי שם
  async search(query) {
    const regex = new RegExp(String(query).trim(), "i");

    return Project.find({ name: { $regex: regex } })
      .sort({ createdAt: -1 })
      .lean();
  },

  // 📦 הזמנות לפי Project
  async getOrdersByProjectId(projectId) {
    if (!isValidId(projectId)) throw new Error("ID לא תקין");

    return Order.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();
  },

  // 💵 חשבוניות לפי Project
  async getInvoicesByProjectId(projectId) {
    if (!isValidId(projectId)) throw new Error("ID לא תקין");

    return Invoice.find({ projectId })
      .populate({ path: "supplierId", select: "name phone bankDetails" })
      .sort({ createdAt: -1 })
      .lean();
  },
};

export default projectService;
