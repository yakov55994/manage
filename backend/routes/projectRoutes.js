import express from "express";
import projectController from "../controller/projectControllers.js";
import { protect } from '../middleware/auth.js';
import { checkProjectPermission } from "../middleware/permissions.js";

const router = express.Router();

// שליפה של כל הפרויקטים — כל אחד רק מה שמותר לו
router.get(
  "/",
  protect,
  checkProjectPermission("projects", "view-list", false),
  projectController.getAllProjects
);



// יצירה
router.post(
  "/",
  protect,
  checkProjectPermission("projects", "edit"),
  projectController.createProject
);

// פרויקט ספציפי
router.get(
  "/:projectId",
  protect,
  checkProjectPermission("projects", "view"),
  projectController.getProjectById
);

// עדכון
router.put(
  "/:projectId",
  protect,
  checkProjectPermission("projects", "edit"),
  projectController.updateProject
);

// מחיקה
router.delete(
  "/:projectId",
  protect,
  checkProjectPermission("projects", "edit"),
  projectController.deleteProject
);

export default router;
