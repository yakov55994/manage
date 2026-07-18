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
  // שם ממלא הטופס (יוכנס כ"שם המזמין" בחשבונית שתיווצר)
  submitterName: { type: String, required: true },
  submitterPhone: { type: String, default: "" },
  submitterEmail: { type: String, default: "" },

  // פרטי ספק
  supplierName: { type: String, required: true },
  supplierTaxId: { type: String, required: true },
  supplierAddress: { type: String, default: "" },
  supplierPhone: { type: String, default: "" },
  supplierEmail: { type: String, default: "" },

  // פרטי בנק (חובה)
  bankName: { type: String, required: true },
  bankBranch: { type: String, required: true },
  bankAccount: { type: String, required: true },

  // פרויקט משויך (אופציונלי)
  projectId: { type: String, default: null },
  projectName: { type: String, default: "" },

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

  // קבצים מצורפים
  files: { type: [PendingInvoiceFileSchema], default: [] },

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
    for (const file of this.files || []) {
      if (file?.publicId) {
        await cloudinary.uploader.destroy(file.publicId, {
          resource_type: file.resourceType || 'raw'
        });
      }
    }
    next();
  } catch (err) {
    console.error('❌ שגיאה במחיקת קבצי חשבונית ממתינה:', err);
    next(err);
  }
});

export default mongoose.model("PendingInvoice", pendingInvoiceSchema);
