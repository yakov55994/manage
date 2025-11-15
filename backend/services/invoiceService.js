// services/invoiceService.js
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";

// עוזר ליצירת Date
function toUtc(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
}

const invoiceService = {
  /** ============================
   *   1. חשבוניות לפי פרויקט
   * ============================ */
  async getInvoicesByProject(projectId) {
    return Invoice.find({ projectId }).sort({ createdAt: -1 });
  },

  /** ============================
   *   2. יצירת חשבונית
   * ============================ */
  async createInvoice(projectId, data) {
    const invoice = new Invoice({
      ...data,
      projectId,
      projectName: data.projectName
    });

    await invoice.save();
    return invoice;
  },

  /** ============================
   *   3. שליפה לפי מזהה
   * ============================ */
  async getInvoiceById(projectId, id) {
    return Invoice.findOne({ _id: id, projectId });
  },

  /** ============================
   *   4. עדכון חשבונית
   * ============================ */
  async updateInvoice(projectId, id, data) {
    return Invoice.findOneAndUpdate(
      { _id: id, projectId },
      data,
      { new: true }
    );
  },

  /** ============================
   *   5. מחיקת חשבונית
   * ============================ */
  async deleteInvoice(projectId, id) {
    return Invoice.findOneAndDelete({ _id: id, projectId });
  },

  /** ============================
   *   6. חיפוש בפרויקט
   * ============================ */
  async search(projectId, q) {
    const regex = new RegExp(q, "i");
    return Invoice.find({
      projectId,
      $or: [
        { invoiceNumber: regex },
        { invitingName: regex },
        { detail: regex }
      ]
    });
  },

  /** ========================================
   *   7. עדכון תשלום (סטטוס + תאריך + אמצעי)
   * ======================================== */
  async updatePaymentStatus(projectId, id, { paid, paymentDate, paymentMethod }) {
    return Invoice.findOneAndUpdate(
      { _id: id, projectId },
      {
        paid,
        paymentDate: toUtc(paymentDate),
        paymentMethod
      },
      { new: true }
    );
  },

  /** ========================================
   *   8. עדכון תאריך תשלום בלבד
   * ======================================== */
  async updatePaymentDate(projectId, id, date) {
    return Invoice.findOneAndUpdate(
      { _id: id, projectId },
      { paymentDate: toUtc(date) },
      { new: true }
    );
  },

  /** ========================================
   *   9. העברת חשבונית בין פרויקטים
   * ======================================== */
  async moveInvoice(invoiceId, fromProjectId, toProjectId) {
    const invoice = await Invoice.findOne({ _id: invoiceId, projectId: fromProjectId });
    if (!invoice) throw new Error("חשבונית לא נמצאה בפרויקט המקור");

    // מעדכן את הפרויקט המקורי (מחזיר תקציב)
    await Project.findByIdAndUpdate(
      fromProjectId,
      { 
        $pull: { invoices: invoiceId },
        $inc: { remainingBudget: invoice.sum } 
      }
    );

    // מעדכן את פרויקט היעד (מוריד מהתקציב)
    await Project.findByIdAndUpdate(
      toProjectId,
      { 
        $push: { invoices: invoiceId },
        $inc: { remainingBudget: -invoice.sum } 
      }
    );

    // מעדכן את החשבונית
    invoice.projectId = toProjectId;
    await invoice.save();

    return invoice;
  },

  /** ========================================
   *   10. בדיקת כפילות
   * ======================================== */
  async checkDuplicate(projectId, supplierName, invoiceNumber) {
    return Invoice.findOne({
      projectId,
      invitingName: supplierName,
      invoiceNumber
    });
  },

  /** ========================================
   *   11. חשבוניות לפי ספק
   * ======================================== */
  async getSupplierInvoices(supplierId) {
    return Invoice.find({ supplierId }).sort({ createdAt: -1 });
  },

  /** ========================================
   *   12. מחיקת קובץ ב-Cloudinary
   * ======================================== */
  async deleteFile(publicId, resourceType = "raw", cloudinary) {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
};

export default invoiceService;
