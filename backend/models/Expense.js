import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  // תאריך ההוצאה
  date: {
    type: Date,
    required: true,
  },

  // סכום ההוצאה (חובה)
  amount: {
    type: String,
    required: true,
  },

  // תיאור ההוצאה
  description: {
    type: String,
    required: true,
  },

  // הערות (אופציונלי)
  notes: {
    type: String,
    default: "",
  },

  // אסמכתא (אופציונלי)
  reference: {
    type: String,
    default: "",
  },

  // סוג פעולה (אופציונלי)
  transactionType: {
    type: String,
    default: "",
  },

  // יתרה (אופציונלי)
  balance: {
    type: String,
    default: "",
  },

  // ערך (אופציונלי)
  value: {
    type: String,
    default: "",
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

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
