// services/projectService.js
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";

export default {

  async searchProjects (query) {
  const regex = new RegExp(query, "i");

  return Project.find({
    $or: [
      { name: regex },
      { invitingName: regex },
      { Contact_person: regex },
    ],
  }).limit(50);
},


  async getAllProjects(user) {
  let query = {};

  if (user.role !== "admin") {
    const allowed = user.permissions.map(p =>
      p.project?._id?.toString() || p.project.toString()
    );
    query = { _id: { $in: allowed } };
  }

  const projects = await Project.find(query)
    .populate({
      path: "invoices",
      model: "Invoice",
      select: "invoiceNumber projectName sum status invitingName detail paid paymentDate documentType paymentMethod files file supplierId",
      populate: { path: "supplierId", select: "name" }
    })
    .populate({
      path: "orders",
      model: "Order",
      select: "orderNumber sum status paid paymentDate files file supplierId",
      populate: { path: "supplierId", select: "name" }
    });

  // 🔍 דיבוג
  console.log('🔥 Project "ניסיון":', projects.find(p => p.name === 'ניסיון'));
  
  return projects;
},
  async getProjectById(user, projectId) {

  // הרשאות
  if (user.role !== "admin") {
    const allowedProjectIds = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );

    if (!allowedProjectIds.includes(String(projectId))) {
      throw new Error("אין הרשאה לפרויקט זה");
    }
  }

  // טעינת פרויקט עם כל ה-populates
  const project = await Project.findById(projectId)
    .populate({
      path: "invoices",
      model: "Invoice",
      select:
        "invoiceNumber projectName sum status invitingName detail paid paymentDate documentType paymentMethod files supplierId",
      populate: { path: "supplierId", select: "name" }
    })
    .populate({
      path: "orders",
      model: "Order",
      select: "orderNumber sum status paid paymentDate supplierId",
      populate: { path: "supplierId", select: "name" }
    });

  return project;
}
,

  async createBulkInvoices(user, projectId, invoicesData) {
    const results = [];

    for (const inv of invoicesData) {
      inv.projectId = projectId;
      const created = await invoiceService.createInvoice(user, inv);
      results.push(created);
    }

    return results;
  },
async createProject(user, data) {
  if (user.role !== "admin")
    throw new Error("רק מנהל יכול ליצור פרויקט");

  // ✅ וידוא שיש תקציב
  const projectData = {
    ...data,
    budget: data.budget || 0, // ברירת מחדל 0 אם לא נשלח
    remainingBudget: data.budget || 0,
    createdBy: user._id,
    createdByName: user.username || user.name || 'משתמש'
  };

  return Project.create(projectData);
},

  async updateProject(user, projectId, data) {
  const project = await Project.findById(projectId);
  if (!project) throw new Error("פרויקט לא נמצא");

  // אם משנים את השם - לעדכן בכל המקומות
  if (data.name && data.name !== project.name) {
    // עדכון projectName בכל ההזמנות
    await Order.updateMany(
      { projectId: projectId },
      { $set: { projectName: data.name } }
    );

    // עדכון projectName בכל החשבוניות
    await Invoice.updateMany(
      { projectId: projectId },
      { $set: { projectName: data.name } }
    );
  }

  // עדכון הפרויקט עצמו
  return Project.findByIdAndUpdate(projectId, data, { new: true });
},

async deleteProject(user, projectId) {
  if (user.role !== "admin")
    throw new Error("אין הרשאה");

  const project = await Project.findById(projectId);
  if (!project) throw new Error("פרויקט לא נמצא");

  // השתמש ב-deleteOne במקום findByIdAndDelete כדי להפעיל את ה-middleware
  // ה-middleware בפרויקט כבר דואג למחיקת החשבוניות וההזמנות
  await project.deleteOne();

  return project;
}
};
