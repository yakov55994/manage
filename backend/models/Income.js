import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema({
  // תאריך ההכנסה
  date: {
    type: Date,
    required: true,
  },

  // סכום ההכנסה (זכות)
  amount: {
    type: String,
    required: true,
  },

  // תיאור ההכנסה
  description: {
    type: String,
    required: true,
  },

  // הערות (אופציונלי)
  notes: {
    type: String,
    default: "",
  },

  // הזמנה משויכת (אופציונלי)
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
  },
  orderNumber: {
    type: Number,
    default: null,
  },

  // חשבונית משויכת (אופציונלי)
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    default: null,
  },

  // שיוך לחשבוניות (מרובה)
  linkedInvoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
  }],

  // שיוך למשכורות (מרובה)
  linkedSalaries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Salary",
  }],

  // שיוך להזמנות (מרובה)
  linkedOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  }],

  // ספק/לקוח משויך (אופציונלי)
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    default: null,
  },

  // הכנסה אחרת משויכת (אופציונלי)
  linkedIncomeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Income",
    default: null,
  },

  // סוג השיוך
  linkType: {
    type: String,
    enum: ["none", "order", "invoice", "supplier", "income"],
    default: "none",
  },

  // האם שויך (כן/לא)
  isCredited: {
    type: String,
    enum: ["כן", "לא"],
    default: "לא",
  },

  // מי יצר
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdByName: {
    type: String,
    required: true,
  },
}, {
  timestamps: true  // Mongoose will automatically manage createdAt and updatedAt
});

const Income = mongoose.model("Income", incomeSchema);

export default Income;
