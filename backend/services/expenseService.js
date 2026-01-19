import Expense from "../models/Expense.js";

export default {
  // קבלת כל ההוצאות
  async getAllExpenses(user) {
    let query = {};

    const expenses = await Expense.find(query)
      .sort({ createdAt: -1 });

    return expenses;
  },

  // קבלת הוצאה לפי ID
  async getExpenseById(user, expenseId) {
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      throw new Error("הוצאה לא נמצאה");
    }

    return expense;
  },

  // יצירת הוצאה בודדת
  async createExpense(user, data) {
    const expenseData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || "משתמש",
    };

    const expense = await Expense.create(expenseData);
    return expense;
  },

  // יצירת הוצאות מרובות (מקובץ אקסל)
  async createBulkExpenses(user, expensesData) {
    const createdExpenses = [];

    for (const expenseData of expensesData) {
      const expense = await this.createExpense(user, expenseData);
      createdExpenses.push(expense);
    }

    return createdExpenses;
  },

  // עדכון הוצאה
  async updateExpense(user, expenseId, data) {
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      throw new Error("הוצאה לא נמצאה");
    }

    const updatedExpense = await Expense.findByIdAndUpdate(expenseId, data, {
      new: true,
    });

    return updatedExpense;
  },

  // מחיקת הוצאה
  async deleteExpense(user, expenseId) {
    if (user.role !== "admin") {
      throw new Error("רק מנהל יכול למחוק הוצאות");
    }

    const expense = await Expense.findById(expenseId);

    if (!expense) {
      throw new Error("הוצאה לא נמצאה");
    }

    await Expense.findByIdAndDelete(expenseId);

    return expense;
  },

  // חיפוש הוצאות
  async searchExpenses(query) {
    const regex = new RegExp(query, "i");

    const expenses = await Expense.find({
      $or: [
        { description: regex },
        { notes: regex },
        { reference: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100);

    return expenses;
  },

  // עדכון הערות מרובה
  async bulkUpdateNotes(user, expenseIds, notes) {
    const result = await Expense.updateMany(
      { _id: { $in: expenseIds } },
      { $set: { notes: notes } }
    );
    return result;
  },
};
