// services/invoiceService.js
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Project from '../models/Project.js';

// שדות שמותר לעדכן
const ALLOWED = [
  'invoiceNumber',
  'sum',
  'status',
  'invitingName',
  'detail',
  'paymentDate',
  'paid',
  'files',
  'createdAt',
  'documentType',
  'paymentMethod',
];

function parseMaybeJson(val) {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}

function normalizePayload(raw = {}) {
  const src = { ...raw };

  if (src.files) src.files = parseMaybeJson(src.files);

  if (!(src.paid === 'כן' || src.paid === true)) {
    src.paymentDate = null;
  } else if (src.paymentDate === 'אין תאריך לתשלום') {
    src.paymentDate = null;
  }

  if (src.createdAt) {
    const d = new Date(src.createdAt);
    if (!isNaN(d)) src.createdAt = d;
  }

  const updates = {};
  for (const k of ALLOWED) {
    if (k in src && src[k] !== undefined) updates[k] = src[k];
  }
  return updates;
}

function normalizePaid(paid) {
  const truthy = paid === true || paid === 'true' || paid === 'כן' || paid === 'paid' || paid === '1';
  return truthy ? 'כן' : 'לא';
}

// 'YYYY-MM-DD' -> Date UTC 12:00
function toSafePaymentDate(input) {
  if (!input) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }
    const dt = new Date(input);
    if (!Number.isNaN(dt.getTime())) return dt;
  } catch (_) {}
  return null;
}

function dateOnlyToUtc(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return null;
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

const DEFAULT_FIELDS =
  '_id invoiceNumber sum status paid paymentMethod createdAt paymentDate projectName projectId files supplierId';

const invoiceService = {
  // ➕ יצירת חשבוניות (מצופות עם projectId על כל אובייקט; הקונטרולר דואג להזריק)
  async createInvoices(invoicesData) {
    try {
      // בדיקת כפילות פר־ספק+מספר חשבונית (אפשר להוסיף גם projectId אם תרצה)
      for (const invoiceData of invoicesData) {
        const existing = await Invoice.findOne({
          invitingName: (invoiceData.invitingName || '').trim(),
          invoiceNumber: invoiceData.invoiceNumber,
          // projectId: invoiceData.projectId, // ← אם תרצה שהכפילות תיבדק פר פרויקט
        });
        if (existing) {
          const msg = `לספק "${invoiceData.invitingName}" כבר קיימת חשבונית עם מספר "${invoiceData.invoiceNumber}"`;
          console.error(msg);
          throw new Error(msg);
        }
      }

      // יצירה
      const newInvoices = await Invoice.insertMany(invoicesData);

      // עדכון פרויקטים לפי projectId (לא לפי name)
      const updates = newInvoices
        .filter(inv => !!inv.projectId)
        .map(inv => ({
          updateOne: {
            filter: { _id: inv.projectId },
            update: {
              $push: { invoices: inv._id },
              $inc: { remainingBudget: -Number(inv.sum || 0) },
            },
          },
        }));

      if (updates.length) {
        await Project.bulkWrite(updates);
      }

      return newInvoices;
    } catch (err) {
      console.error('שגיאה ביצירת חשבוניות:', err);
      throw new Error(`שגיאה ביצירת חשבוניות: ${err.message}`);
    }
  },

  // 🔎 חיפוש בפרויקט
  async search(projectId, query) {
    if (!projectId) throw new Error('projectId is required');
    const q = (query || '').trim();
    const filter = { projectId };

    if (q) {
      Object.assign(filter, {
        $or: [
          { invoiceNumber: q },
          { description: { $regex: q, $options: 'i' } },
          { projectName: { $regex: q, $options: 'i' } },
          { invitingName: { $regex: q, $options: 'i' } },
        ],
      });
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    return { invoices };
  },

  // ❗ אופציונלי (אדמין בלבד): רשימת כל החשבוניות
  async getAllInvoices() {
    const invoices = await Invoice.find()
      .populate({ path: 'supplierId', select: 'name phone bankDetails' })
      .sort({ createdAt: -1 });

    return invoices.map(inv => {
      const obj = inv.toObject();
      return { ...obj, supplier: obj.supplierId || null };
    });
  },

  // 📄 חשבונית לפי ID בפרויקט
  async getInvoiceById(id) {
    return Invoice.findOne({ _id: id }).populate('files');
  },

  // 📃 חשבוניות בפרויקט (עם עמודים)
  async getInvoicesByProject(projectId, { page = 1, limit = 50, q } = {}) {

    const filter = { projectId };
    if (q) {
      Object.assign(filter, {
        $or: [
          { invoiceNumber: q },
          { description: { $regex: q, $options: 'i' } },
          { invitingName: { $regex: q, $options: 'i' } },
        ],
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Invoice.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit || 1)) || 1,
    };
  },

  // ✏️ עדכון חשבונית בפרויקט
  async updateInvoiceService(projectId, id, invoiceData = {}) {
    if (!projectId) throw new Error('projectId is required');
    const updates = normalizePayload(invoiceData);

    return Invoice.findOneAndUpdate(
      { _id: id, projectId },
      { $set: updates },
      { new: true, runValidators: true, context: 'query', setDefaultsOnInsert: true }
    );
  },

  // ✏️ עדכון סטטוס/תשלום בפרויקט
  async updatePaymentStatusService(projectId, id, { paid, paymentDate, paymentMethod }) {
    if (!projectId) throw new Error('projectId is required');

    const patch = { paid: paid === 'כן' ? 'כן' : 'לא' };

    if (patch.paid === 'כן') {
      if (!paymentDate) throw new Error('חסר תאריך תשלום');
      if (!paymentMethod) throw new Error('חסר אמצעי תשלום');

      patch.paymentDate = paymentDate instanceof Date ? paymentDate : dateOnlyToUtc(paymentDate);
      patch.paymentMethod = paymentMethod; // 'check' | 'bank_transfer'
    } else {
      patch.paymentDate = null;
      patch.paymentMethod = '';
    }

    return Invoice.findOneAndUpdate(
      { _id: id, projectId },
      patch,
      { new: true, runValidators: true }
    );
  },

  // ✏️ עדכון תאריך תשלום (פשוט) בפרויקט
  async updatePaymentDate(projectId, id, paid, paymentDate) {
    if (!projectId) throw new Error('projectId is required');
    const paidNormalized = normalizePaid(paid);
    const update = { paid: paidNormalized };

    if (paidNormalized === 'כן') {
      const parsed = toSafePaymentDate(paymentDate);
      update.paymentDate = parsed || new Date();
    } else {
      update.paymentDate = null;
    }

    return Invoice.findOneAndUpdate(
      { _id: id, projectId },
      { $set: update },
      { new: true, runValidators: true }
    );
  },

  // 🗑️ מחיקת חשבונית בפרויקט (ומעדכן remainingBudget בפרויקט)
  async deleteInvoiceById(projectId, id) {
    if (!projectId) throw new Error('projectId is required');

    const session = await mongoose.startSession();
    try {
      let updatedProject = null;

      await session.withTransaction(async () => {
        const invoice = await Invoice.findOne({ _id: id, projectId }).session(session);
        if (!invoice) throw new Error('חשבונית לא נמצאה');

        const sum = Number(invoice.sum) || 0;

        await Invoice.deleteOne({ _id: id, projectId }).session(session);

        updatedProject = await Project.findByIdAndUpdate(
          projectId,
          {
            $pull: { invoices: invoice._id },
            $inc: { remainingBudget: sum },
          },
          { new: true, session }
        );
      });

      return updatedProject;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw new Error('שגיאה במחיקת החשבונית');
    } finally {
      session.endSession();
    }
  },

  // 🔁 העברת חשבונית בין פרויקטים
  async moveInvoiceToProject(invoiceId, toProjectId, fromProjectId) {
    const session = await mongoose.startSession();
    try {
      let result;

      await session.withTransaction(async () => {
        const invoice = await Invoice.findOne({ _id: invoiceId }).session(session);
        if (!invoice) throw new Error('Invoice not found');

        const sum = Number(invoice.sum) || 0;

        const toProject = await Project.findById(toProjectId).session(session);
        if (!toProject) throw new Error('Target project not found');

        const fromPid = fromProjectId || invoice.projectId || null;

        // אם אין שינוי—לצאת
        if (fromPid && String(fromPid) === String(toProject._id)) {
          result = { invoice, fromProject: null, toProject };
          return;
        }

        // 1) הסרה ממקור + החזרת תקציב
        if (fromPid) {
          await Project.findByIdAndUpdate(
            fromPid,
            {
              $pull: { invoices: invoice._id },
              $inc: { remainingBudget: sum },
            },
            { new: true, session }
          );
        }

        // 2) הוספה ליעד + הורדת תקציב
        await Project.findByIdAndUpdate(
          toProject._id,
          {
            $addToSet: { invoices: invoice._id },
            $inc: { remainingBudget: -sum },
          },
          { new: true, session }
        );

        // 3) עדכון החשבונית
        const updatedInvoice = await Invoice.findByIdAndUpdate(
          invoiceId,
          { projectId: toProject._id, projectName: toProject.name },
          { new: true, session }
        );

        result = { invoice: updatedInvoice, fromProject: fromPid, toProject };
      });

      return result;
    } finally {
      session.endSession();
    }
  },

  // 📑 חשבוניות לפי ספק בתוך פרויקט
  async listInvoicesBySupplier(supplierId, {
    page = 1,
    limit = 50,
    withPopulate = false,
    fields = DEFAULT_FIELDS,
    sort = { createdAt: -1 },
    lean = true,
  } = {}) {
    if (!supplierId) throw new Error('supplierId is required');

    const filter = {
      supplierId: mongoose.isValidObjectId(supplierId)
        ? new mongoose.Types.ObjectId(supplierId)
        : supplierId,
    };

    const skip = (Number(page) - 1) * Number(limit);
    const query = Invoice.find(filter).select(fields).sort(sort).skip(skip).limit(Number(limit));


    if (lean) query.lean();

    const [data, total] = await Promise.all([
      query.exec(),
      Invoice.countDocuments(filter),
    ]);

    let normalized = data;

    return {
      data: normalized,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit || 1)) || 1,
    };
  },
};

export default invoiceService;
