import Salary from "../models/Salary.js";
import Project from "../models/Project.js";
import { recalculateRemainingBudget } from "../services/invoiceService.js";

export async function createSalary(req, res) {
  try {
    const { projectId, employeeName, baseAmount, overheadPercent } = req.body;

    const finalAmount = baseAmount + (baseAmount * (overheadPercent || 0) / 100);

    const salary = await Salary.create({
      projectId,
      employeeName,
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
  res.json({ success: false, error: "export not implemented yet" });
}
