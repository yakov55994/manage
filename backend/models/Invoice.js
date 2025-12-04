import mongoose from "mongoose";
import cloudinary from '../config/cloudinary.js';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  projectName: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  sum: { type: Number, required: true },
  createdAt: { type: Date, required: true },
  status: { type: String, enum: ['הוגש', 'לא הוגש', 'בעיבוד'], required: true },
  invitingName: { type: String, required: true },
  detail: { type: String },
  paid: {
    type: String,
    enum: ["כן", "לא"],
    default: "לא"
  },
  paymentDate: { type: Date, default: null },

  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, required: false },
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    publicId: { type: String, required: true },    // ← חובה!
    resourceType: { type: String, required: true }, // ← חובה!
  }],
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false // אופציונלי לחשבוניות ישנות
  },
  documentType: {
    type: String,
    enum: [
      'ח. עסקה',
      'ה. עבודה',
      'ד. תשלום',
      'חשבונית מס / קבלה'
    ],
    required: true, // אם אתה רוצה לחייב בחירה
  },
  paymentMethod: {
    type: String,
    enum: ["", "check", "bank_transfer"],
    default: "",
  },
  // ✅ הוספה חדשה
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdByName: {
    type: String,
    required: false
  }
});

invoiceSchema.pre('deleteOne', { document: true, query: false }, async function (next) {

  try {
    if (this.files && this.files.length > 0) {
      for (const file of this.files) {
        // ✅ חלץ publicId מה-URL אם לא קיים
        let publicId = file.publicId;

        if (!publicId && file.url) {
          publicId = extractPublicIdFromUrl(file.url);
        }


        if (publicId) {
          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: file.resourceType || 'raw'
          });
        } else {
        }
      }
    }
    next();
  } catch (err) {
    console.error('❌ שגיאה:', err);
    next(err);
  }
});

// פונקציה עזר לחילוץ publicId מ-URL של Cloudinary
function extractPublicIdFromUrl(url) {
  try {
    // URL לדוגמה: https://res.cloudinary.com/dbbivwbbt/raw/upload/v1764535273/invoices/vvzkducxoyn32oyulyq7.pdf

    // ✅ גרסה מתוקנת - כוללת את הסיומת
    const regex = /\/upload\/(?:v\d+\/)?(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null; // יחזיר: "invoices/vvzkducxoyn32oyulyq7.pdf"
  } catch (err) {
    console.error('שגיאה בחילוץ publicId:', err);
    return null;
  }
}

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
