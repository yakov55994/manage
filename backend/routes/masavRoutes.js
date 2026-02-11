import express from "express";
import masavController from "../controller/masavController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate", masavController.generateMasav);
router.get("/history", protect, masavController.getMasavHistory);
router.get("/history/:id/download", protect, masavController.downloadMasavHistory);

export default router;
