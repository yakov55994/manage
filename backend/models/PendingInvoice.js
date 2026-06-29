import mongoose from "mongoose";
import cloudinary from '../config/cloudinary.js';

const PendingInvoiceFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
}, { _id: false });

const pendingInvoiceSchema = new mongoose.Schema({
  // פרטי ספק
  supplierName: { type: String, required: true },
  supplierTaxId: { type: String, required: true },
  supplierAddress: { type: String, default: "" },
  supplierPhone: { type: String, default: "" },
  supplierEmail: { type: String, default: "" },

  // פרטי בנק
  bankName: { type: String, default: "" },
  bankBranch: { type: String, default: "" },
  bankAccount: { type: String, default: "" },

  // פרטי חשבונית
  invoiceNumber: { type: String, required: true },
  invoiceDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  documentType: {
    type: String,
    enum: ['ח. עסקה', 'ה. עבודה', 'ד. תשלום', 'חשבונית מס / קבלה'],
    required: true,
  },
  detail: { type: String, default: "" },

  // קובץ מצורף
  file: { type: PendingInvoiceFileSchema, default: null },

  // סטטוס אישור
  status: {
    type: String,
    enum: ["ממתין לאישור", "לא מאושר"],
    default: "ממתין לאישור",
  },
  rejectionNotes: { type: String, default: "" },
}, {
  timestamps: true,
});

// מחיקת קובץ מ-Cloudinary כשמוחקים חשבונית ממתינה דרך document.deleteOne()
pendingInvoiceSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    if (this.file?.publicId) {
      await cloudinary.uploader.destroy(this.file.publicId, {
        resource_type: this.file.resourceType || 'raw'
      });
    }
    next();
  } catch (err) {
    console.error('❌ שגיאה במחיקת קובץ חשבונית ממתינה:', err);
    next(err);
  }
});

export default mongoose.model("PendingInvoice", pendingInvoiceSchema);
