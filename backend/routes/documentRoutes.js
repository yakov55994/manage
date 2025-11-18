import express from "express";
import { protect } from "../middleware/auth.js";
import { collectDocuments } from "../controller/documentController.js";

const router = express.Router();

router.post("/collect", protect, collectDocuments);

export default router;
