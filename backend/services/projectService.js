// services/projectService.js
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const projectService = {
  // ➕ יצירת פרויקט
  async createProject(data) {
    try {
      const cleaned = {
        ...data,
        name: String(data?.name || '').trim(),
      };
      const project = new Project(cleaned);
      await project.save();
      return project;
    } catch (err) {
      throw new Error('Error creating project');
    }
  },

  // 🧾 הוספת חשבונית לפרויקט (מומלץ בדרך כלל לבצע דרך invoiceService.createInvoices)
  async addInvoiceToProject(projectId, invoiceData) {
    if (!isValidId(projectId)) throw new Error('ה-ID של הפרויקט לא תקין');

    const session = await mongoose.startSession();
    try {
      let newInvoice;

      await session.withTransaction(async () => {
        const project = await Project.findById(projectId).session(session);
        if (!project) throw new Error('פרויקט לא נמצא');

        // בדיקת כפילות (אופציונלי להוסיף גם projectId לסקופ הכפילות)
        const dup = await Invoice.findOne({
          invoiceNumber: invoiceData.invoiceNumber,
          invitingName: invoiceData.invitingName,
          projectId, // ← כפילות בתוך אותו פרויקט בלבד
        }).session(session);
        if (dup) {
          throw new Error(`חשבונית מספר "${invoiceData.invoiceNumber}" כבר קיימת עבור "${invoiceData.invitingName}" בפרויקט זה`);
        }

        // יצירת חשבונית
        newInvoice = await Invoice.create(
          [{
            invoiceNumber: invoiceData.invoiceNumber,
            projectName: project.name,  // לשימוש UI בלבד
            projectId: project._id,     // מקור האמת
            sum: invoiceData.sum,
            status: invoiceData.status,
            invitingName: invoiceData.invitingName,
            detail: invoiceData.detail,
            paid: invoiceData.paid,
            paymentDate: invoiceData.paymentDate || null,
            createdAt: invoiceData.createdAt || new Date(),
            files: Array.isArray(invoiceData.files) ? invoiceData.files : [],
            documentType: invoiceData.documentType || undefined,
            paymentMethod: invoiceData.paymentMethod || '',
            supplierId: invoiceData.supplierId || undefined,
          }],
          { session }
        ).then(arr => arr[0]);

        // עדכון תקציב + קישור החשבונית (ObjectId)
        const delta = Number(newInvoice.sum || 0);
        await Project.findByIdAndUpdate(
          project._id,
          {
            $addToSet: { invoices: newInvoice._id },
            $inc: { remainingBudget: -delta },
          },
          { new: true, session }
        );
      });

      return newInvoice;
    } finally {
      session.endSession();
    }
  },

  // 📃 כל הפרויקטים (ניתן להעביר filter מבחוץ – למשל req.queryFilter)
  async getAllProjects(filter = {}, { sort = { createdAt: -1 }, lean = true } = {}) {
    const q = Project.find(filter).sort(sort);
    if (lean) q.lean();
    return q.exec();
  },

  // 📄 פרויקט לפי ID
  async getProjectById(id, { populate = false, lean = true } = {}) {
    if (!isValidId(id)) throw new Error('ID לא תקין');
    let q = Project.findById(id);
    if (populate) {
      q = q
        .populate({ path: 'invoices', select: 'invoiceNumber sum status paid paymentDate createdAt' })
        .populate({ path: 'orders', select: 'orderNumber sum status createdAt' });
    }
    if (lean) q.lean();
    return q.exec();
  },

  // ✏️ עדכון פרויקט (מינימלי; משאיר שליטה למה לעדכן)
  async updateProject(id, projectData = {}) {
    if (!isValidId(id)) throw new Error('ID לא תקין');

    // הגנה רכה: לא מאפשרים לשנות _id/שדות מערכת
    const disallow = ['_id', 'createdAt', 'updatedAt'];
    disallow.forEach(k => delete projectData[k]);

    // אם רוצים לעדכן רק remainingBudget (כמו בקוד הישן) זה עדיין נתמך
    const updated = await Project.findByIdAndUpdate(
      id,
      { $set: projectData },
      { new: true, runValidators: true }
    );
    return updated;
  },

  // 🗑️ מחיקת פרויקט (מוחק גם חשבוניות/הזמנות ע"פ projectId)
  async deleteProjectById(id) {
    if (!isValidId(id)) throw new Error('❌ ID של הפרויקט לא תקין');

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const proj = await Project.findById(id).session(session);
        if (!proj) throw new Error('⚠️ פרויקט לא נמצא בבסיס הנתונים');

        // מחיקת חשבוניות והזמנות לפי projectId (לא לפי projectName)
        await Invoice.deleteMany({ projectId: id }).session(session);
        await Order.deleteMany({ projectId: id }).session(session);

        // מחיקת הפרויקט
        const del = await Project.findByIdAndDelete(id).session(session);
        if (!del) throw new Error('❌ שגיאה במחיקת הפרויקט');
      });

      return { message: '✅ הפרויקט וכל המסמכים המשויכים נמחקו בהצלחה' };
    } catch (err) {
      console.error('❌ שגיאה במחיקת הפרויקט:', err.message);
      throw new Error(err.message || '❌ שגיאה לא ידועה במחיקת הפרויקט');
    } finally {
      session.endSession();
    }
  },

  // 🔎 חיפוש פרויקטים לפי שם
  async search(query) {
    if (query === undefined || query === null) {
      throw new Error('מילת חיפוש לא נמצאה');
    }
    const regex = query === '0' || !isNaN(query) ? String(query) : new RegExp(String(query), 'i');
    return Project.find({ name: { $regex: regex } }).sort({ createdAt: -1 }).lean();
  },

  // 📦 הזמנות לפי projectId
  async getOrdersByProjectId(projectId) {
    if (!isValidId(projectId)) throw new Error('ID לא תקין');
    // עדיף לא להסתמך על project.orders אם הוא מערך מוטמע; נשלוף מהקולקציה
    return Order.find({ projectId }).sort({ createdAt: -1 }).lean();
  },
};

export default projectService;
