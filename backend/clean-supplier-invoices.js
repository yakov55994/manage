import mongoose from "mongoose";
import Supplier from "./models/Supplier.js";

  const MONGO = "mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App"

async function clean() {
  await mongoose.connect(MONGO);
  console.log("🚀 מחובר ל־MongoDB");

  const suppliers = await Supplier.find();

  for (const s of suppliers) {
    if (!s.invoices || !s.invoices.length) continue;

    // בודק אילו חשבוניות באמת קיימות
    const existing = [];
    for (const invId of s.invoices) {
      const exists = await mongoose.connection.db
        .collection("invoices")
        .findOne({ _id: invId });

      if (exists) existing.push(invId);
    }

    if (existing.length !== s.invoices.length) {
      console.log(`🧹 מנקה ספק ${s.name} (${s._id})`);
      s.invoices = existing;
      await s.save();
    }
  }

  console.log("🎉 סיום! כל הספקים נקיים ומעודכנים.");
  process.exit();
}

clean();
