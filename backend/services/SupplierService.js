// services/supplierService.js
import Supplier from "../models/Supplier.js";
import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import mongoose from "mongoose";

const supplierService = {

    async getAllSuppliers() {
  return Supplier.find().sort({ name: 1 });
},
    // רשימת ספקים לפי פרויקט
    async getSuppliersByProject(projectId) {
        return Supplier.find({ projects: projectId }).sort({ name: 1 });
    },

    // יצירת ספק + שיוך לפרויקט
    async createSupplier(projectId, data) {
        const supplier = new Supplier({
            ...data,
            projects: [projectId]
        });

        await supplier.save();

        // לא חובה להוסיף את הספק לפרויקט (לא צריך שם קשר)
        return supplier;
    },

    // שליפת ספק בודד (רק אם שייך לפרויקט)
    async getSupplierById(projectId, supplierId) {
        return Supplier.findOne({
            _id: supplierId,
            projects: projectId
        });
    },

    // עדכון ספק
    async updateSupplier(projectId, supplierId, data) {
        return Supplier.findOneAndUpdate(
            { _id: supplierId, projects: projectId },
            { $set: data },
            { new: true }
        );
    },

    // מחיקה מוחלטת של ספק + חשבוניות שלו
    async deleteSupplier(projectId, supplierId) {
        const supplier = await Supplier.findOne({
            _id: supplierId,
            projects: projectId
        });

        if (!supplier) return null;

        // מוחקים חשבוניות של הספק
        await Invoice.deleteMany({ supplierId });

        // מוחקים את הספק
        await supplier.deleteOne();

        return true;
    },

    // חיפוש ספקים בפרויקט
    async search(projectId, q) {
        const regex = new RegExp(q, "i");

        return Supplier.find({
            projects: projectId,
            $or: [
                { name: regex },
                { phone: regex },
                { business_tax: regex }
            ]
        });
    }
};

export default supplierService;
