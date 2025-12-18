import express from "express";
import { createSalary, getSalaries, exportSalaries, getSalaryById, updateSalary, deleteSalary } from "../controller/salaryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createSalary);
router.get("/", protect, getSalaries);

// ✅ תמיכה גם ב-GET וגם ב-POST לייצוא (למנוע חסימה של antivirus)
router.get("/export", protect, exportSalaries);
router.post("/export", protect, exportSalaries);

router.get("/:id", protect, getSalaryById);
router.put("/:id", protect, updateSalary);
router.delete("/:id", protect, deleteSalary);
export default router;
