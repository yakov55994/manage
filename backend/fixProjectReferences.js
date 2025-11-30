import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';
import Invoice from './models/Invoice.js';
import Order from './models/Order.js';

dotenv.config();

async function fixProjectReferences() {
  try {
    await mongoose.connect('mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App');
    console.log('✅ מחובר ל-MongoDB');

    // 1️⃣ שלב ראשון: נקה את כל המערכים (למניעת כפילויות)
    console.log('🧹 מנקה מערכי invoices ו-orders בכל הפרויקטים...');
    await Project.updateMany({}, { $set: { invoices: [], orders: [] } });

    // 2️⃣ שלב שני: מצא את כל החשבוניות והזמנות
    console.log('🔍 מחפש חשבוניות והזמנות...');
    const allInvoices = await Invoice.find({}).select('_id projectId');
    const allOrders = await Order.find({}).select('_id projectId');

    console.log(`📋 נמצאו ${allInvoices.length} חשבוניות`);
    console.log(`📦 נמצאו ${allOrders.length} הזמנות`);

    // 3️⃣ שלב שלישי: קבץ לפי פרויקט
    const projectInvoices = {};
    const projectOrders = {};

    allInvoices.forEach(invoice => {
      if (invoice.projectId) {
        const pid = String(invoice.projectId);
        if (!projectInvoices[pid]) projectInvoices[pid] = [];
        projectInvoices[pid].push(invoice._id);
      }
    });

    allOrders.forEach(order => {
      if (order.projectId) {
        const pid = String(order.projectId);
        if (!projectOrders[pid]) projectOrders[pid] = [];
        projectOrders[pid].push(order._id);
      }
    });

    // 4️⃣ שלב רביעי: עדכן כל פרויקט
    console.log('🔄 מעדכן פרויקטים...');
    let updatedCount = 0;

    for (const projectId in projectInvoices) {
      await Project.findByIdAndUpdate(
        projectId,
        { $set: { invoices: projectInvoices[projectId] } }
      );
      console.log(`✅ פרויקט ${projectId}: ${projectInvoices[projectId].length} חשבוניות`);
      updatedCount++;
    }

    for (const projectId in projectOrders) {
      await Project.findByIdAndUpdate(
        projectId,
        { $addToSet: { orders: { $each: projectOrders[projectId] } } }
      );
      console.log(`✅ פרויקט ${projectId}: ${projectOrders[projectId].length} הזמנות`);
      updatedCount++;
    }

    console.log(`\n🎉 הושלם! ${updatedCount} פרויקטים עודכנו`);
    console.log('✅ כל החשבוניות וההזמנות מקושרות לפרויקטים!');

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

fixProjectReferences();