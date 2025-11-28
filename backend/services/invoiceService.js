import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";

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

  // 🔻 הורדת סכום החשבונית מהתקציב הנותר
  project.remainingBudget -= Number(data.sum);
  await project.save();

  // ✅ הוספת פרטי המשתמש שיצר את החשבונית
  const invoiceData = {
    ...data,
    createdBy: user._id,
    createdByName: user.username || user.name || 'משתמש'
  };

  return Invoice.create(invoiceData);
},

  // ✏️ עדכון חשבונית
  async updateInvoice(user, invoiceId, data) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  const project = await Project.findById(invoice.projectId);

  // 🟦 חשב את ההפרש בין סכום חדש לישן
  const oldSum = Number(invoice.sum);
  const newSum = Number(data.sum ?? invoice.sum);
  const diff = newSum - oldSum;

  // 🔻 הורד מהתקציב הנותר (אם סכום עלה diff חיובי — מוריד יותר)
  project.remainingBudget -= diff;
  await project.save();

  return Invoice.findByIdAndUpdate(invoiceId, data, { new: true });
},

  // 💸 עדכון סטטוס תשלום
async updatePaymentStatus(user, invoiceId, status, paymentDate, paymentMethod) {
  console.log("==================");
  console.log("🔍 invoiceId:", invoiceId);
  console.log("🔍 status:", status);
  console.log("🔍 paymentDate:", paymentDate);
  console.log("==================");
  
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  // ✅ עדכן ישירות את השדות
  invoice.paid = status;
  invoice.paymentDate = paymentDate;
  invoice.paymentMethod = paymentMethod || null;
  
  // ✅ שמור
  await invoice.save();
  
  console.log("✅ Updated invoice:", invoice);
  
  return invoice;
},

  // 🔄 העברה בין פרויקטים
  async moveInvoice(user, invoiceId, newProjectId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  const oldProjectId = invoice.projectId;
  const amount = Number(invoice.sum);

  if (String(oldProjectId) === String(newProjectId)) {
    return invoice; // לא צריכים לעשות כלום
  }

  // ▪ הבאת שני הפרויקטים
  const oldProject = await Project.findById(oldProjectId);
  const newProject = await Project.findById(newProjectId);

  if (!newProject) throw new Error("פרויקט יעד לא נמצא");

  // ▪ החזרת סכום לפרויקט הישן
  if (oldProject) {
    oldProject.remainingBudget += amount;
    await oldProject.save();
  }

  // ▪ הורדת סכום מהפרויקט החדש
  newProject.remainingBudget -= amount;
  await newProject.save();

  // ▪ עדכון החשבונית לשייך לפרויקט החדש
  return Invoice.findByIdAndUpdate(
    invoiceId,
    { projectId: newProjectId },
    { new: true }
  );
},

  // 🗑️ מחיקה
  async deleteInvoice(user, invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  const project = await Project.findById(invoice.projectId);
  project.remainingBudget += Number(invoice.sum); // מחזיר כסף
  await project.save();

  return Invoice.findByIdAndDelete(invoiceId);
}

};
