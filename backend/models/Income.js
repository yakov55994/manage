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

  // האם זוכה לאחר שיוך להזמנה
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

  // תאריך יצירה
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Income = mongoose.model("Income", incomeSchema);

export default Income;
