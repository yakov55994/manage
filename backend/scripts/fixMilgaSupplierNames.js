import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Invoice from "../models/Invoice.js";
import Supplier from "../models/Supplier.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function fixMilgaSupplierNames() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  // מצא את הספק הגנרי "מילגה"
  const milgaSupplier = await Supplier.findOne({ name: "מילגה", business_tax: "000000000" });
  if (!milgaSupplier) {
    console.log("❌ ספק גנרי 'מילגה' לא נמצא - אין מה לתקן");
    await mongoose.disconnect();
    return;
  }
  console.log(`🔍 נמצא ספק גנרי מילגה: ${milgaSupplier._id}`);

  // מצא את כל החשבוניות של הספק הגנרי
  const invoices = await Invoice.find({ supplierId: milgaSupplier._id });
  console.log(`📋 נמצאו ${invoices.length} חשבוניות לתיקון`);

  let fixed = 0;
  let errors = 0;

  for (const invoice of invoices) {
    const name = invoice.invitingName;
    if (!name) {
      console.log(`⚠️  חשבונית ${invoice.invoiceNumber} - אין invitingName, דילוג`);
      errors++;
      continue;
    }

    try {
      // חפש ספק קיים עם השם הזה
      let supplier = await Supplier.findOne({ name });
      if (!supplier) {
        supplier = await Supplier.create({
          name,
          business_tax: "000000000",
        });
        console.log(`➕ נוצר ספק חדש: ${name}`);
      } else {
        console.log(`♻️  נמצא ספק קיים: ${name}`);
      }

      // עדכן את החשבונית לספק החדש
      await Invoice.findByIdAndUpdate(invoice._id, { supplierId: supplier._id });

      // הסר את החשבונית מהספק הגנרי
      await Supplier.findByIdAndUpdate(milgaSupplier._id, {
        $pull: { invoices: invoice._id },
      });

      // הוסף את החשבונית לספק החדש (אם לא קיימת)
      await Supplier.findByIdAndUpdate(supplier._id, {
        $addToSet: { invoices: invoice._id },
      });

      console.log(`✅ תוקנה חשבונית ${invoice.invoiceNumber} → ספק: ${name}`);
      fixed++;
    } catch (err) {
      console.error(`❌ שגיאה בחשבונית ${invoice.invoiceNumber}:`, err.message);
      errors++;
    }
  }

  console.log(`\n🎉 סיום: ${fixed} חשבוניות תוקנו, ${errors} שגיאות`);

  // אם הספק הגנרי נשאר ריק - אפשר למחוק אותו
  const remaining = await Invoice.countDocuments({ supplierId: milgaSupplier._id });
  if (remaining === 0) {
    await Supplier.findByIdAndDelete(milgaSupplier._id);
    console.log("🗑️  הספק הגנרי 'מילגה' נמחק (אין לו יותר חשבוניות)");
  }

  await mongoose.disconnect();
  console.log("👋 Disconnected");
}

fixMilgaSupplierNames().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
