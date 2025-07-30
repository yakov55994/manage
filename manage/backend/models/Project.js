import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    budget: { type: Number },
    remainingBudget: { type: Number },
    invitingName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    Contact_person: {type: String, require: true},
    invoices: [{
        invoiceNumber: String,
        projectName: String,
        projectId: mongoose.Schema.Types.ObjectId,
        sum: Number,
        status: String,
        invitingName: String,
        detail: String,
        paid: String,
        paymentDate: String,
        file: String
    }],
    orders: [{
        orderNumber: String,
        invitingName: String,
        sum: Number,
        projectName: String,
        status: String,
        detail: String,
        paid: String,
        paymentDate: Date,
        createdAt: Date,
        file: String
    }],
      supplierId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Supplier',
        required: false // אופציונלי במידה ויש פרויקטים ישנים
    },

});

// אוטומציה להגדרת remainingBudget
projectSchema.pre("save", function (next) {
    if (this.isNew) {
        // אם אין ערך ב-remainingBudget, נעמיס את ערך ה-budget עליו
        if (this.budget && !isNaN(this.budget)) {
            this.remainingBudget = this.budget;
        } else {
            this.remainingBudget = 0;  // אם לא הוזן תקציב תקין, נשמור 0
        }
    }
    next();
});

projectSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
    try {
        await Invoice.deleteMany({ projectId: this._id });
        await Order.deleteMany({ projectId: this._id });
        next();
    } catch (err) {
        next(err);
    }
});



const Project = mongoose.model("Project", projectSchema);
export default Project;
