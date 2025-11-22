import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";

function canViewProject(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(p => String(p.project) === String(projectId));
}

function canEditProject(user, projectId) {
  if (user.role === "admin") return true;

  return user.permissions.some(
    p =>
      String(p.project) === String(projectId) &&
      p.modules?.invoices === "edit"
  );
}

export default {

  async getAllInvoices(user) {
    if (user.role === "admin") {
      return Invoice.find().sort({ createdAt: -1 });
    }

    const allowedProjects = user.permissions.map(p => p.project);

    return Invoice.find({ projectId: { $in: allowedProjects } })
      .sort({ createdAt: -1 });
  },

  async getInvoicesByProject(user, projectId) {
    if (!canViewProject(user, projectId))
      throw new Error("אין לך הרשאה לפרויקט זה");

    return Invoice.find({ projectId }).sort({ createdAt: -1 });
  },

  async getInvoiceById(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return null;

    if (!canViewProject(user, invoice.projectId))
      throw new Error("אין גישה לחשבונית");

    return invoice;
  },

  // ============================
  // ✔ יצירת חשבונית – מעלה remainingBudget מורידה budget
  // ============================
  async createInvoice(user, data) {
    const { projectId, sum } = data;

    if (!canEditProject(user, projectId))
      throw new Error("אין הרשאת עריכה בפרויקט");

    const project = await Project.findById(projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    // 🟧 חשבונית מבטלת את ההזמנה → מחזירה תקציב פנוי
    project.remainingBudget += Number(sum);

    // 🟥 ואז מורידה תקציב אמיתי
    project.budget -= Number(sum);

    await project.save();

    return Invoice.create(data);
  },

  // ============================
  // ✔ עדכון חשבונית – להחזיר הישן, להחיל חדש
  // ============================
  async updateInvoice(user, invoiceId, data) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה לעדכן חשבונית זו");

    const project = await Project.findById(invoice.projectId);

    // 🟧 מחזירים את הנתונים הישנים
    project.remainingBudget -= Number(invoice.sum);
    project.budget += Number(invoice.sum);

    // 🟥 מחילים את החדשים
    project.remainingBudget += Number(data.sum);
    project.budget -= Number(data.sum);

    await project.save();

    Object.assign(invoice, data);
    return invoice.save();
  },

  // ============================
  // ✔ מחיקת חשבונית – לבצע החזרת פעולות
  // ============================
  async deleteInvoice(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה למחוק");

    const project = await Project.findById(invoice.projectId);

    // 🟦 מבטלים השפעת חשבונית
    project.remainingBudget -= Number(invoice.sum);
    project.budget += Number(invoice.sum);

    await project.save();

    await invoice.deleteOne();
    return true;
  },
  async moveInvoice(user, invoiceId, toProjectId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    const fromProjectId = String(invoice.projectId);

    // הרשאות
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      if (!canEditProject(user, fromProjectId)) {
        throw new Error("אין הרשאה להזיז חשבונית מהפרויקט הנוכחי");
      }

      if (!canEditProject(user, toProjectId)) {
        throw new Error("אין הרשאה להעביר לפרויקט היעד");
      }
    }

    // פרויקטים
    const fromProject = await Project.findById(fromProjectId);
    const toProject = await Project.findById(toProjectId);

    if (!toProject) throw new Error("פרויקט היעד לא נמצא");

    const sum = Number(invoice.sum);

    // =============================
    // 🟥 1. ביטול השפעת החשבונית בפרויקט המקורי
    // =============================
    fromProject.remainingBudget -= sum;
    fromProject.budget += sum;

    await fromProject.save();

    // =============================
    // 🟩 2. החלת השפעת החשבונית בפרויקט החדש
    // =============================
    toProject.remainingBudget += sum;
    toProject.budget -= sum;

    await toProject.save();

    // =============================
    // 🟦 3. עדכון החשבונית עצמה
    // =============================
    invoice.projectId = toProjectId;
    invoice.projectName = toProject.name;

    const updated = await invoice.save();
    return updated;
  }

};
