import Salary from "../models/Salary.js";
import Project from "../models/Project.js";
import { recalculateRemainingBudget } from "../services/invoiceService.js";
import { generateSalaryExportPDF } from "../services/salaryPdfService.js";
import fs from "fs";
import xlsx from "xlsx";

// =======================================================
// CREATE SALARY
// =======================================================
export async function createSalary(req, res) {
  try {
    const {
      projectId,
      employeeName,
      baseAmount,
      netAmount,
      overheadPercent,
      department,
    } = req.body;

    if (!projectId || !employeeName || !baseAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const finalAmount =
      baseAmount + (baseAmount * (overheadPercent || 0)) / 100;

    const salary = await Salary.create({
      projectId,
      employeeName,
      department: department || null,
      baseAmount,
      netAmount: netAmount || null,
      overheadPercent: overheadPercent || 0,
      finalAmount,
      createdBy: req.user._id,
      createdByName: req.user.username || req.user.name,
    });

    await recalculateRemainingBudget(projectId);

    res.status(201).json({ success: true, data: salary });
  } catch (err) {
    console.error("CREATE SALARY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// GET ALL SALARIES
// =======================================================
export async function getSalaries(req, res) {
  try {
    const salaries = await Salary.find()
      .populate("projectId", "name")
      .sort({ date: -1 });

    res.json({ success: true, data: salaries });
  } catch (err) {
    console.error("GET SALARIES ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// GET SALARY BY ID
// =======================================================
export async function getSalaryById(req, res) {
  try {
    const salary = await Salary.findById(req.params.id)
      .populate("projectId", "name");

    if (!salary) {
      return res.status(404).json({
        success: false,
        error: "Salary not found",
      });
    }

    res.json({ success: true, data: salary });
  } catch (err) {
    console.error("GET SALARY BY ID ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// UPDATE SALARY
// =======================================================
export async function updateSalary(req, res) {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: "Salary not found",
      });
    }

    const {
      employeeName,
      department,
      baseAmount,
      netAmount,
      overheadPercent,
      projectId,
    } = req.body;

    const finalAmount =
      baseAmount + (baseAmount * (overheadPercent || 0)) / 100;

    const oldProjectId = salary.projectId.toString();

    salary.employeeName = employeeName;
    salary.department = department || null;
    salary.baseAmount = baseAmount;
    salary.netAmount = netAmount !== undefined ? netAmount : salary.netAmount;
    salary.overheadPercent = overheadPercent || 0;
    salary.finalAmount = finalAmount;

    if (projectId && projectId !== oldProjectId) {
      salary.projectId = projectId;
    }

    await salary.save();

    await recalculateRemainingBudget(oldProjectId);
    await recalculateRemainingBudget(salary.projectId);

    res.json({ success: true, data: salary });
  } catch (err) {
    console.error("UPDATE SALARY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// DELETE SALARY
// =======================================================
export async function deleteSalary(req, res) {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        error: "Salary not found",
      });
    }

    const projectId = salary.projectId;

    await salary.deleteOne();
    await recalculateRemainingBudget(projectId);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE SALARY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// BULK UPDATE SALARIES
// =======================================================
export async function bulkUpdateSalaries(req, res) {
  try {
    const { salaryIds, department, projectId, overheadPercent } = req.body;

    if (!salaryIds || !Array.isArray(salaryIds) || salaryIds.length === 0) {
      return res.status(400).json({ success: false, error: "חייב לספק מערך של מזהי משכורות" });
    }

    const updateObj = {};
    if (department !== undefined) updateObj.department = department || null;
    if (projectId !== undefined) updateObj.projectId = projectId;

    // אם יש עדכון תקורה – צריך לחשב מחדש finalAmount לכל משכורת
    if (overheadPercent !== undefined) {
      const salaries = await Salary.find({ _id: { $in: salaryIds } });
      const projectsToRecalc = new Set();

      for (const salary of salaries) {
        salary.overheadPercent = overheadPercent;
        salary.finalAmount = salary.baseAmount + (salary.baseAmount * overheadPercent / 100);
        if (department !== undefined) salary.department = department || null;
        if (projectId !== undefined) {
          projectsToRecalc.add(salary.projectId.toString());
          salary.projectId = projectId;
        }
        await salary.save();
        projectsToRecalc.add(salary.projectId.toString());
      }

      for (const pid of projectsToRecalc) {
        await recalculateRemainingBudget(pid);
      }

      return res.json({
        success: true,
        message: `עודכנו ${salaries.length} משכורות`,
        updated: salaries.length
      });
    }

    // עדכון פשוט (בלי חישוב תקורה מחדש)
    if (Object.keys(updateObj).length > 0) {
      const projectsToRecalc = new Set();

      if (projectId) {
        // מציאת פרויקטים ישנים לחישוב מחדש
        const oldSalaries = await Salary.find({ _id: { $in: salaryIds } }).select("projectId");
        oldSalaries.forEach(s => projectsToRecalc.add(s.projectId.toString()));
        projectsToRecalc.add(projectId);
      }

      await Salary.updateMany({ _id: { $in: salaryIds } }, { $set: updateObj });

      for (const pid of projectsToRecalc) {
        await recalculateRemainingBudget(pid);
      }

      return res.json({
        success: true,
        message: `עודכנו ${salaryIds.length} משכורות`,
        updated: salaryIds.length
      });
    }

    return res.json({ success: true, message: "אין שינויים", updated: 0 });
  } catch (err) {
    console.error("BULK UPDATE SALARIES ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// BULK DELETE SALARIES
// =======================================================
export async function bulkDeleteSalaries(req, res) {
  try {
    const { salaryIds } = req.body;

    if (!salaryIds || !Array.isArray(salaryIds) || salaryIds.length === 0) {
      return res.status(400).json({ success: false, error: "חייב לספק מערך של מזהי משכורות" });
    }

    const salaries = await Salary.find({ _id: { $in: salaryIds } }).select("projectId");
    const projectIds = [...new Set(salaries.map(s => s.projectId.toString()))];

    await Salary.deleteMany({ _id: { $in: salaryIds } });

    for (const pid of projectIds) {
      await recalculateRemainingBudget(pid);
    }

    res.json({
      success: true,
      message: `נמחקו ${salaryIds.length} משכורות`,
      deleted: salaryIds.length
    });
  } catch (err) {
    console.error("BULK DELETE SALARIES ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// EXPORT SALARIES PDF (BY PROJECT)
// =======================================================
export async function exportSalaries(req, res) {
  try {

    // ✅ תמיכה גם ב-GET וגם ב-POST
    let projectIds = req.body.projectIds || req.query.projectIds;

    if (!projectIds) {
      return res.status(400).json({
        success: false,
        error: "projectIds is required",
      });
    }

    // המרת מחרוזת למערך (אם מגיע כמחרוזת מ-GET) או שימוש ישיר (אם מגיע כמערך מ-POST)
    const idsArray = Array.isArray(projectIds)
      ? projectIds
      : projectIds.split(',').map(id => id.trim());

    // מציאת כל הפרויקטים
    const projects = await Project.find({ _id: { $in: idsArray } });
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No projects found",
      });
    }

    // מציאת כל המשכורות מהפרויקטים שנבחרו
    const salaries = await Salary.find({ projectId: { $in: idsArray } })
      .populate("projectId", "name")
      .sort({ date: -1 });

    // סינון פרויקטים שיש להם משכורות בלבד
    const projectsWithSalaries = projects.filter(project =>
      salaries.some(salary => salary.projectId._id.toString() === project._id.toString())
    );

    if (salaries.length === 0 || projectsWithSalaries.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No salaries found for the selected projects",
      });
    }

    const projectNames = projectsWithSalaries.map(p => p.name).join(', ');
    const pdfPath = await generateSalaryExportPDF({
      salaries,
      projectName: projectNames,
      isMultipleProjects: projectsWithSalaries.length > 1,
    });

    const fileName = projectsWithSalaries.length === 1
      ? `salary-export-${projectsWithSalaries[0].name}.pdf`
      : `salary-export-multiple-projects.pdf`;

    res.download(pdfPath, fileName, (err) => {
      if (err) console.error("PDF DOWNLOAD ERROR:", err);
      fs.unlinkSync(pdfPath);
    });
  } catch (err) {
    console.error("❌ EXPORT SALARIES ERROR:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
}

// =======================================================
// UPLOAD SALARIES FROM EXCEL
// =======================================================
export async function uploadSalariesExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "לא נבחר קובץ" });
    }

    const { projectId, overheadPercent, department } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: "יש לבחור פרויקט" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: "פרויקט לא נמצא" });
    }

    // קריאת קובץ אקסל
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // מציאת שורת הכותרות
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row && row.some(cell => typeof cell === "string" && (cell.includes("שם") || cell.includes("תשלומים") || cell.includes("נטו")))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return res.status(400).json({
        success: false,
        error: "לא נמצאו כותרות מתאימות בקובץ. יש לוודא שהקובץ מכיל עמודות: שם, סה\"כ תשלומים, נטו לתשלום",
      });
    }

    const overhead = parseFloat(overheadPercent) || 0;
    const createdSalaries = [];
    let skippedRows = 0;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const name = row[0];
      const baseAmount = parseFloat(row[1]);
      const netAmount = parseFloat(row[2]);

      // דלג על שורות ריקות, סיכומים, או שורות לא תקינות
      if (!name || typeof name !== "string" || name.trim() === "") continue;
      if (name.includes("סה\"כ") || name.includes("סהכ")) continue;
      if (isNaN(baseAmount) && isNaN(netAmount)) {
        skippedRows++;
        continue;
      }

      const finalAmount = (baseAmount || 0) + ((baseAmount || 0) * overhead / 100);

      const salary = await Salary.create({
        projectId,
        employeeName: name.trim(),
        department: department || null,
        baseAmount: baseAmount || 0,
        netAmount: isNaN(netAmount) ? null : netAmount,
        overheadPercent: overhead,
        finalAmount,
        createdBy: req.user._id,
        createdByName: req.user.username || req.user.name,
      });

      createdSalaries.push(salary);
    }

    await recalculateRemainingBudget(projectId);

    res.status(201).json({
      success: true,
      message: `נוצרו ${createdSalaries.length} משכורות בהצלחה${skippedRows > 0 ? ` (${skippedRows} שורות דולגו)` : ""}`,
      data: {
        created: createdSalaries.length,
        skipped: skippedRows,
      },
    });
  } catch (err) {
    console.error("UPLOAD SALARIES EXCEL ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
