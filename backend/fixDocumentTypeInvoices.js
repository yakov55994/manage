import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "./models/Project.js";

dotenv.config({ path: "./.env" });

async function run() {
  const uri = process.env.MONGO_URL || process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ אין MONGO_URL / MONGO_URI בקובץ .env");
    return;
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  try {
    // שלב 1: מחיקת השדות מהחשבוניות (בכל הפרויקטים)
    const resUnsetInvoiceFields = await Project.updateMany(
      {},
      [
        {
          $set: {
            invoices: {
              $map: {
                input: { $ifNull: ["$invoices", []] },
                as: "i",
                in: {
                  $mergeObjects: [
                    "$$i",
                    {
                      supplierName: "$$REMOVE",
                      paymentStatus: "$$REMOVE",
                      missingDocument: "$$REMOVE",
                    },
                  ],
                },
              },
            },
          },
        },
      ]
    );
    console.log(
      `🧹 Removed invoice fields -> modified: ${resUnsetInvoiceFields.modifiedCount ?? resUnsetInvoiceFields.nModified}`
    );

    // שלב 2: הוספת השדות ברמת הפרויקט עצמו עם ערכים ריקים
    const resSetRootFields = await Project.updateMany(
      {},
      {
        $set: {
          supplierName: "",
          paymentStatus: "",
          missingDocument: "",
        },
      }
    );
    console.log(
      `🆕 Added root fields -> modified: ${resSetRootFields.modifiedCount ?? resSetRootFields.nModified}`
    );
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
}

run();
