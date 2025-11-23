import express from "express";
import {
  checkAccess,
  protect,
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
  checkAccess("project", "view"),
  projectController.getProjectById
);

// יצירה – רק אדמין!
router.post(
  "/",
  protect,
  projectController.createProject
);

// עדכון – requires edit
router.put(
  "/:projectId",
  protect,
  checkAccess("project", "edit"),
  projectController.updateProject
);

// מחיקה – רק אדמין
router.delete(
  "/:projectId",
  protect,
  projectController.deleteProject
);

export default router;
