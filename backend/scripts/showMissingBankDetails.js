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

async function main() {
  await mongoose.connect(process.env.MONGO_URL);

  const milgaProject = await Project.findOne({ name: "מילגה" });
  const invoices = await Invoice.find({ "projects.projectId": milgaProject._id }).populate("supplierId");

  const missing = invoices.filter(inv => {
    const d = inv.detail || "";
    return !(d.includes("בנק:") && d.includes("סניף:") && d.includes("חשבון:"));
  });

  console.log(`חסרים פרטי בנק ל-${missing.length} ספקים:\n`);
  missing.forEach(inv => {
    const name = inv.supplierId?.name || inv.invitingName || "לא ידוע";
    console.log(`  • ${name} | פירוט: ${inv.detail || "(ריק)"}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
