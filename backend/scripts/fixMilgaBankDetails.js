import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, URL } from "url";
import { createRequire } from "module";
import Invoice from "../models/Invoice.js";
import Supplier from "../models/Supplier.js";
import Project from "../models/Project.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const _require = createRequire(import.meta.url);
const banksData = _require("../data/banks_and_branches.json");
const bankCodeToName = banksData.reduce((map, b) => {
  map[String(b.bankCode).trim()] = b.bankName.trim();
  return map;
}, {});

function parseDetail(detail) {
  const result = {};
  if (!detail) return result;
  const parts = detail.split("|").map(s => s.trim());
  for (const part of parts) {
    if (part.startsWith("בנק:")) result.rawBank = part.replace("בנק:", "").trim();
    else if (part.startsWith("סניף:")) result.branchNumber = part.replace("סניף:", "").trim();
    else if (part.startsWith("חשבון:")) result.accountNumber = part.replace("חשבון:", "").trim();
  }
  // המרת קוד בנק לשם
  if (result.rawBank) {
    result.bankName = bankCodeToName[result.rawBank] || result.rawBank;
  }
  return result;
}

async function fixMilgaBankDetails() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const milgaProject = await Project.findOne({ name: "מילגה" });
  if (!milgaProject) {
    console.log("❌ פרויקט מילגה לא נמצא");
    await mongoose.disconnect();
    return;
  }

  const invoices = await Invoice.find({
    "projects.projectId": milgaProject._id,
  }).populate("supplierId");

  console.log(`📄 נמצאו ${invoices.length} חשבוניות מילגה`);

  let updated = 0;
  let alreadyOk = 0;
  let noSupplier = 0;
  let noBank = 0;

  for (const inv of invoices) {
    const supplier = inv.supplierId;
    if (!supplier) { noSupplier++; continue; }

    const { bankName, branchNumber, accountNumber } = parseDetail(inv.detail);
    if (!bankName || !branchNumber || !accountNumber) { noBank++; continue; }

    const currentBank = supplier.bankDetails?.bankName || "";
    // עדכן אם אין כלל, או אם שמור קוד מספרי במקום שם
    const needsUpdate = !currentBank || /^\d+$/.test(currentBank);
    if (!needsUpdate) { alreadyOk++; continue; }

    await Supplier.findByIdAndUpdate(supplier._id, {
      bankDetails: { bankName, branchNumber, accountNumber },
    });

    console.log(`  ✅ עודכן: ${supplier.name} | ${bankName} | סניף ${branchNumber} | חשבון ${accountNumber}`);
    updated++;
  }

  console.log(`\n📊 סיכום:`);
  console.log(`  עודכנו: ${updated}`);
  console.log(`  כבר תקינים: ${alreadyOk}`);
  console.log(`  ללא ספק: ${noSupplier}`);
  console.log(`  חסרו פרטי בנק בפירוט: ${noBank}`);

  await mongoose.disconnect();
}

fixMilgaBankDetails().catch(err => {
  console.error("❌ שגיאה:", err);
  process.exit(1);
});
