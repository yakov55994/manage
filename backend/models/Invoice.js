import mongoose from "mongoose";
import cloudinary from '../config/cloudinary.js';

// ✔ פרויקט אחד מתוך כמה בחשבונית
const InvoiceProjectSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  projectName: { type: String, required: true },
  sum: { type: Number, required: true },
});

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  folder: { type: String },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },

  // ▶️ סוג חשבונית: רגילה או משכורות
  type: {
    type: String,
    enum: ["invoice", "salary"],
    default: "invoice",
  },

  // ❗ מערך פרויקטים רגילים או פרויקט משכורות
  projects: {
    type: [InvoiceProjectSchema],
    required: true,
  },

  // סכום כולל
  totalAmount: { type: Number, required: true },

  // ▶️ עבור משכורות בלבד
  salaryEmployeeName: { type: String, default: null },
  salaryBaseAmount: { type: Number, default: null },
  salaryOverheadPercent: { type: Number, default: null }, // לדוגמה: 10, 12, 15
  salaryFinalAmount: { type: Number, default: null },

  createdAt: { type: Date, required: false },
  status: { type: String, enum: ['הוגש', 'לא הוגש', 'בעיבוד'], required: false },
  invitingName: { type: String, required: false },
  detail: { type: String, required: false },

  paid: {
    type: String,
    enum: ["כן", "לא"],
    default: "לא",
    required: false
  },
  paymentDate: { type: Date, default: null, required: false },

  files: [FileSchema],

supplierId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Supplier',
  required: function () {
    return this.type !== "salary";
  },
  default: null
},


  documentType: {
    type: String,
    enum: [
      'ח. עסקה',
      'ה. עבודה',
      'ד. תשלום',
      'חשבונית מס / קבלה',
      'משכורות'  // 🆕 חובה כאן!
    ],
    required: true,
  },

  paymentMethod: {
    type: String,
    enum: ["", "check", "bank_transfer"],
    default: "",
  },
  checkNumber: {
    type: String,
    default: null
  },
  checkDate: {
    type: Date,
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdByName: { type: String },

  fundedFromProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    default: null
  },
});

// --------------------------------
// מחיקת קבצים בענן
// --------------------------------
invoiceSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    if (this.files?.length) {
      for (const file of this.files) {
        let publicId = file.publicId || extractPublicIdFromUrl(file.url);

        if (publicId) {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: file.resourceType || 'raw'
          });
        }
      }
    }

    next();
  } catch (err) {
    console.error('❌ שגיאה במחיקת קובץ:', err);
    next(err);
  }
});

function extractPublicIdFromUrl(url) {
  if (!url) return null;
  const matches = url.match(/upload\/(.+?)(\.[a-zA-Z0-9]+)?$/);
  return matches ? matches[1] : null;
}

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
