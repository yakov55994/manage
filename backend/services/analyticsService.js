import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";

const analyticsService = {
  /**
   * תקציב מול הוצאות לכל פרויקט
   */
  async getBudgetVsExpenses(user) {
    // קבלת כל הפרויקטים שלמשתמש יש גישה אליהם
    let projectFilter = {};

    if (user.role !== "admin" && user.role !== "accountant") {
      const allowedProjectIds = user.permissions?.project || [];
      projectFilter = { _id: { $in: allowedProjectIds } };
    }

    const projects = await Project.find({
      ...projectFilter,
      budget: { $gt: 0 }
    }).lean();

    const result = projects.map(project => {
      const spent = project.budget - (project.remainingBudget || 0);
      const percentUsed = project.budget > 0
        ? Math.round((spent / project.budget) * 100)
        : 0;

      return {
        projectId: project._id,
        projectName: project.name,
        budget: project.budget,
        spent: spent,
        remaining: project.remainingBudget || 0,
        percentUsed: percentUsed
      };
    });

    // מיון לפי אחוז ניצול (מהגבוה לנמוך)
    result.sort((a, b) => b.percentUsed - a.percentUsed);

    return result;
  },

  /**
   * הכנסות מול הוצאות לפי חודשים
   */
  async getIncomeVsExpenses(months = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Aggregation להכנסות
    const incomeAgg = await Income.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          total: {
            $sum: {
              $toDouble: { $ifNull: ["$amount", "0"] }
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Aggregation להוצאות
    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          total: {
            $sum: {
              $toDouble: { $ifNull: ["$amount", "0"] }
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // יצירת מערך חודשים
    const monthsArray = [];
    const hebrewMonths = [
      "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
      "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ];

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - 1 - i));

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      // מציאת ההכנסות וההוצאות לחודש זה
      const incomeData = incomeAgg.find(
        item => item._id.year === year && item._id.month === month
      );
      const expenseData = expenseAgg.find(
        item => item._id.year === year && item._id.month === month
      );

      const income = incomeData?.total || 0;
      const expenses = expenseData?.total || 0;

      monthsArray.push({
        period: `${year}-${String(month).padStart(2, "0")}`,
        periodLabel: `${hebrewMonths[month]} ${year}`,
        income: Math.round(income),
        expenses: Math.round(expenses),
        balance: Math.round(income - expenses)
      });
    }

    return monthsArray;
  },

  /**
   * התפלגות סטטוס תשלומים של חשבוניות
   */
  async getPaymentStatusDistribution() {
    const statusAgg = await Invoice.aggregate([
      {
        $group: {
          _id: "$paid",
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ["$totalAmount", 0] } }
        }
      }
    ]);

    // מיפוי לפורמט נוח
    const result = {
      paid: { count: 0, amount: 0 },       // כן
      unpaid: { count: 0, amount: 0 },     // לא
      inProcess: { count: 0, amount: 0 }   // יצא לתשלום
    };

    for (const item of statusAgg) {
      if (item._id === "כן") {
        result.paid = { count: item.count, amount: Math.round(item.amount) };
      } else if (item._id === "לא") {
        result.unpaid = { count: item.count, amount: Math.round(item.amount) };
      } else if (item._id === "יצא לתשלום") {
        result.inProcess = { count: item.count, amount: Math.round(item.amount) };
      }
    }

    // הוספת סה"כ
    result.total = {
      count: result.paid.count + result.unpaid.count + result.inProcess.count,
      amount: result.paid.amount + result.unpaid.amount + result.inProcess.amount
    };

    return result;
  }
};

export default analyticsService;
