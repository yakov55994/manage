import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, required: true },     // ייחודי בפרויקט
  projectName: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },

  sum: { type: Number, required: true },

  createdAt: { type: Date, required: true },

  status: {
    type: String,
    enum: ["הוגש", "לא הוגש", "בעיבוד"],
    required: true
  },

  invitingName: { type: String, required: true }, // מי ביצע את ההזמנה
  detail: { type: String, required: true },

  remainingBudget: { type: Number },

  Contact_person: { type: String, required: true },

  files: [
    {
      name: String,
      url: String,
      type: String,
      size: Number,
      folder: String,
      publicId: String,
      resourceType: String
    }
  ]
});

// 💡 אין צורך ב-pre-save כפילות כי אנחנו עושים זאת ב-service — הרבה יותר נכון!

const Order = mongoose.model("Order", orderSchema);
export default Order;
