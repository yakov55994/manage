// services/invoiceService.js
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";

function canViewProject(user, projectId) {
  if (user.role === "admin") return true;

  return user.permissions.some(p => String(p.project) === String(projectId));
}

function canEditProject(user, projectId) {
  if (user.role === "admin") return true;

  return user.permissions.some(p =>
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

  async createBulkInvoices(user, invoicesData) {

  const results = [];

  for (const inv of invoicesData) {
    const created = await this.createInvoice(user, inv);
    results.push(created);
  }

  return results;
},

  async createInvoice(user, body) {
    if (!canEditProject(user, body.projectId))
      throw new Error("אין הרשאת עריכה בפרויקט");

    return Invoice.create(body);
  },

  async updateInvoice(user, invoiceId, body) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה לערוך חשבונית זו");

    Object.assign(invoice, body);
    return invoice.save();
  },

  async deleteInvoice(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה למחוק");

    await invoice.deleteOne();
    return true;
  },

  async updatePaymentStatus(user, invoiceId, data) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("לא נמצא");

    if (!canEditProject(user, invoice.projectId))
      throw new Error("אין הרשאה לעדכן סטטוס");

    invoice.paid = data.paid;
    invoice.paymentDate = data.paymentDate || null;
    invoice.paymentMethod = data.paymentMethod || "";

    return invoice.save();
  },

async moveInvoice(user, invoiceId, toProjectId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  const fromProjectId = String(invoice.projectId);

  const isAdmin = user.role === "admin";

  if (!isAdmin) {
    if (!canEditProject(user, fromProjectId)) {
      throw new Error("אין הרשאה להזיז חשבונית מהפרויקט הנוכחי");
    }

    if (!canEditProject(user, toProjectId)) {
      throw new Error("אין הרשאה להעביר לפרויקט היעד");
    }
  }

  // בדיקת פרויקט יעד
  const targetProject = await Project.findById(toProjectId);
  if (!targetProject) throw new Error("פרויקט היעד לא נמצא");

  // עדכון שדות החשבונית
  invoice.projectId = toProjectId;
  invoice.projectName = targetProject.name; // 🔥 חובה!!

  const updated = await invoice.save();
  return updated;
},
async checkDuplicate(user, query) {
  const { invoiceNumber, supplierId } = query;

  if (!invoiceNumber || !supplierId)
    throw new Error("Missing invoiceNumber or supplierId");

  // אם המשתמש Admin → לבדוק בכל המערכת
  if (user.role === "admin") {
    return Invoice.findOne({
      invoiceNumber,
      supplierId,
    });
  }

  // משתמש רגיל → מותר לבדוק רק בפרויקטים שלו
  const allowedProjectIds = user.permissions.map(p => p.project);

  return Invoice.findOne({
    invoiceNumber,
    supplierId,
    projectId: { $in: allowedProjectIds }
  });
}

};
