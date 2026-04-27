import expenseService from "../services/expenseService.js";
import { sendError } from "../utils/sendError.js";
import { saveLog, getIp } from "../utils/logger.js";

const expenseController = {
  // חיפוש הוצאות
  async searchExpenses(req, res) {
    try {
      const q = req.query.query || "";
      const results = await expenseService.searchExpenses(q);
      res.json(results);
    } catch (e) {
      console.error("searchExpenses ERROR:", e);
      saveLog({ type: 'error', message: `שגיאה בחיפוש הוצאות — ${e.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { query: req.query.q } });
      res.status(500).json({ message: "Search failed" });
    }
  },

  // קבלת כל ההוצאות
  async getAllExpenses(req, res) {
    try {
      const expenses = await expenseService.getAllExpenses(req.user);
      res.json({ success: true, data: expenses });
    } catch (e) {
      sendError(res, e, req);
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
      sendError(res, e, req);
    }
  },

  // יצירת הוצאה בודדת
  async createExpense(req, res) {
    try {
      const expense = await expenseService.createExpense(req.user, req.body);
      saveLog({ type: 'info', message: `תנועת חובה נוצרה — ${expense.description || ''}, סכום: ${expense.amount}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { expenseId: expense._id, amount: expense.amount } });
      res.status(201).json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e, req);
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
      saveLog({ type: 'info', message: `תנועת חובה עודכנה — מזהה: ${req.params.expenseId}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { expenseId: req.params.expenseId } });
      res.json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  // מחיקת הוצאה
  async deleteExpense(req, res) {
    try {
      await expenseService.deleteExpense(req.user, req.params.expenseId);
      saveLog({ type: 'info', message: `תנועת חובה נמחקה — מזהה: ${req.params.expenseId}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { expenseId: req.params.expenseId } });
      res.json({ success: true, message: "הוצאה נמחקה בהצלחה" });
    } catch (e) {
      sendError(res, e, req);
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
      saveLog({ type: 'info', message: `עודכנו הערות ל-${result.modifiedCount} תנועות חובה`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { count: result.modifiedCount } });
      res.json({ success: true, data: result, message: `עודכנו ${result.modifiedCount} הוצאות` });
    } catch (e) {
      sendError(res, e, req);
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
      saveLog({ type: 'info', message: `תנועת חובה שויכה — מזהה: ${req.params.expenseId}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { expenseId: req.params.expenseId, invoiceIds, salaryIds, orderIds } });
      res.json({ success: true, data: expense });
    } catch (e) {
      sendError(res, e, req);
    }
  },
};

export default expenseController;
