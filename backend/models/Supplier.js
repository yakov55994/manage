import mongoose from "mongoose";
import bankDetailsSchema from './BankDetails.js';

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    business_tax: { type: String, required: true }, // תיקון: String במקום Str
    address: { type: String, required: false },
    phone: { type: String, required: true },
    email: { type: String, required: false },
    date: { type: Date, default: Date.now },
    bankDetails: { 
        type: bankDetailsSchema, 
        required: false,  // bankDetails עצמו לא חובה
        default: undefined  // חשוב! מונע יצירת אובייקט ריק
    },
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