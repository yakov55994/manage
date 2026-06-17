import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import Invoice from "../models/Invoice.js";
import Salary from "../models/Salary.js";
import Order from "../models/Order.js";

export default {
  // קבלת כל ההוצאות
  async getAllExpenses(user, bank) {
    let query = {};
    if (bank) query.bank = bank;

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
    return Promise.all(expensesData.map(expenseData => this.createExpense(user, expenseData)));
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
    const exists = await Expense.exists({ _id: expenseId });
    if (!exists) throw new Error("הוצאה לא נמצאה");

    const populatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      { $set: { linkedInvoices: invoiceIds || [], linkedSalaries: salaryIds || [], linkedOrders: orderIds || [] } },
      { new: true }
    )
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status");

    return populatedExpense;
  },

  // כל ה-IDs שכבר שויכו לתנועה כלשהי (הוצאה או הכנסה)
  async getAllLinkedIds() {
    const [expenses, incomes] = await Promise.all([
      Expense.find({}, "linkedInvoices linkedSalaries linkedOrders").lean(),
      Income.find({}, "linkedInvoices linkedSalaries linkedOrders").lean(),
    ]);

    const invoiceIds = new Set();
    const salaryIds = new Set();
    const orderIds = new Set();

    for (const doc of [...expenses, ...incomes]) {
      (doc.linkedInvoices || []).forEach(id => invoiceIds.add(id.toString()));
      (doc.linkedSalaries || []).forEach(id => salaryIds.add(id.toString()));
      (doc.linkedOrders  || []).forEach(id => orderIds.add(id.toString()));
    }

    return {
      linkedInvoiceIds: [...invoiceIds],
      linkedSalaryIds:  [...salaryIds],
      linkedOrderIds:   [...orderIds],
    };
  },
};
