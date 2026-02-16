import Expense from "../models/Expense.js";
import Invoice from "../models/Invoice.js";
import Salary from "../models/Salary.js";
import Order from "../models/Order.js";

export default {
  // קבלת כל ההוצאות
  async getAllExpenses(user) {
    let query = {};

    const expenses = await Expense.find(query)
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status")
      .sort({ createdAt: -1 });

    return expenses;
  },

  // קבלת הוצאה לפי ID
  async getExpenseById(user, expenseId) {
    const expense = await Expense.findById(expenseId)
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status");

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

  // שיוך הוצאה לחשבוניות, משכורות והזמנות
  async linkExpense(user, expenseId, invoiceIds, salaryIds, orderIds) {
    const expense = await Expense.findById(expenseId);

    if (!expense) {
      throw new Error("הוצאה לא נמצאה");
    }

    // חישוב סכום כולל של חשבוניות, משכורות והזמנות משויכות
    let totalLinkedAmount = 0;

    if (invoiceIds && invoiceIds.length > 0) {
      const invoices = await Invoice.find({ _id: { $in: invoiceIds } });
      totalLinkedAmount += invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    }

    if (salaryIds && salaryIds.length > 0) {
      const salaries = await Salary.find({ _id: { $in: salaryIds } });
      totalLinkedAmount += salaries.reduce((sum, sal) => sum + (Number(sal.netAmount) || Number(sal.baseAmount) || Number(sal.finalAmount) || 0), 0);
    }

    if (orderIds && orderIds.length > 0) {
      const orders = await Order.find({ _id: { $in: orderIds } });
      totalLinkedAmount += orders.reduce((sum, ord) => sum + (Number(ord.sum) || 0), 0);
    }

    // אימות שהסכום זהה (עם סטייה קטנה לסיכום שקלים)
    const expenseAmount = Math.abs(Number(expense.amount) || 0);
    const tolerance = 0.01; // סטייה מותרת של 1 אגורה

    if (totalLinkedAmount > 0 && Math.abs(expenseAmount - totalLinkedAmount) > tolerance) {
      throw new Error(`סכום ההוצאה (${expenseAmount.toLocaleString()} ₪) חייב להיות זהה לסכום הפריטים המשויכים (${totalLinkedAmount.toLocaleString()} ₪)`);
    }

    expense.linkedInvoices = invoiceIds || [];
    expense.linkedSalaries = salaryIds || [];
    expense.linkedOrders = orderIds || [];

    await expense.save();

    // החזר עם populate
    const populatedExpense = await Expense.findById(expenseId)
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status");

    return populatedExpense;
  },
};
