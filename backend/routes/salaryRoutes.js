import express from "express";
import { createSalary, getSalaries, exportSalaries } from "../controller/salaryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createSalary);
router.get("/", protect, getSalaries);
router.get("/export", protect, exportSalaries);

export default router;
