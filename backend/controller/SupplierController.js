// controllers/supplierController.js
import { supplierService } from '../services/SupplierService.js';
import mongoose from 'mongoose';

export const supplierController = {
  // ➕ יצירת ספק חדש לפרויקט
  async createSupplier(req, res) {
    try {
      const { projectId } = req.params;
      if (!projectId) return res.status(400).json({ success: false, message: 'projectId is required' });

      const supplier = await supplierService.createSupplier({
        ...req.body,
        project: projectId, // הצמדה לפרויקט
      });

      res.status(201).json({
        success: true,
        message: 'ספק נוצר בהצלחה',
        data: supplier,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // 📃 כל הספקים בפרויקט (תומך ב-filter מה־middleware אם יש)
  async getAllSuppliers(req, res) {
    try {
       const suppliers = await supplierService.getAllSuppliers();
       return res.status(200).json(suppliers)
    } catch (error) {
      res.status(500).json({ message: 'שגיאה בשליפת הספקים', error: error.message  });
    }
  },

  // 📄 ספק לפי ID בתוך פרויקט
  async getSupplierById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid supplier id' });
      }

      const supplier = await supplierService.getSupplierById(id);
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'ספק לא נמצא' });
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  // ✏️ עדכון ספק בפרויקט
  async updateSupplier(req, res) {
    try {
      const { projectId, id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid supplier id' });
      }

      const supplier = await supplierService.updateSupplier(projectId, id, req.body);
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'ספק לא נמצא' });
      }

      res.status(200).json({
        success: true,
        message: 'ספק עודכן בהצלחה',
        data: supplier,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // 🗑️ מחיקת ספק בפרויקט
  async deleteSupplier(req, res) {
    try {
      const { projectId, id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid supplier id' });
      }

      const deleted = await supplierService.deleteSupplier(projectId, id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'ספק לא נמצא' });
      }

      res.status(200).json({ success: true, message: 'ספק נמחק בהצלחה' });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  // 🔎 חיפוש ספקים בפרויקט
  async search(req, res) {
    try {
      const { projectId } = req.params;
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ success: false, message: 'מילת חיפוש לא נמצאה' });
      }

      const results = await supplierService.search(projectId, query);
      res.status(200).json(results);
    } catch (error) {
      console.error('שגיאה במהלך החיפוש: ', error);
      res.status(500).json({ message: 'שגיאה במהלך החיפוש', error: error.message });
    }
  },
};
