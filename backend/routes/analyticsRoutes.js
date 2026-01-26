import express from "express";
import { protect } from "../middleware/auth.js";
import analyticsController from "../controller/analyticsControllers.js";

const router = express.Router();

// 📊 הכנסות מול הוצאות לפי חודשים
router.get("/income-vs-expenses", protect, analyticsController.getIncomeVsExpenses);

export default router;
