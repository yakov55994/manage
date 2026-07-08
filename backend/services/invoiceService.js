// ===============================================
// INVOICE SERVICE – MULTI-PROJECT SYSTEM + SALARY
// ===============================================

import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";
import Salary from "../models/Salary.js";
import { sendPaymentConfirmationEmail } from "./emailService.js";
import notificationService from "./notificationService.js";
import mongoose from "mongoose";

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

  // 1️⃣ חשבוניות רגילות של הפרויקט (לא כולל משכורות)
  // כולל גם חשבוניות מילגה שהפרויקט הזה הוא חלק מה-projects array
  const regularInvoices = await Invoice.find({
    "projects.projectId": projectId,
    type: { $ne: "salary" }
  });

  // חשב את הסכום שהפרויקט משלם בחשבוניות (לפי sum בכל פרויקט)
  let regularTotal = 0;
  for (const inv of regularInvoices) {
    const projectPart = inv.projects.find(
      (p) => String(p.projectId) === String(projectId)
    );

    if (projectPart) {
      regularTotal += Number(projectPart.sum || 0);
    }
  }

  // 2️⃣ חשבוניות מילגה שממומנות מהפרויקט הזה (כאן לוקחים totalAmount כי זה הסכום המלא)
  const milgaInvoices = await Invoice.find({
    fundedFromProjectId: projectId,
  });
  const milgaTotal = sumInvoices(milgaInvoices);

  // 3️⃣ חשבוניות משכורות (type = salary) שממומנות מהפרויקט הזה
  const salaryInvoices = await Invoice.find({
    type: "salary",
    fundedFromProjectId: projectId,
  });
  const salaryInvoicesTotal = sumInvoices(salaryInvoices);

  // 4️⃣ משכורות מהמודל Salary הישן
  const salaries = await Salary.find({ projectId });
  const totalSalaries = salaries.reduce(
    (sum, s) => sum + Number(s.finalAmount || 0),
    0
  );

  // ✅ סכום כולל: רק מה שהפרויקט באמת משלם
  const totalSpent = regularTotal + milgaTotal + salaryInvoicesTotal + totalSalaries;

  const oldRemaining = project.remainingBudget;
  const newRemaining = project.budget - totalSpent;

  project.remainingBudget = newRemaining;
  await project.save();

  // בדיקת חריגת תקציב והתראה
  try {
    await notificationService.checkBudgetThreshold(project, oldRemaining, newRemaining);
  } catch (notifError) {
    console.error("❌ Failed to check budget threshold:", notifError);
  }
};

// ===============================================
// SEARCH
// ===============================================
async function searchInvoices(query) {
  const regex = new RegExp(query, "i");

  // חיפוש מקיף בכל השדות הרלוונטיים
  const invoices = await Invoice.find({
    $or: [
      { invoiceNumber: regex },
      { detail: regex },
      { status: regex },
      { invitingName: regex },
      { documentType: regex },
      { "projects.projectName": regex },
      { salaryEmployeeName: regex },
    ],
  })
    .populate("supplierId")
    .populate("projects.projectId", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  // אם לא נמצאו תוצאות, חפש גם בשם ספק ובסכום
  if (invoices.length === 0) {
    const allInvoices = await Invoice.find({})
      .populate("supplierId")
      .populate("projects.projectId", "name")
      .sort({ createdAt: -1 })
      .limit(100);

    return allInvoices.filter(invoice => {
      const supplierName = invoice.supplierId?.name || "";
      const totalAmount = invoice.totalAmount?.toString() || "";

      return supplierName.toLowerCase().includes(query.toLowerCase()) ||
        totalAmount.includes(query);
    });
  }

  return invoices;
}

// ===============================================
// GET ALL INVOICES לפי הרשאות
// ===============================================
async function getInvoices(user) {
  let query = {};

  if (user.role !== "admin" && user.role !== "accountant") {

    console.log("USER PERMISSIONS:", user.permissions);

    const allowed = user.permissions.map(
      (p) => new mongoose.Types.ObjectId(p.project?._id || p.project)
    );

    console.log("ALLOWED IDS:", allowed);


    query = {
      $or: [
        { "projects.projectId": { $in: allowed } },
        { fundedFromProjectId: { $in: allowed } }
      ]
    };
    console.log("QUERY:", query);

  }

  const invoices = await Invoice.find(query)
    .populate("supplierId")
    .populate("projects.projectId", "name")
    .populate("fundedFromProjectId", "name")
    .sort({ createdAt: -1 });
  console.log("FOUND INVOICES:", invoices.length);

  return invoices;
}


// ===============================================
// GET INVOICE BY ID
// ===============================================
async function getInvoiceById(user, invoiceId) {
  const invoice = await Invoice.findById(invoiceId)
    .populate("supplierId")
    .populate("projects.projectId", "name invitingName budget remainingBudget")
    .populate("fundedFromProjectId", "name")
    .populate("submittedToProjectId", "name");

  if (!invoice) return null;

  // אדמין ורואת חשבון רואים הכל
  if (user.role === "admin" || user.role === "accountant") {
    return invoice;
  }

  // רשימת כל הפרויקטים שהמשתמש מורשה עליהם
  const allowed = user.permissions.map(p => String(p.project?._id || p.project));

  // ────────────────────────────────────────────────
  // אסוף את כל הפרויקטים הרלוונטיים לחשבונית
  // ────────────────────────────────────────────────
  const relevantIds = new Set();

  // 1. פרויקטים רגילים (מערך projects)
  (invoice.projects || []).forEach(p => {
    const pid = String(p.projectId?._id || p.projectId);
    if (pid) relevantIds.add(pid);
  });

  // 2. fundedFromProjectId ← זה החלק החסר!
  if (invoice.fundedFromProjectId) {
    const fid = String(invoice.fundedFromProjectId._id || invoice.fundedFromProjectId);
    if (fid) relevantIds.add(fid);
  }

  // 3. אם יש מערך fundedFromProjectIds (גרסה חדשה יותר)
  if (invoice.fundedFromProjectIds && Array.isArray(invoice.fundedFromProjectIds)) {
    invoice.fundedFromProjectIds.forEach(f => {
      const fid = String(f._id || f);
      if (fid) relevantIds.add(fid);
    });
  }

  // 4. submittedToProjectId (אם רלוונטי)
  if (invoice.submittedToProjectId) {
    const sid = String(invoice.submittedToProjectId._id || invoice.submittedToProjectId);
    if (sid) relevantIds.add(sid);
  }

  // ────────────────────────────────────────────────
  // האם יש לפחות פרויקט אחד שהמשתמש מורשה עליו?
  // ────────────────────────────────────────────────
  const hasAccess = Array.from(relevantIds).some(id => allowed.includes(id));

  if (!hasAccess) {
    throw new Error("אין לך הרשאה לצפות במסמך זה");
  }

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

  // 📝 תיעוד היסטוריית יצירה
  try {
    invoice.editHistory = [{
      userId: user._id,
      userName: user.username || user.name,
      action: 'created',
      changes: 'חשבונית משכורת נוצרה',
      timestamp: new Date()
    }];
    await invoice.save();
  } catch (historyError) {
    console.error("❌ Failed to save edit history:", historyError);
  }

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

  const { projects, files, fundedFromProjectId, fundedFromProjectIds, supplierId, sendEmail = false, ...basic } = data;

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
    // תמיכה בשתי הגרסאות
    fundedFromProjectId: fundedFromProjectId || null,
    fundedFromProjectIds: fundedFromProjectIds || null,
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

  // 📝 תיעוד היסטוריית יצירה
  try {
    invoice.editHistory = [{
      userId: user._id,
      userName: user.username || user.name,
      action: 'created',
      changes: 'חשבונית נוצרה',
      timestamp: new Date()
    }];
    await invoice.save();
  } catch (historyError) {
    console.error("❌ Failed to save edit history:", historyError);
  }

  // 🔔 שליחת התראה על חשבונית חדשה
  try {
    await notificationService.notifyNewInvoice(invoice, user._id);
  } catch (notifError) {
    console.error("❌ Failed to send new invoice notification:", notifError);
  }

  // 📧 שליחת מייל לספק אם סומן וי ושולם
  if (sendEmail && basic.paid === "כן") {
    try {
      const populated = await Invoice.findById(invoice._id).populate("supplierId", "name email");
      if (populated?.supplierId?.email) {
        await sendPaymentConfirmationEmail(
          populated.supplierId.email,
          populated.supplierId.name,
          {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            paymentDate: invoice.paymentDate || new Date(),
            documentType: invoice.documentType,
            detail: invoice.detail,
            paymentMethod: invoice.paymentMethod,
          }
        );
      }
    } catch (emailError) {
      console.error("❌ Failed to send payment confirmation email on create:", emailError);
    }
  }

  return invoice;
}

// ===============================================
// UPDATE INVOICE
// ===============================================
async function updateInvoice(user, invoiceId, data) {
  const invoice = await Invoice.findById(invoiceId).populate("supplierId", "name email");
  if (!invoice) throw new Error("חשבונית לא נמצאה");

  // לא תומכים בעריכת סוג משכורות פה (בשלב ראשון)
  if (invoice.type === "salary") {
    throw new Error("לא ניתן לערוך חשבונית משכורות כרגע");
  }

  // שמור את מצב התשלום הישן לבדיקה אם השתנה
  const oldPaidStatus = invoice.paid;

  // שמור את fundedFromProjectId הישן לפני שמשנים אותו
  const oldFundedFromProjectId = invoice.fundedFromProjectId ? String(invoice.fundedFromProjectId) : null;

  const oldProjects = invoice.projects.map((p) =>
    p.projectId.toString()
  );

  const {
    projects: newProjects,
    files: newFiles = [],
    fundedFromProjectId,
    fundedFromProjectIds,
    fundingProjectsMap = {}, // ✅ מיפוי פרויקטי מילגה לפרויקטים ממומנים (יכול להיות מערך)
    status,
    submittedToProjectId,
    submittedAt,
    sendEmail = false,
    ...basic
  } = data;

  // ✅ השתמש ברשימת הקבצים שהתקבלה במקום למזג
  // אם הלקוח שלח רשימת קבצים, זו הרשימה המעודכנת (אחרי מחיקות)
  const finalFiles = newFiles;

  // וודא שכל פרויקט יש לו projectName מעודכן
  // ✅ הוסף גם fundedFromProjectId/fundedFromProjectIds לכל פרויקט מילגה
  const projectsWithNames = await Promise.all(
    newProjects.map(async (p) => {
      const project = await Project.findById(p.projectId).select("name isMilga type");

      // בדוק אם זה פרויקט מילגה
      const isMilgaProject = project?.isMilga || project?.type === "milga";

      // קבל את ה-fundedFromProjectId/Ids מהמיפוי אם קיים
      const fundingProjectIdOrIds = fundingProjectsMap[p.projectId] || null;

      return {
        projectId: p.projectId,
        projectName: project?.name || p.projectName,
        sum: p.sum,
        // תמיכה גם בערך יחיד וגם במערך
        fundedFromProjectId: isMilgaProject && !Array.isArray(fundingProjectIdOrIds) ? fundingProjectIdOrIds : null,
        fundedFromProjectIds: isMilgaProject && Array.isArray(fundingProjectIdOrIds) ? fundingProjectIdOrIds : null,
      };
    })
  );

  // ✅ טיפול בסטטוס הגשה – מאפשר ביטול
  let updateFields = {
    ...basic,
    projects: projectsWithNames,
    totalAmount: projectsWithNames.reduce(
      (sum, p) => sum + Number(p.sum),
      0
    ),
    files: finalFiles,
  };

  let unsetFields = {};

  if (status === "הוגש") {
    if (!submittedToProjectId) {
      throw new Error("חובה לבחור פרויקט להגשה");
    }

    updateFields.status = "הוגש";
    updateFields.submittedToProjectId = submittedToProjectId;
    updateFields.submittedAt = submittedAt || new Date();
  }

  if (status === "לא הוגש") {
    updateFields.status = "לא הוגש";
    unsetFields.submittedToProjectId = "";
    unsetFields.submittedAt = "";
  }

  if (fundedFromProjectId !== undefined) {
    updateFields.fundedFromProjectId = fundedFromProjectId;
  }

  if (fundedFromProjectIds !== undefined) {
    updateFields.fundedFromProjectIds = fundedFromProjectIds;
  }

  // 📝 בניית תיאור שינויים להיסטוריה
  const changesList = [];
  if (invoice.totalAmount !== updateFields.totalAmount) {
    changesList.push(`סכום שונה מ-${invoice.totalAmount?.toLocaleString("he-IL")} ל-${updateFields.totalAmount?.toLocaleString("he-IL")}`);
  }
  if (basic.detail !== undefined && basic.detail !== invoice.detail) {
    changesList.push('פירוט עודכן');
  }
  if (basic.documentType !== undefined && basic.documentType !== invoice.documentType) {
    changesList.push(`סוג מסמך שונה ל: ${basic.documentType}`);
  }
  if (basic.invoiceDate !== undefined && String(basic.invoiceDate) !== String(invoice.invoiceDate)) {
    changesList.push('תאריך חשבונית עודכן');
  }
  if (basic.paid !== undefined && basic.paid !== invoice.paid) {
    changesList.push(`סטטוס תשלום שונה ל: ${basic.paid}`);
  }
  if (status !== undefined && status !== invoice.status) {
    changesList.push(`סטטוס הגשה שונה ל: ${status}`);
  }
  const oldProjectNames = invoice.projects.map(p => p.projectName).join(", ");
  const newProjectNames = projectsWithNames.map(p => p.projectName).join(", ");
  if (oldProjectNames !== newProjectNames) {
    changesList.push(`פרויקטים שונו: ${newProjectNames}`);
  }
  if (changesList.length === 0) {
    changesList.push('חשבונית עודכנה');
  }

  const historyEntry = {
    userId: user._id,
    userName: user.username || user.name,
    action: 'updated',
    changes: changesList.join(', '),
    timestamp: new Date()
  };

  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      $set: updateFields,
      ...(Object.keys(unsetFields).length ? { $unset: unsetFields } : {}),
      $push: { editHistory: historyEntry },
    },
    { new: true }
  );



  const newProjectIds = projectsWithNames.map((p) =>
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

  for (const p of projectsWithNames) {
    await Project.findByIdAndUpdate(p.projectId, {
      $addToSet: { invoices: invoiceId },
    });
    await recalculateRemainingBudget(p.projectId);

    // ✅ חשב מחדש גם את תקציב הפרויקט הממומן (אם קיים)
    if (p.fundedFromProjectId) {
      await recalculateRemainingBudget(p.fundedFromProjectId);
    }
  }

  // תמיכה לאחור - אם יש fundedFromProjectId כללי
  if (updated.fundedFromProjectId) {
    await recalculateRemainingBudget(updated.fundedFromProjectId);
  }

  // חשב מחדש תקציב עבור הפרויקט הישן שממומן (אם היה ושונה)
  if (oldFundedFromProjectId && oldFundedFromProjectId !== String(fundedFromProjectId)) {
    await recalculateRemainingBudget(oldFundedFromProjectId);
  }

  // 📧 שליחת מייל אם סטטוס התשלום השתנה ל-"כן"
  if (sendEmail && basic.paid === "כן" && oldPaidStatus !== "כן" && invoice.supplierId?.email) {
    try {
      await sendPaymentConfirmationEmail(
        invoice.supplierId.email,
        invoice.supplierId.name,
        {
          invoiceNumber: updated.invoiceNumber,
          totalAmount: updated.totalAmount,
          paymentDate: updated.paymentDate || new Date(),
          documentType: updated.documentType,
          detail: updated.detail,
          paymentMethod: updated.paymentMethod,
        }
      );
    } catch (emailError) {
      console.error("❌ Failed to send payment confirmation email on update:", emailError);
    }
  }

  return updated;
}

// ===============================================
// MOVE INVOICE TO MULTIPLE PROJECTS - פונקציה חדשה
// ===============================================
async function moveInvoiceToMultipleProjects(user, invoice, targetProjects, fundedFromProjectId = null, fundedFromProjectIds = null) {

  // תוקף הסכום הכולל
  const totalAllocated = targetProjects.reduce((sum, p) => sum + Number(p.sum), 0);
  if (Math.abs(totalAllocated - invoice.totalAmount) > 0.01) {
    throw new Error(`סכום הפרויקטים (${totalAllocated}) חייב להיות שווה לסכום החשבונית (${invoice.totalAmount})`);
  }

  // בדיקת הרשאות
  if (user.role !== "admin") {
    if (user.role === "accountant") {
      throw new Error("רואה חשבון לא יכול להעביר חשבוניות");
    }

    const allowed = user.permissions.map(p => String(p.project?._id || p.project));

    // ודא שיש הרשאות לכל הפרויקטים החדשים
    for (const tp of targetProjects) {
      const projectId = String(tp.projectId);
      if (!allowed.includes(projectId)) {
        throw new Error(`אין הרשאה לפרויקט ${projectId}`);
      }

      // בדוק הרשאת edit
      const hasEdit = user.permissions.some(
        p => String(p.project?._id || p.project) === projectId && p.modules?.invoices === "edit"
      );
      if (!hasEdit) {
        throw new Error("נדרשת הרשאת עריכה לכל הפרויקטים");
      }
    }
  }

  // שמור את הפרויקטים הישנים לצורך עדכון התקציבים
  const oldProjectIds = invoice.projects.map(p => String(p.projectId?._id || p.projectId));
  const oldFundedFromProjectId = invoice.fundedFromProjectId ? String(invoice.fundedFromProjectId) : null;
  const oldFundedFromProjectIds = invoice.fundedFromProjectIds || [];

  // בדוק אם יש פרויקט מילגה ברשימה
  const hasMilgaProject = await Promise.all(
    targetProjects.map(async tp => {
      const project = await Project.findById(tp.projectId).select("isMilga type");
      return project?.isMilga || project?.type === "milga";
    })
  ).then(results => results.some(Boolean));

  // אם יש פרויקט מילגה ולא סופקו פרויקטים ממומנים - זרוק שגיאה
  if (hasMilgaProject && !fundedFromProjectIds && !fundedFromProjectId) {
    throw new Error("פרויקט מילגה דורש בחירת פרויקט/ים ממומן/ים");
  }
  if (hasMilgaProject && fundedFromProjectIds && fundedFromProjectIds.length === 0) {
    throw new Error("פרויקט מילגה דורש בחירת לפחות פרויקט ממומן אחד");
  }

  // שמור שמות פרויקטים ישנים לפני ההחלפה (לצורך היסטוריה)
  const oldNames = invoice.projects?.map(p => p.projectName).join(", ") || "";

  // בנה את מערך הפרויקטים החדש
  const newProjects = [];
  for (const tp of targetProjects) {
    const project = await Project.findById(tp.projectId).select("name invitingName");
    if (!project) throw new Error(`פרויקט ${tp.projectId} לא נמצא`);

    newProjects.push({
      projectId: tp.projectId,
      projectName: project.name,
      sum: Number(tp.sum),
    });
  }

  // עדכן את החשבונית
  invoice.projects = newProjects;
  invoice.markModified('projects');
  invoice.totalAmount = totalAllocated;

  // עדכן את fundedFromProjectIds או fundedFromProjectId (תמיכה לאחור)
  if (fundedFromProjectIds && fundedFromProjectIds.length > 0) {
    invoice.fundedFromProjectIds = fundedFromProjectIds;
    invoice.fundedFromProjectId = null; // נקה את הישן
  } else if (fundedFromProjectId) {
    invoice.fundedFromProjectId = fundedFromProjectId;
    invoice.fundedFromProjectIds = []; // נקה את החדש
  } else if (!hasMilgaProject) {
    // אם אין פרויקט מילגה, נקה את שניהם
    invoice.fundedFromProjectId = null;
    invoice.fundedFromProjectIds = [];
  }

  // 📝 תיעוד העברה בהיסטוריה
  const newNames = newProjects.map(p => p.projectName).join(", ");
  invoice.editHistory = invoice.editHistory || [];
  invoice.editHistory.push({
    userId: user._id,
    userName: user.username || user.name,
    action: 'moved',
    changes: `חשבונית הועברה מ: ${oldNames} ל: ${newNames}`,
    timestamp: new Date()
  });

  // שמור
  await invoice.save();

  // עדכן את רשימת החשבוניות בפרויקטים הישנים (הסר)
  for (const oldId of oldProjectIds) {
    await Project.findByIdAndUpdate(oldId, {
      $pull: { invoices: invoice._id }
    });
    await recalculateRemainingBudget(oldId);
  }

  // עדכן את רשימת החשבוניות בפרויקטים החדשים (הוסף)
  const newProjectIds = targetProjects.map(p => String(p.projectId));
  for (const newId of newProjectIds) {
    await Project.findByIdAndUpdate(newId, {
      $addToSet: { invoices: invoice._id }
    });
    await recalculateRemainingBudget(newId);
  }

  // חשב מחדש תקציב עבור הפרויקטים החדשים שממומנים (אם יש)
  if (fundedFromProjectIds && fundedFromProjectIds.length > 0) {
    for (const fundedId of fundedFromProjectIds) {
      await recalculateRemainingBudget(fundedId);
    }
  } else if (fundedFromProjectId) {
    await recalculateRemainingBudget(fundedFromProjectId);
  }

  // חשב מחדש תקציב עבור הפרויקטים הישנים שממומנים (אם היו ושונו)
  const newFundedIds = fundedFromProjectIds || (fundedFromProjectId ? [fundedFromProjectId] : []);
  const allOldFundedIds = [...oldFundedFromProjectIds];
  if (oldFundedFromProjectId) {
    allOldFundedIds.push(oldFundedFromProjectId);
  }

  for (const oldFundedId of allOldFundedIds) {
    if (!newFundedIds.includes(String(oldFundedId))) {
      await recalculateRemainingBudget(oldFundedId);
    }
  }

  // טען מחדש עם populate
  const populated = await Invoice.findById(invoice._id)
    .populate("projects.projectId", "name invitingName")
    .populate("supplierId", "name phone email bankDetails")
    .populate("fundedFromProjectId", "name")
    .populate("fundedFromProjectIds", "name");

  if (!populated) throw new Error("שגיאה בטעינת החשבונית לאחר ההעברה");

  // וודא שכל הפרויקטים מכילים את שם הפרויקט
  if (populated.projects) {
    populated.projects = populated.projects.map((p) => ({
      projectId: p.projectId?._id || p.projectId,
      projectName: p.projectId?.name || p.projectName || "",
      sum: p.sum,
    }));
  }

  return populated;
}

// ===============================================
// MOVE INVOICE - תמיכה במספר פרויקטים
// ===============================================
async function moveInvoice(user, invoiceId, fromProjectId, toProjectId, fundedFromProjectId, targetProjects, fundedFromProjectIds) {

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("חשבונית לא נמצאה");


  if (invoice.type === "salary")
    throw new Error("אי אפשר להעביר חשבונית משכורות");

  // תמיכה ב-API חדש ו-API ישן
  if (targetProjects && Array.isArray(targetProjects)) {
    // API חדש - העברה למספר פרויקטים
    return await moveInvoiceToMultipleProjects(user, invoice, targetProjects, fundedFromProjectId, fundedFromProjectIds);
  }

  // API ישן - תמיכה לאחור
  fromProjectId = String(fromProjectId);
  toProjectId = String(toProjectId);

  if (fromProjectId === toProjectId) {
    throw new Error("הפרויקט המקור והיעד זהים");
  }

  // שמור את fundedFromProjectId הישן לפני שמשנים אותו
  const oldFundedFromProjectId = invoice.fundedFromProjectId ? String(invoice.fundedFromProjectId) : null;

  // בדוק אם הפרויקט היעד הוא מילגה והאם סופק fundedFromProjectId
  const targetProject = await Project.findById(toProjectId);
  if (targetProject?.isMilga && !fundedFromProjectId) {
    throw new Error("פרויקט מילגה דורש בחירת פרויקט ממומן");
  }

  // אם סופק fundedFromProjectId, עדכן את החשבונית
  if (fundedFromProjectId) {
    invoice.fundedFromProjectId = fundedFromProjectId;
  } else if (!targetProject?.isMilga) {
    // אם מעבירים לפרויקט רגיל (לא מילגה), נקה את fundedFromProjectId
    invoice.fundedFromProjectId = null;
  }

  // מצא את החלק של הפרויקט המקורי
  const partIndex = invoice.projects.findIndex((p) => {
    const pid = p?.projectId?._id || p?.projectId;
    return String(pid) === fromProjectId;
  });


  if (partIndex === -1) {
    console.error("❌ Project not found in invoice. Available projects:",
      invoice.projects.map(p => ({
        id: String(p?.projectId?._id || p?.projectId),
        name: p.projectName
      }))
    );
    throw new Error(`החשבונית לא משויכת לפרויקט המקור`);
  }

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

  // 📝 תיעוד העברה בהיסטוריה
  const fromProject = await Project.findById(fromProjectId).select("name");
  invoice.editHistory = invoice.editHistory || [];
  invoice.editHistory.push({
    userId: user._id,
    userName: user.username || user.name,
    action: 'moved',
    changes: `חשבונית הועברה מ: ${fromProject?.name || fromProjectId} ל: ${newProject.name}`,
    timestamp: new Date()
  });

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

  // חשב מחדש תקציב עבור הפרויקט החדש שממומן (אם יש)
  if (fundedFromProjectId) {
    await recalculateRemainingBudget(fundedFromProjectId);
  }

  // חשב מחדש תקציב עבור הפרויקט הישן שממומן (אם היה ושונה)
  if (oldFundedFromProjectId && oldFundedFromProjectId !== String(fundedFromProjectId)) {
    await recalculateRemainingBudget(oldFundedFromProjectId);
  }

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
  checkDate,
  sendEmail = true
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

  // 📝 תיעוד שינוי סטטוס תשלום בהיסטוריה
  const statusText = status === "כן" ? "שולם" : status === "יצא לתשלום" ? "יצא לתשלום" : status === "לא לתשלום" ? "לא לתשלום" : "לא שולם";
  let paymentChanges = `סטטוס תשלום שונה ל: ${statusText}`;
  if (date) paymentChanges += `, תאריך תשלום: ${new Date(date).toLocaleDateString("he-IL")}`;
  if (method === "check" && checkNumber) paymentChanges += `, צ׳ק מס: ${checkNumber}`;

  const updatedInvoice = await Invoice.findByIdAndUpdate(invoiceId, {
    ...updateData,
    $push: {
      editHistory: {
        userId: user._id,
        userName: user.username || user.name,
        action: 'payment_status_changed',
        changes: paymentChanges,
        timestamp: new Date()
      }
    }
  }, {
    new: true,
  }).populate("supplierId", "name phone email bankDetails");

  // שליחת מייל לספק כשמעדכנים לשולם
  if (sendEmail && status === "כן" && updatedInvoice?.supplierId?.email) {
    try {
      await sendPaymentConfirmationEmail(
        updatedInvoice.supplierId.email,
        updatedInvoice.supplierId.name,
        {
          invoiceNumber: updatedInvoice.invoiceNumber,
          totalAmount: updatedInvoice.totalAmount,
          paymentDate: date || new Date(),
          documentType: updatedInvoice.documentType,
          detail: updatedInvoice.detail,
          paymentMethod: updatedInvoice.paymentMethod,
        }
      );
    } catch (emailError) {
      console.error("❌ Failed to send payment confirmation email:", emailError);
      // ממשיכים - לא עוצרים את התהליך בגלל שגיאת מייל
    }
  }

  // שליחת התראה על שינוי סטטוס תשלום
  try {
    await notificationService.notifyPaymentStatusChange(updatedInvoice, status, user._id);
  } catch (notifError) {
    console.error("❌ Failed to send payment notification:", notifError);
  }

  return updatedInvoice;
}

// ===============================================
// עדכון סטטוס הגשה (חשבונית בודדת) – ללא צורך לערוך את כל החשבונית
// ===============================================
async function updateSubmissionStatus(user, invoiceId, status, submittedToProjectId, submittedAt) {
  if (!["הוגש", "לא הוגש", "בעיבוד"].includes(status)) {
    throw new Error("סטטוס הגשה לא תקין");
  }

  const updateData = { status };
  const unsetData = {};

  if (status === "הוגש") {
    if (!submittedToProjectId) {
      throw new Error("חובה לבחור פרויקט להגשה");
    }
    updateData.submittedToProjectId = submittedToProjectId;
    updateData.submittedAt = submittedAt || new Date();
  } else {
    unsetData.submittedToProjectId = "";
    unsetData.submittedAt = "";
  }

  const statusText = status === "הוגש" ? "הוגש" : status === "בעיבוד" ? "בעיבוד" : "לא הוגש";
  let changes = `סטטוס הגשה שונה ל: ${statusText}`;
  if (status === "הוגש" && submittedAt) {
    changes += `, תאריך הגשה: ${new Date(submittedAt).toLocaleDateString("he-IL")}`;
  }

  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      ...updateData,
      ...(Object.keys(unsetData).length ? { $unset: unsetData } : {}),
      $push: {
        editHistory: {
          userId: user._id,
          userName: user.username || user.name,
          action: "status_changed",
          changes,
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  ).populate("submittedToProjectId", "name");

  if (!updatedInvoice) throw new Error("חשבונית לא נמצאה");

  return updatedInvoice;
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
  updateSubmissionStatus,
  deleteInvoice,
  moveInvoice,
};
