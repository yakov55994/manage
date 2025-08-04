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

    
 async search (query) {
  try {
    // בדיקה שהשאילתה לא ריקה
    if (!query || query.trim() === '') {
      return { suppliers: [] };
    }

    const searchQuery = query.trim();

    // חיפוש גמיש בכל השדות
    let suppliers = await Supplier.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } }, // חיפוש גמיש בשם
        { companyName: { $regex: searchQuery, $options: 'i' } }, // אם יש שדה companyName
        { business_tax: { $regex: searchQuery, $options: 'i' } }, // חיפוש בח.פ/ע.מ
        { taxId: { $regex: searchQuery, $options: 'i' } }, // אם יש שדה taxId חלופי
        { phone: { $regex: searchQuery, $options: 'i' } }, // חיפוש בטלפון
        { email: { $regex: searchQuery, $options: 'i' } }, // חיפוש באימייל
        { address: { $regex: searchQuery, $options: 'i' } } // חיפוש בכתובת
      ]
    }).limit(50); // הגבלת תוצאות למניעת עומס

    console.log(`חיפוש ספקים עבור: "${searchQuery}" - נמצאו ${suppliers.length} תוצאות`);
    
    return { suppliers };
  } catch (error) {
    console.error('שגיאה במהלך החיפוש בספקים:', error.message);
    console.error('Stack trace:', error.stack);
    throw new Error('שגיאה בזמן החיפוש בספקים');
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