import mongoose from "mongoose";

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
    publicId: { type: String },
    resourceType: { type: String }
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
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
