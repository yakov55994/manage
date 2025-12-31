import Salary from "../models/Salary.js";
import Project from "../models/Project.js";
import { recalculateRemainingBudget } from "../services/invoiceService.js";
import { generateSalaryExportPDF } from "../services/salaryPdfService.js";
import fs from "fs";

// =======================================================
// CREATE SALARY
// =======================================================
export async function createSalary(req, res) {
  try {
    const {
      projectId,
      employeeName,
      baseAmount,
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
      overheadPercent,
      projectId,
    } = req.body;

    const finalAmount =
      baseAmount + (baseAmount * (overheadPercent || 0)) / 100;

    const oldProjectId = salary.projectId.toString();

    salary.employeeName = employeeName;
    salary.department = department || null;
    salary.baseAmount = baseAmount;
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
