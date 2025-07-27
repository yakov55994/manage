import mongoose from "mongoose";
import bankDetailsSchema from './BankDetails.js'; // הוסף .js

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },      // תיקון: required
    business_tax: { type: Number, required: true },
    address: { type: String, required: false },
    phone: { type: String, required: true },     // תיקון: type
    email: { type: String, required: false },
    date: { type: Date, default: Date.now },
    bankDetails: bankDetailsSchema,
      projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    invoices: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Invoice'
    }]
});

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;