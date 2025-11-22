// services/invoiceService.js
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";

function canViewProject(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(
    (p) => String(p.project) === String(projectId)
  );
}

function canEditProject(user, projectId) {
  if (user.role === "admin") return true;

  return user.permissions.some(
    (p) =>
      String(p.project) === String(projectId) &&
      p.modules?.invoices === "edit"
  );
}

export default {
  // 🔎 חיפוש
  async searchInvoices(query) {
    const regex = new RegExp(query, "i");

    return Invoice.find({
      $or: [
        { invoiceNumber: regex },
        { projectName: regex },
        { invitingName: regex },
        { detail: regex },
        { status: regex },
      ],
    }).limit(50);
  },

  // כל החשבוניות לפי הרשאות
  async getAllInvoices(user) {
    if (user.role === "admin") {
      return Invoice.find().sort({ createdAt: -1 });
    }

    const allowedProjects = user.permissions.map((p) => p.project);

    return Invoice.find({ projectId: { $in: allowedProjects } }).sort({
      createdAt: -1,
    });
  },

  // לפי פרויקט
  async getInvoicesByProject(user, projectId) {
    if (!canViewProject(user, projectId))
      throw new Error("אין לך הרשאה לפרויקט זה");

    return Invoice.find({ projectId }).sort({ createdAt: -1 });
  },

  // לפי ID
  async getInvoiceById(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return null;

    if (!canViewProject(user, invoice.projectId))
      throw new Error("אין גישה לחשבונית");

    return invoice;
  },

    async checkDuplicate(user, query) {
      const { projectId, supplierId, invoiceNumber } = query;
  
      if (!projectId || !supplierId || !invoiceNumber) return false;
  
      return Invoice.findOne({
        projectId,
        supplierId,
        invoiceNumber,
      });
    },
  
  // יצירת חשבונית — מורידה תקציב!
  async createInvoice(user, data) {
    const { projectId, sum } = data;

    if (!canEditProject(user, projectId))
      throw new Error("אין הרשאת עריכה בפרויקט");

    const project = await Project.findById(projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    // ✔ חשבונית מורידה תקציב
    project.remainingBudget -= Number(sum);
    await project.save();

    return Invoice.create(data);
  },

  // bulk
  async createBulkInvoices(user, invoices) {
    const created = [];
    for (const data of invoices) {
      const invoice = await this.createInvoice(user, data);
      created.push(invoice);
    }
    return created;
  },

  // עדכון חשבונית
  async updateInvoice(user, invoiceId, data) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה לעדכן חשבונית זו");

    const project = await Project.findById(invoice.projectId);

    // ✔ להחזיר השפעת הישן = להוסיף אותו חזרה
    project.remainingBudget += Number(invoice.sum);

    // ✔ להחיל חדש = להוריד את החדש
    project.remainingBudget -= Number(data.sum);

    await project.save();

    Object.assign(invoice, data);
    return invoice.save();
  },

  // מחיקה
  async deleteInvoice(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה למחוק");

    const project = await Project.findById(invoice.projectId);

    // ✔ מחיקת חשבונית = להחזיר את מה שהורידה
    project.remainingBudget += Number(invoice.sum);

    await project.save();
    await invoice.deleteOne();

    return true;
  },

  // העברת חשבונית בין פרויקטים
  async moveInvoice(user, invoiceId, toProjectId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    const fromProjectId = String(invoice.projectId);

    const isAdmin = user.role === "admin";

    // הרשאות
    if (!isAdmin) {
      if (!canEditProject(user, fromProjectId)) {
        throw new Error("אין הרשאה להזיז חשבונית מהפרויקט הנוכחי");
      }

      if (!canEditProject(user, toProjectId)) {
        throw new Error("אין הרשאה להעביר לפרויקט היעד");
      }
    }

    const fromProject = await Project.findById(fromProjectId);
    const toProject = await Project.findById(toProjectId);
    if (!toProject) throw new Error("פרויקט היעד לא נמצא");

    const sum = Number(invoice.sum);

    // לבטל השפעה ישנה
    fromProject.remainingBudget += sum;

    // להפעיל השפעה חדשה
    toProject.remainingBudget -= sum;

    await fromProject.save();
    await toProject.save();

    invoice.projectId = toProjectId;
    invoice.projectName = toProject.name;

    return invoice.save();
  },

  // עדכון סטטוס תשלום
  async updatePaymentStatus(user, invoiceId, data) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה לעדכן סטטוס תשלום");

    Object.assign(invoice, data);
    return invoice.save();
  },
};
