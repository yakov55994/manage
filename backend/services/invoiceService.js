import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Project from '../models/Project.js';

// שמות שדות שמותר לעדכן
const ALLOWED = [
  "invoiceNumber",
  "sum",
  "status",
  "invitingName",
  "detail",
  "paymentDate",
  "paid",
  "files",
  "createdAt",
  "documentType",
  "paymentMethod",
];

function parseMaybeJson(val) {
  if (typeof val !== "string") return val;
  try { return JSON.parse(val); } catch { return val; }
}

function normalizePayload(raw = {}) {
  const src = { ...raw };

  // תמיכה במקרה של FormData: files מגיע כמחרוזת JSON
  if (src.files) src.files = parseMaybeJson(src.files);

  // אם אתה שומר "כן"/"לא" כמחרוזת – השאר; אם הסכימה ב־Boolean, המר כאן:
  // const paidBool = src.paid === true || src.paid === "כן";
  // src.paid = paidBool;

  // תאריך תשלום: רק אם שולם "כן" ויש תאריך חוקי; אחרת ננקה
  if (!(src.paid === "כן" || src.paid === true)) {
    src.paymentDate = null;
  } else if (src.paymentDate === "אין תאריך לתשלום") {
    src.paymentDate = null;
  }

  // המרת createdAt לתאריך אם הגיע כמחרוזת
  if (src.createdAt) {
    const d = new Date(src.createdAt);
    if (!isNaN(d)) src.createdAt = d;
  }

  // סינון לפי allowlist + הוצאת undefined כדי לא למחוק ערכים קיימים
  const updates = {};
  for (const k of ALLOWED) {
    if (k in src && src[k] !== undefined) updates[k] = src[k];
  }
  return updates;
}

function normalizePaid(paid) {
  // תומך בבוליאני/מחרוזות שונות
  const truthy = paid === true || paid === 'true' || paid === 'כן' || paid === 'paid' || paid === '1';
  return truthy ? 'כן' : 'לא';
}

// המרה בטוחה: 'YYYY-MM-DD' -> ISO UTC בצהריים, או ניסיון ל-ISO קיים
function toSafePaymentDate(input) {
  if (!input) return null;
  try {
    // אם הגיע בפורמט YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }
    // אחרת ננסה לפרסר כ-ISO
    const dt = new Date(input);
    if (!Number.isNaN(dt.getTime())) return dt;
  } catch (_) {}
  return null;
}

function dateOnlyToUtc(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return null;
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  // יצירת תאריך ב־UTC (שעה 12:00 כדי להימנע מקפיצות יום ב־TZ)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

const DEFAULT_FIELDS =
  "_id invoiceNumber sum status paid paymentMethod createdAt paymentDate projectName projectId files supplierId";

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

 updateInvoiceService: async (id, invoiceData = {}) => {
  const updates = normalizePayload(invoiceData);

  const updated = await Invoice.findByIdAndUpdate(
    id,
    { $set: updates },
    {
      new: true,
      runValidators: true,
      context: "query",       // חשוב ל־enum/validators
      setDefaultsOnInsert: true,
    }
  );

  return updated;
},

    updatePaymentStatusService: async (id, { paid, paymentDate, paymentMethod }) => {
    // נבנה את הפאץ' לפי הלוגיקה המותנית
    const patch = { paid: paid === "כן" ? "כן" : "לא" };

    if (patch.paid === "כן") {
      // ולידציה בסיסית ברמת השירות (מעבר ל-validators של הסכמה)
      if (!paymentDate) throw new Error("חסר תאריך תשלום");
      if (!paymentMethod) throw new Error("חסר אמצעי תשלום");

      patch.paymentDate = paymentDate instanceof Date
        ? paymentDate
        : dateOnlyToUtc(paymentDate); // אם הגיע מחרוזת

      patch.paymentMethod = paymentMethod; // "check" | "bank_transfer"
    } else {
      // כשלא שולם – מנקים
      patch.paymentDate = null;
      patch.paymentMethod = ""; // מחרוזת ריקה, לא null
    }

    // חשוב: runValidators כדי שמגבלות הסכמה יופעלו
    const updated = await Invoice.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    return updated;
  
  },

 updatePaymentDate : async (id, paid, paymentDate) => {
  const paidNormalized = normalizePaid(paid);

  const update = { paid: paidNormalized };

  if (paidNormalized === 'כן') {
    const parsed = toSafePaymentDate(paymentDate);
    update.paymentDate = parsed || new Date(); // אם לא נשלח תאריך/לא תקין – עכשיו
  } else {
    update.paymentDate = null; // לא שולם => ננקה תאריך
  }

  const updated = await Invoice.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );

  return updated; // יכול להיות null אם לא נמצא
},

  deleteInvoiceById: async (id) => {
    try {

      const invoice = await Invoice.findOne({ _id: id});

      if (!invoice) {
        throw new Error('חשבונית לא נמצאה');
      }

      const { invoiceNumber, projectName } = invoice;
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
  },

  moveInvoiceToProject: async (invoiceId, toProjectIdOrName) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) throw new Error('Invoice not found');

      const sum = Number(invoice.sum) || 0;

      // זיהוי פרויקט יעד
      const toProject = mongoose.isValidObjectId(toProjectIdOrName)
        ? await Project.findById(toProjectIdOrName).session(session)
        : await Project.findOne({ name: toProjectIdOrName }).session(session);

      if (!toProject) throw new Error('Target project not found');

      // אם כבר משויך לאותו פרויקט – אין מה לעשות
      const fromProjectId = invoice.projectId || null;
      if (fromProjectId && String(fromProjectId) === String(toProject._id)) {
        result = { invoice, fromProject: null, toProject };
        return;
      }

      // פרויקט מקור (אופציונלי – אם יש)
      const fromProject = fromProjectId
        ? await Project.findById(fromProjectId).session(session)
        : null;

      // 1) הסרה מהפרויקט הישן + החזרת התקציב
      if (fromProject) {
        await Project.findByIdAndUpdate(
          fromProject._id,
          {
            $pull: { invoices: invoice._id },
            $inc: { remainingBudget: sum }  // מחזיר תקציב למקור
          },
          { new: true, session }
        );
      }

      // 2) הוספה לפרויקט החדש + הורדת תקציב
      await Project.findByIdAndUpdate(
        toProject._id,
        {
          $addToSet: { invoices: invoice._id },
          $inc: { remainingBudget: -sum }   // מנכה תקציב ביעד
        },
        { new: true, session }
      );

      // 3) עדכון החשבונית עצמה
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        { projectId: toProject._id, projectName: toProject.name },
        { new: true, session }
      );

      result = { invoice: updatedInvoice, fromProject, toProject };
    });

    return result;
  } finally {
    session.endSession();
  }
},

listInvoicesBySupplier: async (
  supplierId,
  {
    page = 1,
    limit = 50,
    withPopulate = false,     // אם ב־DB יש רק projectId ואתה צריך שם פרויקט
    fields = DEFAULT_FIELDS,
    sort = { createdAt: -1 },
    lean = true,              // ביצועים
  } = {}
) => {
  if (!supplierId) {
    throw new Error("supplierId is required");
  }

  // אם supplierId הוא ObjectId במודל
  const filter = {
    supplierId: mongoose.isValidObjectId(supplierId)
      ? new mongoose.Types.ObjectId(supplierId)
      : supplierId,
  };

  const skip = (Number(page) - 1) * Number(limit);
  const query = Invoice.find(filter).select(fields).sort(sort).skip(skip).limit(Number(limit));

  if (withPopulate) {
    // אם projectId הוא רפרנס ל-Project וצריך את name
    query.populate({ path: "projectId", select: "name", model: "Project" });
  }

  if (lean) query.lean();

  const [data, total] = await Promise.all([
    query.exec(),
    Invoice.countDocuments(filter),
  ]);

  // אם ביקשת populate, אבל אתה מראה projectName בטבלה – נמפה אותו
  let normalized = data;
  if (withPopulate && data?.length) {
    normalized = data.map((inv) => ({
      ...inv,
      projectName: inv.projectName || inv?.projectId?.name || null,
    }));
  }

  return {
    data: normalized,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit || 1)) || 1,
  };
}
}

export default invoiceService;

