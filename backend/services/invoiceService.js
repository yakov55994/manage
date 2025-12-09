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

  // הגנות חובה:
  const budget = Number(project.budget || 0);

  const invoices = await Invoice.find({ "projects.projectId": projectId });

  let totalSpent = 0;

  for (const inv of invoices) {
    const part = inv.projects.find(
      (p) => p.projectId.toString() === projectId.toString()
    );

    if (part) {
      const sum = Number(part.sum || 0);
      if (!isNaN(sum)) totalSpent += sum;
    }
  }

  project.remainingBudget = budget - totalSpent;

  // שלא יהיה NaN לעולם:
  if (isNaN(project.remainingBudget)) {
    project.remainingBudget = budget;
  }

  await project.save();

  return project;
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
  const { projects, files, ...basic } = data;

  if (!projects || !projects.length) {
    throw new Error("חובה לבחור לפחות פרויקט אחד");
  }

  // בדיקת הרשאות
  if (user.role !== "admin") {
    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );

    for (const p of projects) {
      if (!allowed.includes(String(p.projectId))) {
        throw new Error("אין הרשאה להוסיף חשבונית לאחד הפרויקטים");
      }
    }
  }

  // סכום כולל
  const totalAmount = projects.reduce(
    (sum, p) => sum + Number(p.sum),
    0
  );

  // יצירת החשבונית
  const invoice = await Invoice.create({
    ...basic,
    projects,
    totalAmount,
    files,
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

  return invoice;
}

// ===============================================
// UPDATE INVOICE
// ===============================================
async function updateInvoice(user, invoiceId, data) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  const oldProjects = invoice.projects.map((p) =>
    p.projectId.toString()
  );

  const { projects: newProjects, files: newFiles = [], ...basic } = data;

  // ⭐ מיזוג קבצים — שומר את הישנים + מוסיף חדשים
  const mergedFiles = [
    ...invoice.files,              // קבצים קיימים
    ...newFiles.filter(f => f.isLocal || !invoice.files.some(old => old.url === f.url)) // רק חדשים
  ];

  // ⭐ עדכון החשבונית
  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      ...basic,
      projects: newProjects,
      totalAmount: newProjects.reduce(
        (sum, p) => sum + Number(p.sum),
        0
      ),
      files: mergedFiles, // ✔ מעכשיו קבצים לעולם לא נמחקים עד שהמשתמש מוחק ידנית!
    },
    { new: true }
  );

  // ⭐ טיפול בקישורי פרויקטים
  const newProjectIds = newProjects.map((p) =>
    p.projectId.toString()
  );

  for (const oldId of oldProjects) {
    if (!newProjectIds.includes(oldId)) {
      await Project.findByIdAndUpdate(oldId, {
        $pull: { invoices: invoiceId }
      });
      await recalculateRemainingBudget(oldId);
    }
  }

  for (const p of newProjects) {
    await Project.findByIdAndUpdate(p.projectId, {
      $addToSet: { invoices: invoiceId }
    });
    await recalculateRemainingBudget(p.projectId);
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
    throw new Error("מבנה פרויקטים בחשבונית לא תקין");
  }

  // מוצא חלק לפי שני מצבים: פופולייט מלא או ObjectId
  const part = invoice.projects.find((p) => {
    const pid = p?.projectId?._id || p?.projectId;
    return String(pid) === fromProjectId;
  });

  if (!part) {
    console.error("📛 פרויקטים בחשבונית:", invoice.projects);
    console.error("📛 fromProjectId שקיבלת:", fromProjectId);
    throw new Error("החשבונית לא משויכת לפרויקט שממנו מבצעים העברה");
  }

  // בדיקות הרשאות
  if (user.role !== "admin") {
    const allowed = user.permissions.map(
      (p) => String(p.project?._id || p.project)
    );
    if (!allowed.includes(fromProjectId) || !allowed.includes(toProjectId)) {
      throw new Error("אין הרשאה להעברה בין הפרויקטים האלה");
    }
  }

  // מציאת יעד (תואם פופולייט)
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
  }

  invoice.totalAmount = invoice.projects.reduce(
    (sum, p) => sum + Number(p?.sum || 0),
    0
  );

  await invoice.save();

  await Project.findByIdAndUpdate(fromProjectId, {
    $pull: { invoices: invoiceId },
  });

  await Project.findByIdAndUpdate(toProjectId, {
    $addToSet: { invoices: invoiceId },
  });

  await recalculateRemainingBudget(fromProjectId);
  await recalculateRemainingBudget(toProjectId);

  return invoice;
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
    // לא נחזיר 400 — רק נדלג
  }

  //עדכון פרויקטים
  for (const pid of projectIds) {
    try {
      await Project.findByIdAndUpdate(pid, {
        $pull: { invoices: invoiceId }
      });

      await recalculateRemainingBudget(pid);
    } catch (err) {
      console.error(`❌ Error updating project ${pid}:`, err);
      // לא מפילים את המחיקה
    }
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
