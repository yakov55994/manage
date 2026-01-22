import expenseService from "../services/expenseService.js";
import { sendError } from "../utils/sendError.js";

const expenseController = {
  // חיפוש הוצאות
  async searchExpenses(req, res) {
    try {
      const q = req.query.query || "";
      const results = await expenseService.searchExpenses(q);
      res.json(results);
    } catch (e) {
      console.error("searchExpenses ERROR:", e);
      res.status(500).json({ message: "Search failed" });
    }
  },

  // קבלת כל ההוצאות
  async getAllExpenses(req, res) {
    try {
      const expenses = await expenseService.getAllExpenses(req.user);
      res.json({ success: true, data: expenses });
    } catch (e) {
      sendError(res, e);
    }
  },

  // קבלת הוצאה לפי ID
  async getExpenseById(req, res) {
    try {
      const expense = await expenseService.getExpenseById(
        req.user,
        req.params.expenseId
      );
      res.json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e);
    }
  },

  // יצירת הוצאה בודדת
  async createExpense(req, res) {
    try {
      const expense = await expenseService.createExpense(req.user, req.body);
      res.status(201).json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e);
    }
  },

  // עדכון הוצאה
  async updateExpense(req, res) {
    try {
      const expense = await expenseService.updateExpense(
        req.user,
        req.params.expenseId,
        req.body
      );
      res.json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e);
    }
  },

  // מחיקת הוצאה
  async deleteExpense(req, res) {
    try {
      await expenseService.deleteExpense(req.user, req.params.expenseId);
      res.json({ success: true, message: "הוצאה נמחקה בהצלחה" });
    } catch (e) {
      sendError(res, e);
    }
  },

  // עדכון הערות מרובה
  async bulkUpdateNotes(req, res) {
    try {
      const { expenseIds, notes } = req.body;
      if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
        return res.status(400).json({ success: false, message: "לא נבחרו הוצאות" });
      }
      const result = await expenseService.bulkUpdateNotes(req.user, expenseIds, notes);
      res.json({ success: true, data: result, message: `עודכנו ${result.modifiedCount} הוצאות` });
    } catch (e) {
      sendError(res, e);
    }
  },

  // שיוך הוצאה לחשבוניות, משכורות והזמנות
  async linkExpense(req, res) {
    try {
      const { invoiceIds, salaryIds, orderIds } = req.body;
      const expense = await expenseService.linkExpense(
        req.user,
        req.params.expenseId,
        invoiceIds || [],
        salaryIds || [],
        orderIds || []
      );
      res.json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e);
    }
  },
};

export default expenseController;
