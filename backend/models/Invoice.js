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
  // ✅ עבור פרויקטי מילגה - מאיזה פרויקט/ים להוריד את התקציב
  fundedFromProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    default: null,
  },
  fundedFromProjectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  }],
});

// היסטוריית עריכות
const EditHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true },
  action: {
    type: String,
    enum: ['created', 'updated', 'payment_status_changed', 'moved', 'files_added', 'status_changed'],
    required: true
  },
  changes: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  folder: { type: String },
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },
  documentType: { type: String, default: "" },
  documentNumber: { type: String, default: "" },
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
  salaryDepartment: { type: String, default: null }, // מחלקה - לא חובה

  // 📅 תאריך החשבונית (מה שהמשתמש ממלא)
  invoiceDate: { type: Date, required: false },

  status: { type: String, enum: ['הוגש', 'לא הוגש', 'בעיבוד'], default: 'לא הוגש', required: false },

  // ✅ פרויקט שאליו הוגשה החשבונית (אם הוגשה)
  submittedToProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    default: null
  },
  submittedAt: { type: Date, default: null }, // תאריך ההגשה

  invitingName: { type: String, required: false },
  detail: { type: String, required: false },

  paid: {
    type: String,
    enum: ["כן", "לא", "יצא לתשלום", "לא לתשלום"],
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
      'משכורות',
      'אין צורך'  // 🆕 סטטוס הושלם
    ],
    required: true,
  },

  paymentMethod: {
    type: String,
    enum: ["", "check", "bank_transfer", "credit_card"],
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

  // ✅ תמיכה הן בגרסה ישנה (יחיד) והן בגרסה חדשה (מרובה)
  fundedFromProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    default: null
  },
  fundedFromProjectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  }],

  // הערות פנימיות – לשימוש המשרד בלבד (לא מוצג בכרטסת/ייצוא)
  internalNotes: { type: String, default: "" },

  // היסטוריית עריכות
  editHistory: [EditHistorySchema],
}, {
  timestamps: true  // Mongoose will automatically manage createdAt and updatedAt
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
