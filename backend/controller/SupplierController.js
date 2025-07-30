import { supplierService } from '../services/SupplierService.js';

export const supplierController = {
    // יצירת ספק חדש
    async createSupplier(req, res) {
        try {
            const supplier = await supplierService.createSupplier(req.body);
            res.status(201).json({
                success: true,
                message: 'ספק נוצר בהצלחה',
                data: supplier
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // קבלת כל הספקים
    async getAllSuppliers(req, res) {
        try {
            const suppliers = await supplierService.getAllSuppliers();
            res.status(200).json({
                success: true,
                data: suppliers
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // קבלת ספק לפי ID
    async getSupplierById(req, res) {
        try {
            const supplier = await supplierService.getSupplierById(req.params.id);
            res.status(200).json({
                success: true,
                data: supplier
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    // עדכון ספק
    async updateSupplier(req, res) {
        try {
            const supplier = await supplierService.updateSupplier(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'ספק עודכן בהצלחה',
                data: supplier
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // מחיקת ספק
    async deleteSupplier(req, res) {
        try {
            console.log(req.params);
            await supplierService.deleteSupplier(req.params.id);
            res.status(200).json({
                success: true,
                message: 'ספק נמחק בהצלחה'
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }
};