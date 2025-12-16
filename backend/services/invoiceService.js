// ===============================================
// INVOICE SERVICE – MULTI-PROJECT SYSTEM + SALARY
// ===============================================

import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";

// ===================================================
// עוזר לחישוב סכומים
// ===================================================
const sumInvoices = (list) =>
  list.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

// ===================================================
// חישוב תקציב מחדש
// ===================================================
export const recalculateRemainingBudget = async (projectId) => {
  if (!projectId) return;

  const project = await Project.findById(projectId);
  if (!project) return;

  const isMilga = project.name === "מילגה";

  if (isMilga) {
    project.remainingBudget = project.budget;
    await project.save();
    return;
  }

  // 1️⃣ חשבוניות רגילות של הפרויקט (לא כולל משכורות ולא מילגה)
  const regularInvoices = await Invoice.find({
    "projects.projectId": projectId,
    type: { $ne: "salary" },
    fundedFromProjectId: { $exists: false }, // לא חשבוניות מילגה
  });

  // 2️⃣ חשבוניות מילגה שממומנות מהפרויקט הזה
  const milgaInvoices = await Invoice.find({
    fundedFromProjectId: projectId,
  });

  // 3️⃣ חשבוניות משכורות (type = salary)
  const salaryInvoices = await Invoice.find({
    type: "salary",
    "projects.projectId": projectId,
  });

  // ✅ כעת כל חשבונית נספרת פעם אחת בלבד:
  // - רגילות: נספרות רק אם אין fundedFromProjectId
  // - מילגה: נספרות רק בפרויקט שממנו הן ממומנות
  // - משכורות: נספרות בפרויקט שלהן
  const totalSpent =
    sumInvoices(regularInvoices) +
    sumInvoices(milgaInvoices) +
    sumInvoices(salaryInvoices);

  project.remainingBudget = project.budget - totalSpent;
  await project.save();
};

// ===============================================
// SEARCH
// ===============================================
async function searchInvoices(query) {
  const regex = new RegExp(query, "i");

  return Invoice.find({
    $or: [
      { invoiceNumber: regex },
      { detail: regex },
      { status: regex },
      { invitingName: regex },
    ],
  }).limit(50);
}

// ===============================================
// GET ALL INVOICES לפי הרשאות
// ===============================================
async function getInvoices(user) {
  let query = {};

  // אדמין ו-accountant רואים הכל
  if (user.role === "admin" || user.role === "accountant") {
    // אין סינון - רואה הכל
  } else {
    // משתמש רגיל - סנן לפי הרשאות
    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );

    // סנן לפי פרויקטים במערך projects או לפי fundedFromProjectId
    query = {
      $or: [
        { "projects.projectId": { $in: allowed } },
        { fundedFromProjectId: { $in: allowed } }
      ]
    };
  }

  return Invoice.find(query)
    .populate("supplierId")
    .populate("projects.projectId", "name invitingName")
    .populate("fundedFromProjectId", "name");
}

// ===============================================
// GET INVOICE BY ID
// ===============================================
async function getInvoiceById(user, invoiceId) {
  const invoice = await Invoice.findById(invoiceId)
    .populate("supplierId")
    .populate("projects.projectId", "name invitingName budget remainingBudget")
    .populate("fundedFromProjectId", "name");

  if (!invoice) return null;

  // אדמין ו-accountant רואים הכל
  if (user.role === "admin" || user.role === "accountant") {
    return invoice;
  }

  // משתמש רגיל - בדוק הרשאות
  const allowed = user.permissions.map(
    (p) => String(p.project?._id || p.project)
  );

  const projectIds = invoice.projects.map((p) =>
    String(p.projectId._id || p.projectId)
  );

  const canView = projectIds.some((id) => allowed.includes(id));
  if (!canView) throw new Error("אין לך הרשאה לצפות במסמך זה");

  return invoice;
}

// ===============================================
// יצירת חשבונית משכורות
// ===============================================
async function createSalaryInvoice(user, data) {
  const {
    salaryEmployeeName,
    salaryBaseAmount,
    salaryOverheadPercent,
    fundedFromProjectId,
    detail,
    files = [],
  } = data;

  if (!fundedFromProjectId)
    throw new Error("חובה לבחור פרויקט ממנו נלקחת המשכורות");

  // 📌 1) פרויקט המשכורות (תיקייה בלבד)
  const salaryProject = await Project.findOne({ type: "salary" });
  if (!salaryProject)
    throw new Error("לא קיים פרויקט משכורות במערכת");

  // 📌 2) הפרויקט ממנו יורד התקציב
  const budgetProject = await Project.findById(fundedFromProjectId);
  if (!budgetProject)
    throw new Error("פרויקט התקציב לא נמצא");

  // 📌 3) חישובי תקורה
  const base = Number(salaryBaseAmount || 0);
  const overhead = Number(salaryOverheadPercent || 0);
  const final = base * (1 + overhead / 100);

  // 📌 4) יצירת חשבונית משכורות
  const invoice = await Invoice.create({
    type: "salary",
    invoiceNumber: data.invoiceNumber,
    documentType: "משכורות",
    supplierId: null,

    salaryEmployeeName,
    salaryBaseAmount: base,
    salaryOverheadPercent: overhead,
    salaryFinalAmount: final,

    totalAmount: final,
    detail: detail || "",

    projects: [
      {
        projectId: salaryProject._id,   // פרויקט משכורות – רק לצפייה
        projectName: salaryProject.name,
        sum: 0,                         // ←← חשוב! לא יורד ממנו תקציב
      },
      {
        projectId: fundedFromProjectId, // ← הפרויקט שממנו יורד התקציב
        projectName: budgetProject.name,
        sum: final,                     // ← זה כן יורד מהתקציב
      },
    ],

    files,
    fundedFromProjectId,
    createdBy: user._id,
    createdByName: user.username || user.name,
  });

  // 📌 5) שיוך לחשבוניות של פרויקט משכורות
  await Project.findByIdAndUpdate(salaryProject._id, {
    $addToSet: { invoices: invoice._id },
  });

  // 📌 6) שיוך לפרויקט ממנו יורד התקציב
  await Project.findByIdAndUpdate(fundedFromProjectId, {
    $addToSet: { invoices: invoice._id },
  });

  // 📌 7) חישוב תקציב
  await recalculateRemainingBudget(fundedFromProjectId);

  return invoice;
}



// ===============================================
// CREATE INVOICE (רגיל + משכורות)
// ===============================================
async function createInvoice(user, data) {
  // אם משכורות → מנותב לפונקציה נפרדת
  if (data.type === "salary") {
    return createSalaryInvoice(user, data);
  }

  const { projects, files, fundedFromProjectId, supplierId, ...basic } = data;

  if (!projects || !projects.length)
    throw new Error("חובה לבחור לפחות פרויקט אחד");

  if (!supplierId) throw new Error("חובה לבחור ספק");

  // הרשאות
  if (user.role !== "admin") {
    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );

    for (const p of projects) {
      if (!allowed.includes(String(p.projectId))) {
        throw new Error("אין הרשאה להוסיף מסמך לפרויקט זה");
      }
    }
  }

  const totalAmount = projects.reduce(
    (sum, p) => sum + Number(p.sum),
    0
  );

  const invoice = await Invoice.create({
    ...basic,
    supplierId,
    projects,
    totalAmount,
    files,
    fundedFromProjectId: fundedFromProjectId || null,
    createdBy: user._id,
    createdByName: user.username || user.name,
  });

  // הוספה לפרויקטים
  for (const p of projects) {
    await Project.findByIdAndUpdate(p.projectId, {
      $push: { invoices: invoice._id },
    });
    await recalculateRemainingBudget(p.projectId);
  }

  // הוספה לספק
  await Supplier.findByIdAndUpdate(supplierId, {
    $push: { invoices: invoice._id },
  });

  if (invoice.fundedFromProjectId) {
    await recalculateRemainingBudget(invoice.fundedFromProjectId);
  }

  return invoice;
}

// ===============================================
// UPDATE INVOICE
// ===============================================
async function updateInvoice(user, invoiceId, data) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  // לא תומכים בעריכת סוג משכורות פה (בשלב ראשון)
  if (invoice.type === "salary") {
    throw new Error("לא ניתן לערוך חשבונית משכורות כרגע");
  }

  const oldProjects = invoice.projects.map((p) =>
    p.projectId.toString()
  );

  const {
    projects: newProjects,
    files: newFiles = [],
    fundedFromProjectId,
    ...basic
  } = data;

  // מיזוג קבצים - הוסף רק קבצים חדשים שאין להם URL זהה
  const mergedFiles = [
    ...invoice.files,
    ...newFiles.filter(
      (f) => !invoice.files.some((old) => old.url === f.url)
    ),
  ];

  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      ...basic,
      projects: newProjects,
      totalAmount: newProjects.reduce(
        (sum, p) => sum + Number(p.sum),
        0
      ),
      files: mergedFiles,
      fundedFromProjectId: fundedFromProjectId || null,
    },
    { new: true }
  );

  const newProjectIds = newProjects.map((p) =>
    p.projectId.toString()
  );

  for (const oldId of oldProjects) {
    if (!newProjectIds.includes(oldId)) {
      await Project.findByIdAndUpdate(oldId, {
        $pull: { invoices: invoiceId },
      });
      await recalculateRemainingBudget(oldId);
    }
  }

  for (const p of newProjects) {
    await Project.findByIdAndUpdate(p.projectId, {
      $addToSet: { invoices: invoiceId },
    });
    await recalculateRemainingBudget(p.projectId);
  }

  if (updated.fundedFromProjectId) {
    await recalculateRemainingBudget(updated.fundedFromProjectId);
  }

  return updated;
}

// ===============================================
// MOVE INVOICE
// ===============================================
async function moveInvoice(user, invoiceId, fromProjectId, toProjectId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  if (invoice.type === "salary")
    throw new Error("אי אפשר להעביר חשבונית משכורות");

  fromProjectId = String(fromProjectId);
  toProjectId = String(toProjectId);

  // מצא את החלק של הפרויקט המקורי
  const partIndex = invoice.projects.findIndex((p) => {
    const pid = p?.projectId?._id || p?.projectId;
    return String(pid) === fromProjectId;
  });

  if (partIndex === -1)
    throw new Error("החשבונית לא משויכת לפרויקט המקורי");

  const part = invoice.projects[partIndex];

  // בדיקת הרשאות
  if (user.role !== "admin") {
    // רואה חשבון יכול לראות הכל אבל לא לעדכן
    if (user.role === "accountant") {
      throw new Error("רואה חשבון לא יכול להעביר חשבוניות");
    }

    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );
    if (
      !allowed.includes(fromProjectId) ||
      !allowed.includes(toProjectId)
    ) {
      throw new Error("אין הרשאה להעביר חשבונית בין הפרויקטים הללו");
    }

    // בדוק שיש הרשאת edit לשני הפרויקטים
    const hasEditFrom = user.permissions.some(
      (p) => String(p.project?._id || p.project) === fromProjectId && p.modules?.invoices === "edit"
    );
    const hasEditTo = user.permissions.some(
      (p) => String(p.project?._id || p.project) === toProjectId && p.modules?.invoices === "edit"
    );

    if (!hasEditFrom || !hasEditTo) {
      throw new Error("נדרשת הרשאת עריכה לשני הפרויקטים");
    }
  }

  // בדוק שפרויקט היעד קיים
  const newProject = await Project.findById(toProjectId).select("name");
  if (!newProject) throw new Error("פרויקט יעד לא נמצא");

  // בדוק אם החשבונית כבר משויכת לפרויקט היעד
  const existingTargetIndex = invoice.projects.findIndex((p) => {
    const pid = p?.projectId?._id || p?.projectId;
    return String(pid) === toProjectId;
  });

  if (existingTargetIndex !== -1) {
    // אם החשבונית כבר קיימת בפרויקט היעד - צרף את הסכומים
    invoice.projects[existingTargetIndex].sum =
      Number(invoice.projects[existingTargetIndex].sum) + Number(part.sum);

    // הסר את החלק המקורי
    invoice.projects.splice(partIndex, 1);
  } else {
    // אם החשבונית לא קיימת בפרויקט היעד - עדכן את ה-projectId
    invoice.projects[partIndex] = {
      projectId: toProjectId,
      projectName: newProject.name,
      sum: part.sum,
    };
  }

  // חשב מחדש את הסכום הכולל
  invoice.totalAmount = invoice.projects.reduce(
    (sum, p) => sum + Number(p?.sum || 0),
    0
  );

  // שמור את השינויים
  await invoice.save();

  // עדכן את רשימת החשבוניות בפרויקטים
  await Project.findByIdAndUpdate(fromProjectId, {
    $pull: { invoices: invoiceId },
  });
  await Project.findByIdAndUpdate(toProjectId, {
    $addToSet: { invoices: invoiceId },
  });

  // חשב מחדש תקציבים
  await recalculateRemainingBudget(fromProjectId);
  await recalculateRemainingBudget(toProjectId);

  // טען מחדש את החשבונית עם populate
  const populated = await Invoice.findById(invoice._id)
    .populate("projects.projectId", "name invitingName")
    .populate("supplierId", "name phone email bankDetails")
    .populate("fundedFromProjectId", "name");

  if (!populated) throw new Error("שגיאה בטעינת החשבונית לאחר ההעברה");

  // וודא שכל הפרויקטים מכילים את שם הפרויקט
  if (populated.projects) {
    populated.projects = populated.projects.map((p) => ({
      projectId: p.projectId?._id || p.projectId,
      projectName: p.projectId?.name || p.projectName || "",
      sum: p.sum,
      invitingName: p.invitingName || p.projectId?.invitingName || "",
    }));
  }

  return populated;
}

// ===============================================
// UPDATE PAYMENT STATUS
// ===============================================
async function updatePaymentStatus(
  user,
  invoiceId,
  status,
  date,
  method,
  checkNumber,
  checkDate
) {
  const updateData = {
    paid: status,
    ...(date && { paymentDate: date }),
    ...(method && { paymentMethod: method }),
  };

  if (status === "כן" && method === "check") {
    if (checkNumber) updateData.checkNumber = checkNumber;
    if (checkDate) updateData.checkDate = checkDate;
  } else {
    updateData.checkNumber = null;
    updateData.checkDate = null;
  }

  return Invoice.findByIdAndUpdate(invoiceId, updateData, {
    new: true,
  }).populate("supplierId", "name phone email bankDetails");
}

// ===============================================
// DELETE
// ===============================================
async function deleteInvoice(user, invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;

  const projectIds = invoice.projects
    .map((p) => (p.projectId ? p.projectId.toString() : null))
    .filter(Boolean);

  await invoice.deleteOne();

  for (const pid of projectIds) {
    await Project.findByIdAndUpdate(pid, {
      $pull: { invoices: invoiceId },
    });

    await recalculateRemainingBudget(pid);
  }

  if (invoice.fundedFromProjectId) {
    await recalculateRemainingBudget(invoice.fundedFromProjectId);
  }

  return true;
}

// ===============================================
// EXPORT SERVICE
// ===============================================
export default {
  searchInvoices,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updatePaymentStatus,
  deleteInvoice,
  moveInvoice,
};
