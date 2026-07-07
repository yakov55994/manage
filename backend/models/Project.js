import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },

  budget: { type: Number, required: false, default: 0 },
  remainingBudget: { type: Number, default: 0 },

  invitingName: { type: String, required: true },
  Contact_person: { type: String, required: true },

  isMilga: { type: Boolean, default: false },

  // 🟩 חשוב! קשרי ישויות
  invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

  createdAt: { type: Date, default: Date.now },
  // ✅ הוספה חדשה
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdByName: {
    type: String,
    required: false
  },
  type: {
    type: String,
    enum: ["regular", "milga", "salary"],
    default: "regular"
  },
  // היסטוריית הפחתות תקציב
  budgetDeductions: [{
    reason: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }
  }],
  // היסטוריית הוספות תקציב
  budgetAdditions: [{
    reason: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }
  }]
});

// 🔄 עדכון אוטומטי של שם הפרויקט בכל המסמכים המשוייכים
projectSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;

  try {
    const { default: Invoice } = await import("./Invoice.js");
    const { default: Order } = await import("./Order.js");
    const { default: Income } = await import("./Income.js");

    // עדכן חשבוניות
    await Invoice.updateMany(
      { 'projects.projectId': doc._id },
      { $set: { 'projects.$[elem].projectName': doc.name } },
      { arrayFilters: [{ 'elem.projectId': doc._id }] }
    );

    // עדכן הזמנות
    await Order.updateMany(
      { projectId: doc._id },
      { $set: { projectName: doc.name } }
    );

    // עדכן הכנסות
    await Income.updateMany(
      { projectId: doc._id },
      { $set: { projectName: doc.name } }
    );

  } catch (err) {
    console.error('❌ שגיאה בעדכון שם פרויקט:', err);
  }
});

// Cascade delete invoices + orders + salaries when project is deleted
projectSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    const { default: Invoice } = await import("./Invoice.js");
    const { default: Order } = await import("./Order.js");
    const { default: Salary } = await import("./Salary.js");

    // ✅ מחק חשבוניות רגילות שמשויכות לפרויקט
    const invoices = await Invoice.find({
      'projects.projectId': this._id
    });

    for (const invoice of invoices) {
      await invoice.deleteOne(); // ✅ זה יפעיל את ה-middleware!
    }

    // ✅ מחק חשבוניות משכורות שממומנות מהפרויקט
    const salaryInvoices = await Invoice.find({
      type: 'salary',
      fundedFromProjectId: this._id
    });

    for (const invoice of salaryInvoices) {
      await invoice.deleteOne();
    }

    // ✅ מחק הזמנות אחת אחת כדי להפעיל middleware
    const orders = await Order.find({ projectId: this._id });

    for (const order of orders) {
      await order.deleteOne(); // ✅ זה יפעיל את ה-middleware!
    }

    // ✅ מחק משכורות מהמודל הישן
    const salaries = await Salary.find({ projectId: this._id });

    for (const salary of salaries) {
      await salary.deleteOne();
    }

    next();
  } catch (err) {
    console.error('❌ שגיאה במחיקת פרויקט:', err);
    next(err);
  }
});


export default mongoose.model("Project", projectSchema);