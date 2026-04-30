import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Invoice from "../models/Invoice.js";
import Supplier from "../models/Supplier.js";
import Project from "../models/Project.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function parseDetail(detail) {
  const result = {};
  if (!detail) return result;
  for (const part of detail.split("|").map(s => s.trim())) {
    if (part.startsWith("מזהות:")) result.idNumber = part.replace("מזהות:", "").trim();
  }
  return result;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const milgaProject = await Project.findOne({ name: "מילגה" });
  const invoices = await Invoice.find({ "projects.projectId": milgaProject._id }).populate("supplierId");

  let updated = 0, skipped = 0, noId = 0;

  for (const inv of invoices) {
    const supplier = inv.supplierId;
    if (!supplier) { skipped++; continue; }
    if (supplier.business_tax && !/^0+$/.test(supplier.business_tax)) { skipped++; continue; }

    const { idNumber } = parseDetail(inv.detail);
    if (!idNumber) { noId++; console.log(`  ⚠️  אין ת.ז בפירוט: ${supplier.name}`); continue; }

    await Supplier.findByIdAndUpdate(supplier._id, { business_tax: idNumber });
    console.log(`  ✅ עודכן: ${supplier.name} → ת.ז ${idNumber}`);
    updated++;
  }

  console.log(`\n📊 סיכום: עודכנו ${updated} | כבר תקינים ${skipped} | חסר ת.ז בפירוט ${noId}`);
  await mongoose.disconnect();
}

main().catch(console.error);
