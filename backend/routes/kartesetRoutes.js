import express from "express";
import kartesetController from "../controller/kartesetController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/project", protect, kartesetController.projectKarteset);
router.post("/supplier", protect, kartesetController.supplierKarteset);

export default router;
