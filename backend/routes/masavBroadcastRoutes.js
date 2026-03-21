import express from "express";
import masavBroadcastController from "../controller/masavBroadcastController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/upload", protect, masavBroadcastController.upload);
router.get("/", protect, masavBroadcastController.getAll);
router.get("/:id/download", protect, masavBroadcastController.download);
router.delete("/:id", protect, masavBroadcastController.delete);

export default router;
