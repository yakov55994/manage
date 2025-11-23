import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";

export default {

  // 🔍 חיפוש
  async searchInvoices(query) {
    const regex = new RegExp(query, "i");

    return Invoice.find({
      $or: [
        { invoiceNumber: regex },
        { projectName: regex },
        { invitingName: regex },
        { detail: regex },
        { status: regex }
      ],
    }).limit(50);
  },

  // ✔ כל החשבוניות לפי הרשאות
  async getInvoices(user) {
    let query = {};

    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      query = { projectId: { $in: allowed } };
    }

    return Invoice.find(query)
      .populate("supplierId", "name")
      .populate("projectId", "name");
  },

  // ✔ בדיקת כפילות
  async checkDuplicate({ invoiceNumber, supplierId }) {
    return Invoice.findOne({ invoiceNumber, supplierId });
  },

  // ✔ חשבונית לפי ID — עם הרשאות + populate
  async getInvoiceById(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate({ path: "supplierId", select: "name phone email" })
      .populate({ path: "projectId", select: "name budget remainingBudget invitingName" });

    if (!invoice) return null;

    // בדיקת הרשאות
    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );

      if (!allowed.includes(String(invoice.projectId._id))) {
        throw new Error("אין הרשאה לצפות בחשבונית זו");
      }
    }

    return invoice;
  },

  // ➕ יצירה
  async createInvoice(user, data) {

    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      if (!allowed.includes(String(data.projectId))) {
        throw new Error("אין הרשאה להוסיף חשבונית לפרויקט זה");
      }
    }

    const project = await Project.findById(data.projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    return Invoice.create(data);
  },

  // ✏️ עדכון חשבונית
  async updateInvoice(user, invoiceId, data) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    // הרשאות
    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );

      if (!allowed.includes(String(invoice.projectId))) {
        throw new Error("אין הרשאה לערוך חשבונית זו");
      }
    }

    return Invoice.findByIdAndUpdate(invoiceId, data, { new: true });
  },

  // 💸 עדכון סטטוס תשלום
  async updatePaymentStatus(user, invoiceId, status, paymentDate) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    return Invoice.findByIdAndUpdate(
      invoiceId,
      { paid: status, paymentDate },
      { new: true }
    );
  },

  // 🔄 העברה בין פרויקטים
  async moveInvoice(user, invoiceId, newProjectId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    return Invoice.findByIdAndUpdate(
      invoiceId,
      { projectId: newProjectId },
      { new: true }
    );
  },

  // 🗑️ מחיקה
  async deleteInvoice(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    return Invoice.findByIdAndDelete(invoiceId);
  }
};
