import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },

  budget: { type: Number },
  remainingBudget: { type: Number },

  invitingName: { type: String, required: true },
  Contact_person: { type: String, required: true },

  // 🟩 חשוב! קשרי ישויות
  invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

  createdAt: { type: Date, default: Date.now }
});

// Auto-init remainingBudget
projectSchema.pre("save", function (next) {
  if (this.isNew) {
    this.remainingBudget =
      this.budget && !isNaN(this.budget) ? this.budget : 0;
  }
  next();
});

// Cascade delete invoices + orders when project is deleted
projectSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      const { default: Invoice } = await import("./Invoice.js");
      const { default: Order } = await import("./Order.js");

      await Invoice.deleteMany({ projectId: this._id });
      await Order.deleteMany({ projectId: this._id });

      next();
    } catch (err) {
      next(err);
    }
  }
);

export default mongoose.model("Project", projectSchema);
