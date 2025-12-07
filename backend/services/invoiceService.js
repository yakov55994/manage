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

  const invoices = await Invoice.find({ "projects.projectId": projectId });

  let totalSpent = 0;

  for (const inv of invoices) {
    const part = inv.projects.find(
      (p) => p.projectId.toString() === projectId.toString()
    );
    if (part) totalSpent += Number(part.sum);
  }

  project.remainingBudget = Number(project.budget) - totalSpent;
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

  const { projects: newProjects, files, ...basic } = data;

  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      ...basic,
      projects: newProjects,
      totalAmount: newProjects.reduce(
        (sum, p) => sum + Number(p.sum),
        0
      ),
      files,
    },
    { new: true }
  );

  const newProjectIds = newProjects.map((p) =>
    p.projectId.toString()
  );

  // הסרת קישור מפרויקטים שכבר לא קשורים לחשבונית
  for (const oldId of oldProjects) {
    if (!newProjectIds.includes(oldId)) {
      await Project.findByIdAndUpdate(oldId, {
        $pull: { invoices: invoiceId }
      });
      await recalculateRemainingBudget(oldId);
    }
  }

  // הוספת קישור לפרויקטים חדשים
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

  const part = invoice.projects.find(
    (p) => p.projectId.toString() === fromProjectId
  );

  if (!part) throw new Error("החשבונית לא משויכת לפרויקט הזה");

  part.projectId = toProjectId;
  await invoice.save();

  await Project.findByIdAndUpdate(fromProjectId, {
    $pull: { invoices: invoiceId }
  });

  await Project.findByIdAndUpdate(toProjectId, {
    $addToSet: { invoices: invoiceId }
  });

  await recalculateRemainingBudget(fromProjectId);
  await recalculateRemainingBudget(toProjectId);

  return invoice;
}

// ===============================================
// UPDATE PAYMENT STATUS
// ===============================================
async function updatePaymentStatus(user, invoiceId, status, date, method) {
  return Invoice.findByIdAndUpdate(
    invoiceId,
    {
      paid: status,
      ...(date && { paymentDate: date }),
      ...(method && { paymentMethod: method }),
    },
    { new: true }
  );
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
