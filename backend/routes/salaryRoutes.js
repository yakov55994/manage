import express from "express";
import { createSalary, getSalaries, exportSalaries, getSalaryById, updateSalary, deleteSalary } from "../controller/salaryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", createSalary);
router.get("/", getSalaries);
router.get("/export", exportSalaries);
router.get("/:id", getSalaryById);
router.put("/:id", updateSalary);
router.delete("/:id", deleteSalary);
export default router;
