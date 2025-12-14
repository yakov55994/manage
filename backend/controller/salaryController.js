import Salary from "../models/Salary.js";
import Project from "../models/Project.js";
import { recalculateRemainingBudget } from "../services/invoiceService.js";
import { generateSalaryExportPDF } from "../services/salaryPdfService.js";
import fs from "fs";

export async function createSalary(req, res) {
  try {
    const { projectId, employeeName, baseAmount, overheadPercent, department } = req.body;

    const finalAmount = baseAmount + (baseAmount * (overheadPercent || 0) / 100);

    const salary = await Salary.create({
      projectId,
      employeeName,
      department: department || null,
      baseAmount,
      overheadPercent,
      finalAmount,
      createdBy: req.user._id,
      createdByName: req.user.username || req.user.name
    });

    await recalculateRemainingBudget(projectId);

    res.json({ success: true, data: salary });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSalaries(req, res) {
  const salaries = await Salary.find().populate("projectId", "name");
  res.json({ success: true, data: salaries });
}

export async function exportSalaries(req, res) {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    // שלוף את הפרויקט
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // שלוף את כל המשכורות של הפרויקט
    const salaries = await Salary.find({ projectId }).sort({ date: -1 });

    if (salaries.length === 0) {
      return res.status(404).json({ success: false, error: "No salaries found for this project" });
    }

    // יצירת PDF
    const pdfPath = await generateSalaryExportPDF({
      salaries,
      projectName: project.name
    });

    // שליחת הקובץ
    res.download(pdfPath, `salary-export-${project.name}.pdf`, (err) => {
      if (err) {
        console.error("Error sending PDF:", err);
      }
      // מחיקת הקובץ הזמני לאחר השליחה
      fs.unlinkSync(pdfPath);
    });

  } catch (err) {
    console.error("Error exporting salaries:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
