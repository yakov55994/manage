import express from "express";
import masavController from "../controller/masavController.js";

const router = express.Router();

router.post("/generate", masavController.generateMasav);

export default router;
