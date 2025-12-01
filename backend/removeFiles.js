import mongoose from "mongoose";
import dotenv from "dotenv";
import Invoice from "./models/Invoice.js";
import Order from "./models/Order.js";
import pkg from "cloudinary";

dotenv.config();

const { v2: cloudinary } = pkg;

// 🎨 צבעים לקונסול
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const cyan = (t) => `\x1b[36m${t}\x1b[0m`;

// 🍀 הגדרות Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🧠 חילוץ publicId מתוך URL
function extractPublicId(url) {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    const afterUpload = parts[1];
    const publicId = afterUpload.split(".")[0];

    return publicId;
  } catch {
    return null;
  }
}

// 🗑 מחיקת קבצים מ-Cloudinary + החזרת דוח
async function deleteFilesFromCloudinary(filesArray) {
  const report = {
    deleted: [],
    failed: [],
  };

  if (!Array.isArray(filesArray) || filesArray.length === 0) return report;

  for (const file of filesArray) {
    let publicId = file.publicId;

    if (!publicId || publicId.trim() === "") {
      publicId = extractPublicId(file.url);
    }

    if (!publicId) {
      report.failed.push({
        name: file.name,
        reason: "missing publicId",
        url: file.url,
      });
      continue;
    }

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
      });

      report.deleted.push({
        name: file.name,
        publicId,
      });
    } catch (err) {
      report.failed.push({
        name: file.name,
        publicId,
        reason: err.message,
      });
    }
  }

  return report;
}

const run = async () => {
  console.log(cyan("\n📡 מתחבר ל-MongoDB..."));
  await mongoose.connect(process.env.MONGO_URL);
  console.log(green("✔ מחובר\n"));

  // ############################################################
  //                     חשבוניות
  // ############################################################
  const invoices = await Invoice.find({});
  console.log(cyan(`📄 נמצאו ${invoices.length} חשבוניות`));

  let totalDeleted = 0;
  let totalFailed = 0;

  for (const inv of invoices) {
    const r = await deleteFilesFromCloudinary(inv.files);
    totalDeleted += r.deleted.length;
    totalFailed += r.failed.length;

    r.deleted.forEach((f) =>
      console.log(green(`🗑 נמחק: ${f.publicId} (${f.name})`))
    );

    r.failed.forEach((f) =>
      console.log(
        red(`❌ לא נמחק: ${f.name} | סיבה: ${f.reason} | publicId: ${f.publicId || "—"}`)
      )
    );
  }

  await Invoice.updateMany({}, { $set: { files: [] } });
  console.log(green(`✔ מערכי FILES של חשבוניות אופסו\n`));

  // ############################################################
  //                     הזמנות
  // ############################################################
  const orders = await Order.find({});
  console.log(cyan(`📦 נמצאו ${orders.length} הזמנות`));

  for (const ord of orders) {
    const r = await deleteFilesFromCloudinary(ord.files);
    totalDeleted += r.deleted.length;
    totalFailed += r.failed.length;

    r.deleted.forEach((f) =>
      console.log(green(`🗑 נמחק: ${f.publicId} (${f.name})`))
    );

    r.failed.forEach((f) =>
      console.log(
        red(`❌ לא נמחק: ${f.name} | סיבה: ${f.reason} | publicId: ${f.publicId || "—"}`)
      )
    );
  }

  await Order.updateMany({}, { $set: { files: [] } });
  console.log(green(`✔ מערכי FILES של הזמנות אופסו\n`));

  // ############################################################
  //                     סיכום
  // ############################################################
  console.log(cyan("\n========= 📊 תוצאות סופיות 📊 ========="));
  console.log(green(`🗑 נמחקו ${totalDeleted} קבצים מ-Cloudinary`));
  console.log(
    totalFailed > 0
      ? red(`⚠ ${totalFailed} קבצים לא נמחקו`)
      : green("✔ כולם נמחקו בהצלחה!")
  );

  console.log(cyan("=====================================\n"));

  process.exit();
};

run().catch((err) => console.error(err));
