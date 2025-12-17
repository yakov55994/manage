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