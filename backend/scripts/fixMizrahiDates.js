import mongoose from "mongoose";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/manage";

async function swapDayMonth(date) {
  const d = new Date(date);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1; // 1-based

  // אם יום וחודש זהים, אין מה להחליף
  if (day === month) return null;

  // בדוק שהחלפה תיצור תאריך תקין (לדוגמה: אי אפשר לשים יום 13 כחודש)
  if (day > 12) return null; // אי אפשר שיום גדול מ-12 יהפוך לחודש

  const year = d.getUTCFullYear();
  const newDate = new Date(Date.UTC(year, day - 1, month)); // day הופך לחודש, month הופך ליום
  return newDate;
}

async function fixMizrahiDates() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ מחובר ל-MongoDB");

  let incomeFixed = 0;
  let incomeSkipped = 0;
  let expenseFixed = 0;
  let expenseSkipped = 0;

  // תיקון הכנסות
  const incomes = await Income.find({ bank: "mizrahi" });
  console.log(`\n📋 נמצאו ${incomes.length} הכנסות של מזרחי`);

  for (const income of incomes) {
    const newDate = await swapDayMonth(income.date);
    if (!newDate) {
      console.log(`  ⏭️  דולג: ${income.date.toISOString().split("T")[0]} (לא ניתן להחליף)`);
      incomeSkipped++;
      continue;
    }
    const oldStr = income.date.toISOString().split("T")[0];
    const newStr = newDate.toISOString().split("T")[0];
    console.log(`  ✏️  הכנסה ${income._id}: ${oldStr} → ${newStr}`);
    await Income.findByIdAndUpdate(income._id, { date: newDate });
    incomeFixed++;
  }

  // תיקון הוצאות
  const expenses = await Expense.find({ bank: "mizrahi" });
  console.log(`\n📋 נמצאו ${expenses.length} הוצאות של מזרחי`);

  for (const expense of expenses) {
    const newDate = await swapDayMonth(expense.date);
    if (!newDate) {
      console.log(`  ⏭️  דולג: ${expense.date.toISOString().split("T")[0]} (לא ניתן להחליף)`);
      expenseSkipped++;
      continue;
    }
    const oldStr = expense.date.toISOString().split("T")[0];
    const newStr = newDate.toISOString().split("T")[0];
    console.log(`  ✏️  הוצאה ${expense._id}: ${oldStr} → ${newStr}`);
    await Expense.findByIdAndUpdate(expense._id, { date: newDate });
    expenseFixed++;
  }

  console.log(`\n🎉 סיום:`);
  console.log(`  הכנסות: תוקנו ${incomeFixed}, דולגו ${incomeSkipped}`);
  console.log(`  הוצאות: תוקנו ${expenseFixed}, דולגו ${expenseSkipped}`);

  await mongoose.disconnect();
}

fixMizrahiDates().catch((e) => {
  console.error("❌ שגיאה:", e);
  process.exit(1);
});
