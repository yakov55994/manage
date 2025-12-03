import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";
import { sendError } from '../utils/sendError.js';

// פונקציה עזר לחישוב תקציב נותר
export const recalculateRemainingBudget = async (projectId) => {
  if (!projectId) {
    console.warn('⚠️ לא ניתן projectId ל-recalculateRemainingBudget');
    return null;
  }

  const project = await Project.findById(projectId);

  if (!project) {
    console.error(`⚠️ פרויקט ${projectId} לא נמצא`);
    return null; // ⚠️ פרויקט לא קיים - יכול לקרות אם נמחק
  }

  // ✅ בדיקה שיש תקציב
  if (project.budget === undefined || project.budget === null) {
    console.warn(`⚠️ פרויקט "${project.name}" ללא תקציב - מגדיר ל-0`);
    project.budget = 0;
  }

  const invoices = await Invoice.find({ projectId });

  const totalSpent = invoices.reduce((sum, inv) => {
    const amount = Number(inv.sum);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // ✅ חישוב בטוח
  const newRemainingBudget = Number(project.budget) - totalSpent;

  // ✅ בדיקה שהתוצאה תקינה
  if (isNaN(newRemainingBudget)) {
    console.error(`❌ שגיאה בחישוב תקציב נותר לפרויקט "${project.name}"`);
    console.error(`   budget: ${project.budget}, totalSpent: ${totalSpent}`);
    project.remainingBudget = 0;
  } else {
    project.remainingBudget = newRemainingBudget;
  }

  console.log(`✅ עודכן תקציב נותר לפרויקט "${project.name}": ${project.remainingBudget} ₪`);

  await project.save();
  return project;
}
export default {

  // 🔍 חיפוש
  async searchInvoices(query) {
    const regex = new RegExp(query, "i");

    return Invoice.find({
      $or: [
        { invoiceNumber: regex },
        { projectName: regex },
        { invitingName: regex },
        { detail: regex },
        { status: regex }
      ],
    }).limit(50);
  },

  // ✔ כל החשבוניות לפי הרשאות
  async getInvoices(user) {
    let query = {};

    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      query = { projectId: { $in: allowed } };
    }

    return Invoice.find(query)
      .populate("supplierId")  // ✅ הסר את "name" - קבל הכל!
      .populate("projectId", "name contactPerson");  // ✅ הוסף contactPerson
  },

  // ✔ בדיקת כפילות
  async checkDuplicate({ invoiceNumber, supplierId }) {
    return Invoice.findOne({ invoiceNumber, supplierId });
  },

  // ✔ חשבונית לפי ID — עם הרשאות + populate
  async getInvoiceById(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate("supplierId")  // ✅ קבל את כל פרטי הספק
      .populate("projectId", "name budget remainingBudget contactPerson");  // ✅ הוסף contactPerson


    if (!invoice) return null;

    // בדיקת הרשאות
    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );

      if (!allowed.includes(String(invoice.projectId._id))) {
        throw new Error("אין הרשאה לצפות בחשבונית זו");
      }
    }

    return invoice;
  },


  // ➕ יצירה
  async createInvoice(user, data) {
    // בדיקת הרשאות
    if (user.role !== "admin") {
      const allowed = user.permissions.map(
        (p) => String(p.project?._id || p.project)
      );
      if (!allowed.includes(String(data.projectId))) {
        throw new Error("אין הרשאה להוסיף חשבונית לפרויקט זה");
      }
    }

    const project = await Project.findById(data.projectId);
    if (!project) throw new Error("פרויקט לא נמצא");

    // ✅ וידוא שיש תקציב תקין
    if (project.budget === undefined || project.budget === null) {
      console.warn(`⚠️ פרויקט "${project.name}" ללא תקציב - מגדיר ל-0`);
      project.budget = 0;
    }

    // ✅ חישוב בטוח
    const budget = Number(project.budget);
    const invoiceSum = Number(data.sum);

    if (isNaN(budget) || isNaN(invoiceSum)) {
      throw new Error("תקציב או סכום החשבונית אינם תקינים");
    }

    // 🔻 הורדת סכום החשבונית מהתקציב הנותר
    project.remainingBudget = budget - invoiceSum;
    await project.save();

    // ✅ הוספת פרטי המשתמש שיצר את החשבונית
    const invoiceData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || 'משתמש'
    };

    const invoice = await Invoice.create(invoiceData);

    // ✅ הוספה למערך החשבוניות של הפרויקט
    await Project.findByIdAndUpdate(
      data.projectId,
      { $push: { invoices: invoice._id } }
    );

    return invoice;
  },

  // ✏️ עדכון חשבונית
  async updateInvoice(user, invoiceId, data) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    const updatedInvoice = await Invoice.findByIdAndUpdate(invoiceId, data, { new: true });

    // ✅ חישוב מחדש של התקציב הנותר
    await recalculateRemainingBudget(invoice.projectId);

    return updatedInvoice;
  },

  // 💸 עדכון סטטוס תשלום
  async updatePaymentStatus(user, invoiceId, status, paymentDate, paymentMethod) {
    // First find the invoice
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // בדיקת הרשאה - אם צריך (אופציונלי)
    if (invoice.createdBy && invoice.createdBy.toString() !== user._id.toString()) {
      throw new Error('אין לך הרשאה לעדכן חשבונית זו');
    }

    // Update the invoice - שים לב: השדה נקרא "paid" לא "paymentStatus"
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        paid: status, // ✅ שינוי מ-paymentStatus ל-paid
        ...(paymentDate && { paymentDate }),
        ...(paymentMethod && { paymentMethod })
      },
      {
        new: true,
        runValidators: false
      }
    );

    return updatedInvoice;
  },

  // 🔄 העברה בין פרויקטים
  async moveInvoice(user, invoiceId, newProjectId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("חשבונית לא נמצאה");

    const oldProjectId = String(invoice.projectId); // ✅ המר ל-string

    if (oldProjectId === String(newProjectId)) {
      return invoice;
    }

    const newProject = await Project.findById(newProjectId);
    if (!newProject) throw new Error("פרויקט יעד לא נמצא");

    // עדכון החשבונית
    invoice.projectId = newProjectId;
    invoice.projectName = newProject.name;
    const updated = await invoice.save();

    console.log(`🔄 מעביר חשבונית מפרויקט ${oldProjectId} לפרויקט ${newProjectId}`);

    // ✅ חישוב מחדש לשני הפרויקטים
    await recalculateRemainingBudget(oldProjectId);
    await recalculateRemainingBudget(newProjectId);

    return await Invoice.findById(updated._id).populate('projectId');
  },

  // 🗑️ מחיקה
  async deleteInvoice(user, invoiceId) {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.log("⚠️ חשבונית לא נמצאה למחיקה");
      return null;
    }

    // שמור projectId לפני המחיקה
    const projectId = invoice.projectId ? invoice.projectId.toString() : null;

    // מחיקה
    await Invoice.findByIdAndDelete(invoiceId);

    // עדכון תקציב - רק אם יש projectId
    if (projectId) {
      await recalculateRemainingBudget(projectId);
    }

    return true;
  }

};
