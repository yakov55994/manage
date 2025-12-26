import mongoose from "mongoose";
import xlsx from "xlsx";
import dotenv from "dotenv";
import Supplier from "./models/Supplier.js";

dotenv.config();

const BANK_CODE_TO_NAME = {
  10: "בנק לאומי לישראל בע\"מ",
  11: "בנק דיסקונט לישראל בע\"מ",
  12: "בנק הפועלים בע\"מ",
  13: "בנק אגוד לישראל בע\"מ",
  14: "בנק אוצר החייל בע\"מ",
  17: "בנק מרכנתיל דיסקונט בע\"מ",
  20: "בנק מזרחי טפחות בע\"מ",
  52: "בנק פועלי אגודת ישראל בע\"מ"
};

await mongoose.connect(process.env.MONGO_URL);
console.log("✅ MongoDB connected");

const workbook = xlsx.readFile("./ספקים.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

let inserted = 0;
let skipped = 0;

for (const row of rows) {
  const businessTax = row["זהות"];
  if (!businessTax) {
    skipped++;
    continue;
  }

  const exists = await Supplier.findOne({ business_tax: businessTax });
  if (exists) {
    console.log(`⏭️ קיים – מדלג: ${row["שם"]}`);
    skipped++;
    continue;
  }

  await Supplier.create({
    name: row["שם"],
    business_tax: businessTax,
    supplierType: "invoices",
    projects: [],
    invoices: [],
    bankDetails: {
      bankName: BANK_CODE_TO_NAME[row["בנק"]] || "לא ידוע",
      branchNumber: String(row["סניף"]),
      accountNumber: String(row["חשבון"])
    }
  });

  console.log(`✅ נוסף: ${row["שם"]}`);
  inserted++;
}

console.log("🎉 סיום");
console.log(`נוספו: ${inserted}`);
console.log(`דולגו: ${skipped}`);
process.exit();
