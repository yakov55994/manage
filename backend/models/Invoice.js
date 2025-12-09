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
  sum: { type: Number, required: true }, // שינוי!!
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

  // ❗ במקום projectId בודד → מערך פרויקטים
  projects: {
    type: [InvoiceProjectSchema],
    required: true,
  },

  // סכום כולל (מחושב)
  totalAmount: { type: Number, required: true },

  createdAt: { type: Date, required: true },
  status: { type: String, enum: ['הוגש', 'לא הוגש', 'בעיבוד'], required: true },
  invitingName: { type: String, required: false },
  detail: { type: String },

  paid: {
    type: String,
    enum: ["כן", "לא"],
    default: "לא"
  },
  paymentDate: { type: Date, default: null },

  files: [FileSchema],

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false
  },

  documentType: {
    type: String,
    enum: [
      'ח. עסקה',
      'ה. עבודה',
      'ד. תשלום',
      'חשבונית מס / קבלה'
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


invoiceSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    if (this.files?.length) {
      for (const file of this.files) {
        // תמיד קודם ניקח את מה שיש בבסיס הנתונים
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