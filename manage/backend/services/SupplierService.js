import Supplier from '../models/Supplier.js';

export const supplierService = {
    // יצירת ספק חדש
    async createSupplier(supplierData) {
        try {
            const supplier = new Supplier(supplierData);
            return await supplier.save();
        } catch (error) {
            throw new Error(`שגיאה ביצירת ספק: ${error.message}`);
        }
    },

    // קבלת כל הספקים
    async getAllSuppliers() {
        try {
            return await Supplier.find();
        } catch (error) {
            throw new Error(`שגיאה בקבלת ספקים: ${error.message}`);
        }
    },

    // קבלת ספק לפי ID
    async getSupplierById(id) {
        try {
            const supplier = await Supplier.findById(id);
            if (!supplier) {
                throw new Error('ספק לא נמצא');
            }
            return supplier;
        } catch (error) {
            throw new Error(`שגיאה בקבלת ספק: ${error.message}`);
        }
    },

    // עדכון ספק
    async updateSupplier(id, updateData) {
        try {
            const supplier = await Supplier.findByIdAndUpdate(
                id, 
                updateData, 
                { new: true, runValidators: true }
            );
            if (!supplier) {
                throw new Error('ספק לא נמצא');
            }
            return supplier;
        } catch (error) {
            throw new Error(`שגיאה בעדכון ספק: ${error.message}`);
        }
    },

    // מחיקת ספק
    async deleteSupplier(id) {
        try {
            const supplier = await Supplier.findByIdAndDelete(id);
            if (!supplier) {
                throw new Error('ספק לא נמצא');
            }
            return supplier;
        } catch (error) {
            throw new Error(`שגיאה במחיקת ספק: ${error.message}`);
        }
    }
};