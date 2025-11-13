// services/SupplierService.js
import Supplier from '../models/Supplier.js';
import mongoose from 'mongoose';

function assertProject(projectId) {
  if (!projectId) throw new Error('projectId is required');
  if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error('Invalid projectId');
}

export const supplierService = {
  // ➕ יצירת ספק חדש בפרויקט
  async createSupplier(supplierData) {
    try {
      const { project } = supplierData || {};
      assertProject(project);

      // (אופציונלי) מניעת כפילות שם ספק בתוך אותו פרויקט
      if (supplierData?.name) {
        const dup = await Supplier.findOne({ name: supplierData.name.trim(), project });
        if (dup) {
          throw new Error('כבר קיים ספק בשם זה בפרויקט');
        }
      }

      const supplier = new Supplier(supplierData);
      return await supplier.save();
    } catch (error) {
      throw new Error(`שגיאה ביצירת ספק: ${error.message}`);
    }
  },

  // 🔎 חיפוש ספקים בפרויקט
    async search(query) {
    if (query === undefined || query === null) {
      throw new Error('מילת חיפוש לא נמצאה');
    }
    const regex = query === '0' || !isNaN(query) ? String(query) : new RegExp(String(query), 'i');
    return Supplier.find({ name: { $regex: regex } }).sort({ createdAt: -1 }).lean();
  },

  // 📃 כל הספקים עם פילטר חופשי (ה־controller מעביר { project: projectId, ... })
async  getAllSuppliers() {
  const suppliers = await Supplier.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'invoices',
        localField: 'invoices',
        foreignField: '_id',
        as: 'invoices'
      }
    },
    { $addFields: { invoicesCount: { $size: '$invoices' } } },
    { $project: { invoices: 0 } } // לא להחזיר את הרשימה הכבדה, רק ספירה
  ]);
  return suppliers;
},


  // 📄 ספק לפי ID בפרויקט
  async getSupplierById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid supplier id');

      const supplier = await Supplier.findOne({ _id: id }).populate("name");
      if (!supplier) throw new Error('ספק לא נמצא');
      return supplier;
    } catch (error) {
      throw new Error(`שגיאה בקבלת ספק: ${error.message}`);
    }
  },

  // ✏️ עדכון ספק בפרויקט
  async updateSupplier(projectId, id, updateData) {
    try {
      assertProject(projectId);
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid supplier id');

      // לא מאפשרים לשנות project מבחוץ
      if ('project' in updateData) delete updateData.project;

      const supplier = await Supplier.findOneAndUpdate(
        { _id: id, project: projectId },
        updateData,
        { new: true, runValidators: true }
      );
      if (!supplier) throw new Error('ספק לא נמצא');
      return supplier;
    } catch (error) {
      throw new Error(`שגיאה בעדכון ספק: ${error.message}`);
    }
  },

  // 🗑️ מחיקת ספק בפרויקט
  async deleteSupplier(projectId, id) {
    try {
      assertProject(projectId);
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid supplier id');

      const supplier = await Supplier.findOneAndDelete({ _id: id, project: projectId });
      if (!supplier) throw new Error('ספק לא נמצא');
      return supplier;
    } catch (error) {
      throw new Error(`שגיאה במחיקת ספק: ${error.message}`);
    }
  },
};
