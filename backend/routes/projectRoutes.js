import express from "express";
import { protect, requireAdmin, checkAccess } from "../middleware/auth.js";
import projectController from "../controller/projectControllers.js";

const router = express.Router();

// 📌 רשימת פרויקטים — ללא checkAccess
router.get("/", protect, projectController.getAllProjects);

router.get("/search", protect, projectController.searchProjects);

// 📌 פרויקט ספציפי — כן
router.get("/:projectId", protect, checkAccess("projects", "view"), projectController.getProjectById);

// 📌 יצירה — רק אדמין
router.post("/", protect, requireAdmin, projectController.createProject);

// 📌 עדכון — כן
router.put("/:projectId", protect, checkAccess("projects", "edit"), projectController.updateProject);

// 📌 מחיקה — כן
router.delete("/:projectId", protect, requireAdmin, checkAccess("projects", "edit"), projectController.deleteProject);

export default router;
