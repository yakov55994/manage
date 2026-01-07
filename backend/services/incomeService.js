import Income from "../models/Income.js";
import Invoice from "../models/Invoice.js";

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
      .populate("invoiceId", "invoiceNumber invitingName totalAmount")
      .sort({ date: -1 });

    return incomes;
  },

  // קבלת הכנסה לפי ID
  async getIncomeById(user, incomeId) {
    const income = await Income.findById(incomeId).populate("invoiceId", "invoiceNumber invitingName totalAmount");

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

    // אם יש invoiceId, קבל את מספר ההזמנה
    if (data.invoiceId) {
      const invoice = await Invoice.findById(data.invoiceId);
      if (invoice) {
        incomeData.invoiceNumber = invoice.invoiceNumber;
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

    // בדיקת הרשאות - כרגע לא מגבילים לפי הזמנות
    // אם נרצה בעתיד להגביל, נוסיף כאן לוגיקה דומה

    // אם משנים את ההזמנה, עדכן את מספר ההזמנה
    if (data.invoiceId && data.invoiceId !== String(income.invoiceId)) {
      const invoice = await Invoice.findById(data.invoiceId);
      if (invoice) {
        data.invoiceNumber = invoice.invoiceNumber;
      }
    }

    const updatedIncome = await Income.findByIdAndUpdate(incomeId, data, {
      new: true,
    }).populate("invoiceId", "invoiceNumber invitingName totalAmount");

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
        { invoiceNumber: regex },
      ],
    })
      .populate("invoiceId", "invoiceNumber invitingName totalAmount")
      .sort({ date: -1 })
      .limit(100);

    return incomes;
  },
};
