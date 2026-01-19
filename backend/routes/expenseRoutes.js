import express from "express";
import expenseController from "../controller/expenseControllers.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// חיפוש הוצאות
router.get("/search", protect, expenseController.searchExpenses);

// קבלת כל ההוצאות
router.get("/", protect, expenseController.getAllExpenses);

// קבלת הוצאה לפי ID
router.get("/:expenseId", protect, expenseController.getExpenseById);

// יצירת הוצאה בודדת
router.post("/", protect, expenseController.createExpense);

// עדכון הערות מרובה
router.put("/bulk/notes", protect, expenseController.bulkUpdateNotes);

// שיוך הוצאה לחשבוניות ומשכורות
router.put("/:expenseId/link", protect, expenseController.linkExpense);

// עדכון הוצאה
router.put("/:expenseId", protect, expenseController.updateExpense);

// מחיקת הוצאה
router.delete("/:expenseId", protect, expenseController.deleteExpense);

export default router;
