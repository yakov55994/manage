// שימוש: node scripts/importInvoicesFromExcel.js [path/to/file.xlsx] [--dry-run]
// ברירת מחדל: invoisesToAdd.xlsx בתיקיית הבקאנד
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import Invoice from "../models/Invoice.js";
import Supplier from "../models/Supplier.js";
import Project from "../models/Project.js";
import Counter from "../models/Counter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const _require = createRequire(import.meta.url);
const xlsx = _require("xlsx");

function parseDate(val) {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date → JS Date
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  const [d, m, y] = str.split("/");
  if (d && m && y) {
    return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  return null;
}

async function ensureDocSerialCounter() {
  const counter = await Counter.findOne({ name: "documentSerial" });
  if (!counter) {
    const max = await Invoice.aggregate([
      { $match: { invoiceNumber: { $exists: true } } },
      {
        $addFields: {
          numericInvoice: { $toInt: { $ifNull: ["$invoiceNumber", "0"] } },
        },
      },
      { $group: { _id: null, max: { $max: "$numericInvoice" } } },
    ]);
    const seq = max[0]?.max || 0;
    await Counter.create({ name: "documentSerial", seq });
    console.log(`  📌 Counter אותחל לערך: ${seq}`);
  }
}

async function recalculateRemainingBudget(projectId) {
  if (!projectId) return;
  const project = await Project.findById(projectId);
  if (!project) return;

  if (project.name === "מילגה") {
    project.remainingBudget = project.budget;
    await project.save();
    return;
  }

  const regularInvoices = await Invoice.find({
    "projects.projectId": projectId,
    type: { $ne: "salary" },
  });

  let regularTotal = 0;
  for (const inv of regularInvoices) {
    const part = inv.projects.find(
      (p) => String(p.projectId) === String(projectId)
    );
    if (part) regularTotal += Number(part.sum || 0);
  }

  const milgaInvoices = await Invoice.find({ fundedFromProjectId: projectId });
  const milgaTotal = milgaInvoices.reduce(
    (s, i) => s + Number(i.totalAmount || 0),
    0
  );

  const totalSpent = regularTotal + milgaTotal;
  project.remainingBudget = project.budget - totalSpent;
  await project.save();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fileArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const filePath = fileArg || path.join(__dirname, "..", "invoisesToAdd.xlsx");

  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB\n");

  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });
  console.log(`📄 ${rows.length} שורות בקובץ${dryRun ? " [DRY RUN]" : ""}\n`);

  if (!dryRun) {
    await ensureDocSerialCounter();
  }

  let created = 0,
    skipped = 0;
  const warnings = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const supplierName = String(row["שם ספק"] || "").trim();
    const projectsRaw = String(row["פרויקטים"] || "").trim();
    const totalAmount = parseFloat(row["סכום"]) || 0;
    const docType = String(row["סוג מסמך"] || "חשבונית מס / קבלה").trim();
    const status = String(row["סטטוס"] || "לא הוגש").trim();
    const paid = String(row["שולם"] || "לא").trim();
    const invoiceDate = parseDate(row["תאריך חשבונית"]);
    const detail = String(row["פירוט"] || "").trim();
    const createdByName = String(row["נוצר ע״י"] || "").trim();
    const createdAt = parseDate(row["תאריך יצירה"]);

    // ── ספק ──
    let supplier = null;
    if (supplierName && supplierName !== "לא משוייך") {
      supplier = await Supplier.findOne({ name: supplierName });
      if (!supplier) {
        warnings.push(
          `שורה ${rowNum}: ❌ ספק לא נמצא: "${supplierName}" — הספק לא קיים במסד הנתונים בשם זה`
        );
        skipped++;
        continue;
      }
    } else {
      warnings.push(
        `שורה ${rowNum}: ❌ אין ספק — דולגה`
      );
      skipped++;
      continue;
    }

    // ── פרויקטים ──
    const rawNames = projectsRaw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    // ייחוד שמות (מילגה, מילגה → מילגה)
    const uniqueNames = [...new Set(rawNames)];

    // סנן "לא משוייך"
    const validNames = uniqueNames.filter((n) => n !== "לא משוייך");

    if (validNames.length === 0) {
      warnings.push(
        `שורה ${rowNum}: ❌ כל הפרויקטים הם "לא משוייך" (${supplierName}) — לא ניתן ליצור חשבונית ללא projectId`
      );
      skipped++;
      continue;
    }

    const projectDocs = [];
    let missingProject = false;
    for (const pname of validNames) {
      const proj = await Project.findOne({ name: pname });
      if (!proj) {
        warnings.push(
          `שורה ${rowNum}: ❌ פרויקט לא נמצא: "${pname}" (${supplierName}) — הפרויקט לא קיים במסד הנתונים`
        );
        missingProject = true;
        break;
      }
      projectDocs.push(proj);
    }

    if (missingProject) {
      skipped++;
      continue;
    }

    // חלק את הסכום שווה בין הפרויקטים
    const sumPerProject =
      Math.round((totalAmount / projectDocs.length) * 100) / 100;

    const projectsArr = projectDocs.map((proj) => ({
      projectId: proj._id,
      projectName: proj.name,
      sum: sumPerProject,
    }));

    if (dryRun) {
      const projList = projectsArr
        .map((p) => `${p.projectName} (${p.sum}₪)`)
        .join(", ");
      console.log(
        `  [DRY] שורה ${rowNum}: ${supplierName} | ${projList} | סה"כ ${totalAmount}₪ | ${docType}`
      );
      created++;
      continue;
    }

    // ── צור חשבונית ──
    const invoiceNumber = String(
      await Counter.getNextSequence("documentSerial")
    );

    const invoiceDoc = new Invoice({
      invoiceNumber,
      type: "invoice",
      projects: projectsArr,
      totalAmount,
      invoiceDate,
      status,
      paid,
      detail,
      invitingName: supplierName,
      supplierId: supplier._id,
      documentType: docType,
      createdByName: createdByName || "",
      files: [],
      editHistory: [
        {
          userName: createdByName || "ייבוא מאקסל",
          action: "created",
          changes: "חשבונית יובאה מקובץ אקסל",
          timestamp: createdAt || new Date(),
        },
      ],
      internalNotes: "",
    });

    if (createdAt) {
      invoiceDoc.createdAt = createdAt;
    }

    await invoiceDoc.save();

    // עדכן Project.invoices[] וחשב תקציב מחדש (כמו בשירות)
    for (const p of projectsArr) {
      await Project.findByIdAndUpdate(p.projectId, {
        $addToSet: { invoices: invoiceDoc._id },
      });
      await recalculateRemainingBudget(p.projectId);
    }

    // עדכן Supplier.invoices[]
    await Supplier.findByIdAndUpdate(supplier._id, {
      $addToSet: { invoices: invoiceDoc._id },
    });

    console.log(
      `  ✅ שורה ${rowNum}: חשבונית #${invoiceNumber} | ${supplierName} | ${totalAmount}₪`
    );
    created++;
  }

  console.log(`\n📊 סיכום:`);
  console.log(`  ${dryRun ? "ייצרו (סימולציה)" : "נוצרו"}: ${created}`);
  console.log(`  דולגו: ${skipped}`);

  if (warnings.length) {
    console.log(`\n⚠️  פירוט הדילוגים (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  ${w}`));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ שגיאה:", err.message);
  process.exit(1);
});
