// models/Supplier.js
import mongoose from "mongoose";
import bankDetailsSchema from "./BankDetails.js";
import Invoice from "../models/Invoice.js";

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    business_tax: { type: String, required: true },
    address: { type: String, required: true },  // ✅ תיקנתי גם required (לא require)
    phone: String,
    email: { type: String, required: true },    // ✅ תיקנתי גם required
    date: { type: Date, default: Date.now },

    bankDetails: {
      type: bankDetailsSchema,
      required: false,
      default: undefined
    },

    projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    }],
    
    invoices: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    
    createdByName: {
      type: String,
      required: false
    },
    
    // 🆕 הוספת סוג ספק
    supplierType: {
      type: String,
      enum: ["invoices", "orders", "both"],
      default: "both",
    }
  },
  { timestamps: true }  // ✅ כאן! מחוץ לאובייקט השדות
);

/** 🧹 Cascade delete: מחיקת ספק מוחקת את החשבוניות שלו */
supplierSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    await Invoice.deleteMany({ supplierId: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Supplier", supplierSchema);