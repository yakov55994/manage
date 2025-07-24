import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderNumber: { type: Number, required: true },
    projectName: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true }, // שיוך לפרויקט
    sum: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['הוגש', 'לא הוגש', 'בעיבוד'], required: true },
    invitingName: { type: String, required: true },
    detail: { type: String, required: true },
    remainingBudget: { type: Number },
    Contact_person: {type: String, require: true},
    files: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
        folder: { type: String, required: false },
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
      }]});

// בדיקה אם שם המזמין כבר קיים
orderSchema.pre('save', async function (next) {
    const order = this;
    const existingOrder = await mongoose.models.Order.findOne({ invitingName: order.invitingName });
    if (existingOrder) {
        const error = new Error('שם המזמין חייב להיות ייחודי.');
        return next(error);
    }
    next();
});

// עדכון תקציב הפרויקט כאשר הזמנה נשמרת
orderSchema.post("save", async function (doc, next) {
    try {
        const Project = mongoose.model("Project");
        if (doc.sum && !isNaN(doc.sum)) {
            await Project.findByIdAndUpdate(doc.projectId, {
                $inc: { budget: doc.sum },
                $set: { remainingBudget: doc.sum } 
            });
        } else {
            console.error("Invalid sum value:", doc.sum);
        }
        next();
    } catch (error) {
        console.error("Error updating project budget:", error);
        next(error);
    }
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
