import mongoose from "mongoose";

// Schema פשוט לפרטי בנק
const bankDetailsSchema = new mongoose.Schema({
    bankName: { type: String, required: true },        // שם הבנק
    branchNumber: { type: String, required: true },    // מספר סניף
    accountNumber: { type: String, required: true }    // מספר חשבון
});

// יצוא רק של ה-Schema, לא של המודל
export default bankDetailsSchema;