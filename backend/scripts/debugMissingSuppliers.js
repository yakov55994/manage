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

const MISSING = ["אדלר - שיי שלמה", "שיין מאיר", "יעקב כהן", "ליפקוביץ מרדכי", "נויפלד אהרון"];

async function main() {
  await mongoose.connect(process.env.MONGO_URL);

  for (const name of MISSING) {
    const supplier = await Supplier.findOne({ name });
    const invoices = await Invoice.find({ supplierId: supplier?._id });

    console.log(`\n── ${name} ──`);
    console.log(`  ספק: ${supplier ? `נמצא (${supplier._id})` : "❌ לא נמצא"}`);
    if (supplier) {
      console.log(`  business_tax: ${supplier.business_tax}`);
      console.log(`  bankDetails: ${JSON.stringify(supplier.bankDetails)}`);
    }
    console.log(`  חשבוניות: ${invoices.length}`);
    invoices.forEach(inv => console.log(`    - ${inv.invoiceNumber} | detail: "${inv.detail}"`));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
