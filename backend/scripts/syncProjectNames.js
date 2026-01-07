import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Income from "../models/Income.js";

dotenv.config();

/**
 * סקריפט לסנכרון שמות פרויקטים בכל המסמכים
 * מעדכן את projectName בחשבוניות, הזמנות והכנסות לפי שם הפרויקט הנוכחי
 */
async function syncProjectNames() {
  try {
    console.log("🔄 מתחבר למסד הנתונים...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ התחברות למסד הנתונים הושלמה");

    // קבלת כל הפרויקטים
    const projects = await Project.find({});
    console.log(`\n📊 נמצאו ${projects.length} פרויקטים\n`);

    let totalUpdated = 0;

    for (const project of projects) {
      console.log(`\n🔧 מעדכן פרויקט: ${project.name} (${project._id})`);

      // עדכון חשבוניות (מבנה מיוחד עם projects array)
      const invoicesResult = await Invoice.updateMany(
        { 'projects.projectId': project._id },
        { $set: { 'projects.$[elem].projectName': project.name } },
        { arrayFilters: [{ 'elem.projectId': project._id }] }
      );
      console.log(`   📄 חשבוניות: ${invoicesResult.modifiedCount || 0} עודכנו`);

      // עדכון הזמנות
      const ordersResult = await Order.updateMany(
        { projectId: project._id },
        { $set: { projectName: project.name } }
      );
      console.log(`   🛒 הזמנות: ${ordersResult.modifiedCount || 0} עודכנו`);

      // עדכון הכנסות
      const incomesResult = await Income.updateMany(
        { projectId: project._id },
        { $set: { projectName: project.name } }
      );
      console.log(`   💰 הכנסות: ${incomesResult.modifiedCount || 0} עודכנו`);

      totalUpdated +=
        (invoicesResult.modifiedCount || 0) +
        (ordersResult.modifiedCount || 0) +
        (incomesResult.modifiedCount || 0);
    }

    console.log(`\n✅ הסנכרון הושלם בהצלחה!`);
    console.log(`📊 סה"כ ${totalUpdated} מסמכים עודכנו\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ שגיאה בסנכרון:", error);
    process.exit(1);
  }
}

syncProjectNames();
