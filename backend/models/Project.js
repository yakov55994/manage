import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },

  budget: { type: Number, required: true },
  remainingBudget: { type: Number }, // ✅ הסר את default: 0

  invitingName: { type: String, required: true },
  Contact_person: { type: String, required: true },

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
  }
});

// Cascade delete invoices + orders when project is deleted
projectSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    const { default: Invoice } = await import("./Invoice.js");
    const { default: Order } = await import("./Order.js");

    console.log(`🗑️ מוחק פרויקט ${this.name} - מוחק חשבוניות והזמנות...`);

    // ✅ מחק חשבוניות אחת אחת כדי להפעיל middleware
    const invoices = await Invoice.find({ projectId: this._id });
    console.log(`📋 נמצאו ${invoices.length} חשבוניות למחיקה`);

    for (const invoice of invoices) {
      await invoice.deleteOne(); // ✅ זה יפעיל את ה-middleware!
    }

    // ✅ מחק הזמנות אחת אחת כדי להפעיל middleware
    const orders = await Order.find({ projectId: this._id });
    console.log(`📦 נמצאו ${orders.length} הזמנות למחיקה`);

    for (const order of orders) {
      await order.deleteOne(); // ✅ זה יפעיל את ה-middleware!
    }

    console.log(`✅ הפרויקט ${this.name} והקבצים שלו נמחקו בהצלחה`);
    next();
  } catch (err) {
    console.error('❌ שגיאה במחיקת פרויקט:', err);
    next(err);
  }
});


export default mongoose.model("Project", projectSchema);