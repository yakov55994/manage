// ===============================================
// INVOICE SERVICE – MULTI-PROJECT INVOICE SYSTEM
// ===============================================

import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import Order from "../models/Order.js";

// ===================================================
// חישוב תקציב מחדש לפרויקט מסוים
// ===================================================
export const recalculateRemainingBudget = async (projectId) => {
  if (!projectId) return;

  const project = await Project.findById(projectId);
  if (!project) return;

  const isMilga = project.name === "מילגה";

  // אם זה פרויקט מילגה — לא מורידים כלום מהתקציב
  if (isMilga) {
    project.remainingBudget = project.budget;
    await project.save();
    return;
  }

  // חשבוניות רגילות של הפרויקט
  const regularInvoices = await Invoice.find({
    "projects.projectId": projectId,
    fundedFromProjectId: null
  });

  // חשבוניות של מילגה שממומנות מהפרויקט הזה
  const milgaInvoices = await Invoice.find({
    fundedFromProjectId: projectId
  });

  const sumInvoices = (invoices) =>
    invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  const totalSpent =
    sumInvoices(regularInvoices) + sumInvoices(milgaInvoices);

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
      { invitingName: regex }
    ],
  }).limit(50);
}

// ===============================================
// GET ALL INVOICES לפי הרשאות
// ===============================================
async function getInvoices(user) {
  let query = {};

  if (user.role !== "admin") {
    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );

    query = {
      "projects.projectId": { $in: allowed }
    };
  }

  return Invoice.find(query)
    .populate("supplierId")
    .populate("projects.projectId", "name invitingName");
}

// ===============================================
// GET INVOICE BY ID
// ===============================================
async function getInvoiceById(user, invoiceId) {
  const invoice = await Invoice.findById(invoiceId)
    .populate("supplierId")
    .populate("projects.projectId", "name invitingName budget remainingBudget");

  if (!invoice) return null;

  if (user.role !== "admin") {
    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );

    const projectIds = invoice.projects.map((p) =>
      String(p.projectId._id)
    );

    const canView = projectIds.some((id) => allowed.includes(id));
    if (!canView) throw new Error("אין לך הרשאה לצפות בחחש בונית זו");
  }

  return invoice;
}

// ===============================================
// CREATE INVOICE – חשבונית אחת + כמה פרויקטים
// ===============================================
async function createInvoice(user, data) {
  const { projects, files, fundedFromProjectId, ...basic } = data;

  if (!projects || !projects.length) {
    throw new Error("חובה לבחור לפחות פרויקט אחד");
  }

  // בדיקת הרשאות
  if (user.role !== "admin") {
    const allowed = user.permissions.map(p => String(p.project?._id || p.project));
    for (const p of projects) {
      if (!allowed.includes(String(p.projectId))) {
        throw new Error("אין הרשאה להוסיף חשבונית לאחד הפרויקטים");
      }
    }
  }

  // סכום כולל
  const totalAmount = projects.reduce((sum, p) => sum + Number(p.sum), 0);

  // יצירת החשבונית
  const invoice = await Invoice.create({
    ...basic,
    projects,
    totalAmount,
    files,
    fundedFromProjectId: fundedFromProjectId || null,   // ✔ כאן!
    createdBy: user._id,
    createdByName: user.username || user.name,
  });

  // הוספה לכל פרויקט + עדכון תקציב
  for (const p of projects) {
    await Project.findByIdAndUpdate(p.projectId, {
      $push: { invoices: invoice._id }
    });

    await recalculateRemainingBudget(p.projectId);
  }

  // ❗ אם החשבונית ממומנת מכספי פרויקט אחר — צריך לעדכן גם אותו
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

  const oldProjects = invoice.projects.map(p => p.projectId.toString());
  const { projects: newProjects, files: newFiles = [], fundedFromProjectId, ...basic } = data;

  const mergedFiles = [
    ...invoice.files,
    ...newFiles.filter(f => f.isLocal || !invoice.files.some(old => old.url === f.url))
  ];

  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      ...basic,
      projects: newProjects,
      totalAmount: newProjects.reduce((sum, p) => sum + Number(p.sum), 0),
      files: mergedFiles,
      fundedFromProjectId: fundedFromProjectId || null,   // ✔ כאן!
    },
    { new: true }
  );

  // טיפול בקישורים
  const newProjectIds = newProjects.map(p => p.projectId.toString());

  for (const oldId of oldProjects) {
    if (!newProjectIds.includes(oldId)) {
      await Project.findByIdAndUpdate(oldId, { $pull: { invoices: invoiceId } });
      await recalculateRemainingBudget(oldId);
    }
  }

  for (const p of newProjects) {
    await Project.findByIdAndUpdate(p.projectId, { $addToSet: { invoices: invoiceId } });
    await recalculateRemainingBudget(p.projectId);
  }

  // ❗ אם החשבונית ממומנת מפרויקט אחר — מחשבים גם אותו
  if (updated.fundedFromProjectId) {
    await recalculateRemainingBudget(updated.fundedFromProjectId);
  }

  return updated;
}



// ===============================================
// MOVE INVOICE – עבור מבנה מרובה פרויקטים
// ===============================================
async function moveInvoice(user, invoiceId, fromProjectId, toProjectId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  fromProjectId = String(fromProjectId);
  toProjectId = String(toProjectId);

  if (!Array.isArray(invoice.projects)) {
    throw new Error("מבנה פרויקטים בחחשבונית לא תקין");
  }

  const part = invoice.projects.find((p) => {
    const pid = p?.projectId?._id || p?.projectId;
    return String(pid) === fromProjectId;
  });

  if (!part) throw new Error("החשבונית לא משויכת לפרויקט שממנו מבצעים העברה");

  // הרשאות
  if (user.role !== "admin") {
    const allowed = user.permissions.map(p => String(p.project?._id || p.project));
    if (!allowed.includes(fromProjectId) || !allowed.includes(toProjectId)) {
      throw new Error("אין הרשאה להעברה בין הפרויקטים האלה");
    }
  }

  // שם הפרויקט החדש
  const newProject = await Project.findById(toProjectId).select("name");
  if (!newProject) throw new Error("פרויקט יעד לא נמצא");

  const existingTarget = invoice.projects.find((p) => {
    const pid = p?.projectId?._id || p?.projectId;
    return String(pid) === toProjectId;
  });

  if (existingTarget) {
    existingTarget.sum = Number(existingTarget.sum) + Number(part.sum);

    invoice.projects = invoice.projects.filter((p) => {
      const pid = p?.projectId?._id || p?.projectId;
      return String(pid) !== fromProjectId;
    });
  } else {
    part.projectId = toProjectId;
    part.projectName = newProject.name; // ← חובה!
  }

  // ⭐ תיקון חשוב — לוודא שכל החלקים הקשורים לפרויקט יעד מעודכנים בשם:
  for (const p of invoice.projects) {
    const pid = p?.projectId?._id || p?.projectId;
    if (String(pid) === toProjectId) {
      p.projectName = newProject.name;
    }
  }

  invoice.totalAmount = invoice.projects.reduce(
    (sum, p) => sum + Number(p?.sum || 0),
    0
  );

  await invoice.save();

  await Project.findByIdAndUpdate(fromProjectId, { $pull: { invoices: invoiceId } });
  await Project.findByIdAndUpdate(toProjectId, { $addToSet: { invoices: invoiceId } });

  await recalculateRemainingBudget(fromProjectId);
  await recalculateRemainingBudget(toProjectId);

  // החזרה עם populate
  const populated = await Invoice.findById(invoice._id)
    .populate("projects.projectId", "name")
    .populate("supplierId", "name phone email bankDetails");


  populated.projects = populated.projects.map((p) => ({
    ...p.toObject(),
    projectName: p.projectId?.name || p.projectName || "",
  }));

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
  checkNumber,  // ✅ הוסף פרמטר
  checkDate     // ✅ הוסף פרמטר
) {
  // ✅ בנה את האובייקט לעדכון
  const updateData = {
    paid: status,
    ...(date && { paymentDate: date }),
    ...(method && { paymentMethod: method }),
  };

  // ✅ אם זה תשלום בצ'ק - הוסף את השדות
  if (status === "כן" && method === "check") {
    if (checkNumber) updateData.checkNumber = checkNumber;
    if (checkDate) updateData.checkDate = checkDate;
  } else {
    // ✅ אם זה לא צ'ק או ביטול תשלום - נקה את השדות
    updateData.checkNumber = null;
    updateData.checkDate = null;
  }

  return Invoice.findByIdAndUpdate(
    invoiceId,
    updateData,
    { new: true }
  ).populate("supplierId", "name phone email bankDetails");
}

// ===============================================
// DELETE INVOICE
// ===============================================
async function deleteInvoice(user, invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;

  // הפקת מזהי פרויקטים בצורה בטוחה
  const projectIds = invoice.projects
    .map((p) => (p.projectId ? p.projectId.toString() : null))
    .filter(Boolean);

  // מחיקת הקבצים + המסמך
  try {
    await invoice.deleteOne();
  } catch (err) {
    console.error("❌ Error deleting invoice or files:", err);
  }

  // עדכון תקציב לכל הפרויקטים שמופיעים ב-invoice.projects (לרוב: מילגה)
  for (const pid of projectIds) {
    try {
      await Project.findByIdAndUpdate(pid, {
        $pull: { invoices: invoiceId }
      });

      await recalculateRemainingBudget(pid);
    } catch (err) {
      console.error(`❌ Error updating project ${pid}:`, err);
    }
  }

  // ⭐⭐⭐ התיקון הקריטי:
  // אם החשבונית מומנה מפרויקט אחר — חייבים לעדכן את התקציב שלו!
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
