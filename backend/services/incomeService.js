import Income from "../models/Income.js";
import Project from "../models/Project.js";

export default {
  // קבלת כל ההכנסות
  async getAllIncomes(user) {
    let query = {};

    // משתמש רגיל - לפי הרשאות פרויקטים
    if (user.role !== "admin") {
      const allowedProjectIds = user.permissions
        .map((p) => p.project?._id?.toString() || p.project.toString())
        .filter(Boolean);

      query = {
        $or: [
          { projectId: { $in: allowedProjectIds } },
          { projectId: null }, // הכנסות שלא משוייכות לפרויקט
        ],
      };
    }

    const incomes = await Income.find(query)
      .populate("projectId", "name")
      .sort({ date: -1 });

    return incomes;
  },

  // קבלת הכנסה לפי ID
  async getIncomeById(user, incomeId) {
    const income = await Income.findById(incomeId).populate("projectId", "name");

    if (!income) {
      throw new Error("הכנסה לא נמצאה");
    }

    // בדיקת הרשאות
    if (user.role !== "admin") {
      const allowedProjectIds = user.permissions
        .map((p) => String(p.project?._id || p.project))
        .filter(Boolean);

      if (income.projectId && !allowedProjectIds.includes(String(income.projectId._id))) {
        throw new Error("אין הרשאה לצפות בהכנסה זו");
      }
    }

    return income;
  },

  // יצירת הכנסה בודדת
  async createIncome(user, data) {
    const incomeData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || "משתמש",
    };

    // אם יש projectId, קבל את שם הפרויקט
    if (data.projectId) {
      const project = await Project.findById(data.projectId);
      if (project) {
        incomeData.projectName = project.name;
      }
    }

    const income = await Income.create(incomeData);
    return income;
  },

  // יצירת הכנסות מרובות (מקובץ אקסל)
  async createBulkIncomes(user, incomesData) {
    const createdIncomes = [];

    for (const incomeData of incomesData) {
      const income = await this.createIncome(user, incomeData);
      createdIncomes.push(income);
    }

    return createdIncomes;
  },

  // עדכון הכנסה
  async updateIncome(user, incomeId, data) {
    const income = await Income.findById(incomeId);

    if (!income) {
      throw new Error("הכנסה לא נמצאה");
    }

    // בדיקת הרשאות
    if (user.role !== "admin") {
      const allowedProjectIds = user.permissions
        .map((p) => String(p.project?._id || p.project))
        .filter(Boolean);

      if (income.projectId && !allowedProjectIds.includes(String(income.projectId))) {
        throw new Error("אין הרשאה לעדכן הכנסה זו");
      }
    }

    // אם משנים את הפרויקט, עדכן את שם הפרויקט
    if (data.projectId && data.projectId !== String(income.projectId)) {
      const project = await Project.findById(data.projectId);
      if (project) {
        data.projectName = project.name;
      }
    }

    const updatedIncome = await Income.findByIdAndUpdate(incomeId, data, {
      new: true,
    }).populate("projectId", "name");

    return updatedIncome;
  },

  // מחיקת הכנסה
  async deleteIncome(user, incomeId) {
    if (user.role !== "admin") {
      throw new Error("רק מנהל יכול למחוק הכנסות");
    }

    const income = await Income.findById(incomeId);

    if (!income) {
      throw new Error("הכנסה לא נמצאה");
    }

    await Income.findByIdAndDelete(incomeId);

    return income;
  },

  // חיפוש הכנסות
  async searchIncomes(query) {
    const regex = new RegExp(query, "i");

    const incomes = await Income.find({
      $or: [
        { description: regex },
        { notes: regex },
        { projectName: regex },
      ],
    })
      .populate("projectId", "name")
      .sort({ date: -1 })
      .limit(100);

    return incomes;
  },
};
