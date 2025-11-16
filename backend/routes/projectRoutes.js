import express from "express";
import { protect, requireAdmin, requireProjectAccess } from "../middleware/auth.js";
import projectController from "../controller/projectControllers.js";
import { can } from "../middleware/auth.js";

const router = express.Router();

router.get("/",
  protect,
  projectController.getAllProjects // כבר מסודר לפי הרשאות
);

router.get("/:projectId",
  protect,
  projectController.getProjectById
);

router.post("/",
  protect,
  requireAdmin,
  projectController.createProject
);

router.put("/:projectId",
  protect,
  requireProjectAccess("edit"),
  projectController.updateProject
);


router.delete("/:projectId",
  protect,
  requireAdmin,
  projectController.deleteProject
);

export default router;
