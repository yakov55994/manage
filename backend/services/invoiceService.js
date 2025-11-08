import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Project from '../models/Project.js';

const invoiceService = {

 createInvoices: async (invoicesData) => {
  try {
    // בדיקת חשבוניות קיימות
    for (let invoiceData of invoicesData) {
      const existingInvoice = await Invoice.findOne({ 
        invitingName: invoiceData.invitingName.trim(),
        invoiceNumber: invoiceData.invoiceNumber
      });
      if (existingInvoice) {
        console.error(`לספק "${invoiceData.invitingName}" כבר קיימת חשבונית עם מספר "${invoiceData.invoiceNumber}"`);
        throw new Error(`לספק "${invoiceData.invitingName}" כבר קיימת חשבונית עם מספר "${invoiceData.invoiceNumber}"`);
      }
    }

    // יצירת החשבוניות
    const newInvoices = await Invoice.insertMany(invoicesData);

    // עדכון פרויקטים
    const updates = newInvoices.map(invoice => ({
      updateOne: {
        filter: { _id: invoice.projectId },
        update: { 
          $push: { invoices: invoice },
          $inc: { remainingBudget: -invoice.sum }
        }
      }
    }));

    await Project.bulkWrite(updates);
    
    return newInvoices;
  } catch (err) {
    console.error('שגיאה ביצירת חשבוניות:', err);
    throw new Error(`שגיאה ביצירת חשבוניות: ${err.message}`);
  }
},

  search: async (query) => {
    try {

      const searchQuery = query.trim();

      let invoices;
      invoices = await Invoice.find({
        $or: [
          { invoiceNumber: searchQuery },  // השווה את ה-query ישירות כ-String
          { description: { $regex: searchQuery, $options: 'i' } }, // חיפוש לפי תיאור (עם רג'קס גמיש)
          { projectName: { $regex: searchQuery, $options: 'i' } } // חיפוש לפי שם פרוייקט
        ]
      });

      return { invoices };
    } catch (error) {
      console.error('שגיאה במהלך החיפוש:', error.message);
      throw new Error('שגיאה בזמן החיפוש');
    }
  },
getAllInvoices: async () => {
  try {
    const invoices = await Invoice.find()
      .populate(
        {
          path:
         'supplierId',
          select: 'name phone bankDetails' // ✅ רק השדות שאתה צריך
      }
      ) // ✅ זה נכון
      .sort({ createdAt: -1 });

    const invoicesWithSupplier = invoices.map(invoice => {
      const invoiceObj = invoice.toObject();
      return {
        ...invoiceObj,
        // ✅ תיקון המיפוי
        supplier: invoiceObj.supplierId || null  // אם supplierId קיים ומפופלט, השתמש בו
      };
    });

    return invoicesWithSupplier;
  } catch (error) {
    console.error('Error fetching invoices from DB:', error);
    throw new Error('שגיאה בשליפת חשבוניות מבסיס הנתונים');
  }
},

  getInvoiceById: async (id) => {
    try {
      const invoice = await Invoice.findById(id).populate("files");
      
      return invoice;
    } catch (error) {
      console.error('Error fetching invoice by ID:', error);
      throw new Error('שגיאה בשליפת חשבונית');
    }
  },


  getInvoicesByProject: async (projectName) => {
    return await Invoice.find({ projectName });
  },
  updateInvoice: async (id, invoiceData) => {
    try {
      const updatedInvoice = await Invoice.findOneAndUpdate(
        { _id: id },
        { $set: invoiceData },
        { new: true, runValidators: true }
      );

      return updatedInvoice;
    } catch (err) {
      console.error('Error updating invoice:', err);
      throw err;
    }
  },
  updatePaymentStatusService: async (id, paid) => {
    try {
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        id,
        { paid: paid === "כן" ? "כן" : "לא" }, // עדכון הסטטוס (שולם/לא שולם)
        { new: true } // מחזיר את החשבונית המעודכנת
      );
  
      return updatedInvoice;
    } catch (error) {
      console.error(error);
      throw new Error("שגיאה בעדכון הסטטוס");
    }
  },
  deleteInvoiceById: async (id, invoiceNumber, projectName) => {
    try {
      // לוג לבדוק את הפרמטרים
      console.log("Deleting invoice with id:", id, "invoiceNumber:", invoiceNumber, "projectName:", projectName);

      // חיפוש החשבונית לפני המחיקה
      const invoice = await Invoice.findOne({
        _id: id,
        invoiceNumber: invoiceNumber,
        projectName: projectName
      });

      if (!invoice) {
        throw new Error('חשבונית לא נמצאה');
      }

      // מחיקת החשבונית
      await Invoice.deleteOne({ _id: id });

      // עדכון התקציב של הפרויקט
      const updatedProject = await Project.findOneAndUpdate(
        { name: projectName },
        {
          $pull: { invoices: { _id: id } },
          $inc: { remainingBudget: invoice.sum }
        },
        { new: true }
      );

      return updatedProject;
    } catch (error) {
      console.error("Error deleting invoice:", error);
      throw new Error('שגיאה במחיקת החשבונית');
    }
  }
}

export default invoiceService;

