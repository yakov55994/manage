import express from "express";
import {
  protect,
  requireAdmin,
  requireProjectAccess
} from "../middleware/auth.js";

import projectController from "../controller/projectControllers.js";

const router = express.Router();

// חיפוש
router.get("/search", protect, projectController.searchProjects);

// כל הפרויקטים עם סינון הרשאות פנימי
router.get("/", protect, projectController.getAllProjects);

// פרויקט לפי ID
router.get(
  "/:projectId",
  protect,
  requireProjectAccess("view"),
  projectController.getProjectById
);

// יצירה – רק אדמין!
router.post(
  "/",
  protect,
  requireAdmin,
  projectController.createProject
);

// עדכון – requires edit
router.put(
  "/:projectId",
  protect,
  requireProjectAccess("edit"),
  projectController.updateProject
);

// מחיקה – רק אדמין
router.delete(
  "/:projectId",
  protect,
  requireAdmin,
  projectController.deleteProject
);

export default router;
