import Income from "../models/Income.js";
import Order from "../models/Order.js";
import Invoice from "../models/Invoice.js";
import Salary from "../models/Salary.js";

export default {
  // קבלת כל ההכנסות
  async getAllIncomes(user) {
    let query = {};

    // משתמש רגיל - לפי הרשאות פרויקטים (כרגע לא מגבילים לפי הזמנות)
    // אם נרצה בעתיד להגביל לפי הזמנות, נוסיף כאן לוגיקה דומה
    // if (user.role !== "admin") {
    //   ...
    // }

    const incomes = await Income.find(query)
      .populate("orderId", "orderNumber projectName sum")
      .populate("invoiceId", "invoiceNumber projectName")
      .populate("supplierId", "name")
      .populate("linkedIncomeId", "description amount date")
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status")
      .sort({ date: -1 });

    return incomes;
  },

  // קבלת הכנסה לפי ID
  async getIncomeById(user, incomeId) {
    const income = await Income.findById(incomeId)
      .populate("orderId", "orderNumber projectName sum")
      .populate("invoiceId", "invoiceNumber projectName")
      .populate("supplierId", "name")
      .populate("linkedIncomeId", "description amount date")
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status");

    if (!income) {
      throw new Error("הכנסה לא נמצאה");
    }

    // בדיקת הרשאות - כרגע לא מגבילים לפי הזמנות
    // אם נרצה בעתיד להגביל, נוסיף כאן לוגיקה דומה

    return income;
  },

  // יצירת הכנסה בודדת
  async createIncome(user, data) {
    const incomeData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || "משתמש",
    };

    // אם יש orderId, קבל את מספר ההזמנה
    if (data.orderId) {
      const order = await Order.findById(data.orderId);
      if (order) {
        incomeData.orderNumber = order.orderNumber;
      }
    }

    const income = await Income.create(incomeData);
    return income;
  },

  // יצירת הכנסות מרובות (מקובץ אקסל)
  async createBulkIncomes(user, incomesData) {
    return Promise.all(incomesData.map(incomeData => this.createIncome(user, incomeData)));
  },

  // עדכון הכנסה
  async updateIncome(user, incomeId, data) {
    const income = await Income.findById(incomeId);

    if (!income) {
      throw new Error("הכנסה לא נמצאה");
    }

    // בדיקת הרשאות - כרגע לא מגבילים לפי הזמנות
    // אם נרצה בעתיד להגביל, נוסיף כאן לוגיקה דומה

    // אם משנים את ההזמנה, עדכן את מספר ההזמנה
    if (data.orderId && data.orderId !== String(income.orderId)) {
      const order = await Order.findById(data.orderId);
      if (order) {
        data.orderNumber = order.orderNumber;
      }
    }

    const updatedIncome = await Income.findByIdAndUpdate(incomeId, data, {
      new: true,
    })
      .populate("orderId", "orderNumber projectName sum")
      .populate("invoiceId", "invoiceNumber projectName")
      .populate("supplierId", "name")
      .populate("linkedIncomeId", "description amount date");

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
        { orderNumber: regex },
      ],
    })
      .populate("orderId", "orderNumber projectName sum")
      .populate("invoiceId", "invoiceNumber projectName")
      .populate("supplierId", "name")
      .populate("linkedIncomeId", "description amount date")
      .sort({ date: -1 })
      .limit(100);

    return incomes;
  },

  // עדכון הערות מרובה
  async bulkUpdateNotes(user, incomeIds, notes) {
    const result = await Income.updateMany(
      { _id: { $in: incomeIds } },
      { $set: { notes: notes } }
    );
    return result;
  },

  // שיוך הכנסה לחשבוניות, משכורות והזמנות
  async linkIncome(user, incomeId, invoiceIds, salaryIds, orderIds) {
    const exists = await Income.exists({ _id: incomeId });
    if (!exists) throw new Error("הכנסה לא נמצאה");

    const hasLinks = (invoiceIds?.length > 0) || (salaryIds?.length > 0) || (orderIds?.length > 0);

    const populatedIncome = await Income.findByIdAndUpdate(
      incomeId,
      { $set: { linkedInvoices: invoiceIds || [], linkedSalaries: salaryIds || [], linkedOrders: orderIds || [], isCredited: hasLinks ? "כן" : "לא" } },
      { new: true }
    )
      .populate("orderId", "orderNumber projectName sum")
      .populate("invoiceId", "invoiceNumber projectName")
      .populate("supplierId", "name")
      .populate("linkedIncomeId", "description amount date")
      .populate({
        path: "linkedInvoices",
        select: "invoiceNumber supplierId totalAmount createdAt paid paymentDate",
        populate: { path: "supplierId", select: "name" }
      })
      .populate("linkedSalaries", "employeeName totalAmount finalAmount netAmount baseAmount month year")
      .populate("linkedOrders", "orderNumber projectName sum status");

    return populatedIncome;
  },
};
