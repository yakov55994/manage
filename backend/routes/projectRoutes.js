import express from "express";
import projectControllers from "../controller/projectControllers.js";
const router = express.Router();

router.get("/", projectControllers.getAllProjects);
router.get("/:id", projectControllers.getProjectById);
router.post("/", projectControllers.createProject);
router.put("/:id", projectControllers.updateProject);
router.delete("/:id", projectControllers.deleteProject);

export default router;
