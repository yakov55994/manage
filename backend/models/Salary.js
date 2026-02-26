// models/Salary.js
import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  // הפרויקט שממנו יורד התקציב (לא פרויקט משכורות!)
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },

  employeeName: { type: String, required: true },
  department: { type: String, default: null }, // מחלקה - אופציונלי

  baseAmount: { type: Number, required: true },
  netAmount: { type: Number, default: null }, // נטו - הסכום שמשוייך לתנועות בנק
  overheadPercent: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },

  date: { type: Date, default: Date.now },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdByName: String
});

export default mongoose.model("Salary", salarySchema);
