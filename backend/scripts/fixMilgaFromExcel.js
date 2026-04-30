// שימוש: node scripts/fixMilgaFromExcel.js /path/to/file.xlsx
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import Supplier from "../models/Supplier.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const _require = createRequire(import.meta.url);
const xlsx = _require("xlsx");
const banksData = _require("../data/banks_and_branches.json");
const bankCodeToName = banksData.reduce((map, b) => {
  map[String(b.bankCode).trim()] = b.bankName.trim();
  return map;
}, {});

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("❌ יש לספק נתיב לקובץ: node fixMilgaFromExcel.js /path/to/file.xlsx");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB\n");

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`📄 ${rows.length} שורות בקובץ\n`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const row of rows) {
    const name = (row["שם"] || row["שם "] || "").toString().trim();
    if (!name) continue;

    const idNumber = (row["מ זהות"] || row["מז זהות"] || row["מזהות"] || row["מספר זהות"] || row["ת.ז"] || "").toString().trim();
    const email    = (row["אימייל"] || row["דואל"] || row["email"] || row["Email"] || "").toString().trim();
    const rawBank  = (row["בנק"] || "").toString().trim();
    const bank     = bankCodeToName[rawBank] || rawBank;
    const branch   = (row["סניף"] || "").toString().trim();
    const account  = (row["חשבון"] || "").toString().trim();

    const supplier = await Supplier.findOne({ name });
    if (!supplier) {
      console.log(`  ❓ לא נמצא ספק: ${name}`);
      notFound++;
      continue;
    }

    let changed = false;
    const updates = {};

    if (idNumber && /^0+$/.test(supplier.business_tax || "0")) {
      updates.business_tax = idNumber;
      changed = true;
    }
    if (email && !supplier.email) {
      updates.email = email;
      changed = true;
    }
    if (bank && branch && account && !supplier.bankDetails?.bankName) {
      updates.bankDetails = { bankName: bank, branchNumber: branch, accountNumber: account };
      changed = true;
    }

    if (!changed) { skipped++; continue; }

    await Supplier.findByIdAndUpdate(supplier._id, updates);
    const parts = [];
    if (updates.business_tax) parts.push(`ת.ז → ${updates.business_tax}`);
    if (updates.email) parts.push(`אימייל → ${updates.email}`);
    if (updates.bankDetails) parts.push(`בנק → ${bank}`);
    console.log(`  ✅ ${name}: ${parts.join(" | ")}`);
    updated++;
  }

  console.log(`\n📊 סיכום:`);
  console.log(`  עודכנו:     ${updated}`);
  console.log(`  כבר תקינים: ${skipped}`);
  console.log(`  לא נמצאו:   ${notFound}`);

  await mongoose.disconnect();
}

main().catch(console.error);
