import analyticsService from "../services/analyticsService.js";
import { sendError } from "../utils/sendError.js";

const analyticsController = {
  /**
   * תקציב מול הוצאות לכל פרויקט
   * GET /api/projects/analytics/budget-vs-expenses
   */
  async getBudgetVsExpenses(req, res) {
    try {
      const data = await analyticsService.getBudgetVsExpenses(req.user);
      res.json({ success: true, data });
    } catch (e) {
      console.error("❌ getBudgetVsExpenses ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * הכנסות מול הוצאות לפי זמן
   * GET /api/analytics/income-vs-expenses?months=6
   */
  async getIncomeVsExpenses(req, res) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = await analyticsService.getIncomeVsExpenses(months);
      res.json({ success: true, data });
    } catch (e) {
      console.error("❌ getIncomeVsExpenses ERROR:", e);
      sendError(res, e);
    }
  },

  /**
   * התפלגות סטטוס תשלומים
   * GET /api/invoices/analytics/payment-status
   */
  async getPaymentStatusDistribution(req, res) {
    try {
      const data = await analyticsService.getPaymentStatusDistribution();
      res.json({ success: true, data });
    } catch (e) {
      console.error("❌ getPaymentStatusDistribution ERROR:", e);
      sendError(res, e);
    }
  }
};

export default analyticsController;
