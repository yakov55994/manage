// scripts/add-paymentMethod-to-invoices.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/yourdb";

const InvoiceSchema = new mongoose.Schema({}, { strict: false, collection: "invoices" });
const Invoice = mongoose.model("Invoice", InvoiceSchema);

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, { autoIndex: false });
    console.log("✅ Connected to MongoDB");

    const filter = { $or: [ { paymentMethod: { $exists: false } }, { paymentMethod: null } ] };
    const update = { $set: { paymentMethod: "" } };

    const res = await Invoice.updateMany(filter, update);
    console.log(`✅ Updated ${res.modifiedCount || res.nModified || 0} invoices`);

    // אימות מהיר
    const remaining = await Invoice.countDocuments({ paymentMethod: { $exists: false } });
    console.log(`ℹ️  Remaining without paymentMethod: ${remaining}`);

    await mongoose.disconnect();
    console.log("🏁 Done.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();
