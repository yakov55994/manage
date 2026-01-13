import mongoose from 'mongoose';
import Income from '../models/Income.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixMissingCreatedAt() {
  try {
    console.log('🔌 מתחבר למסד נתונים...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ התחברות הצליחה!');

    // תיקון הכנסות
    console.log('\n📋 בודק הכנסות...');
    const incomesWithoutCreatedAt = await Income.find({
      $or: [
        { createdAt: null },
        { createdAt: { $exists: false } }
      ]
    });

    console.log(`נמצאו ${incomesWithoutCreatedAt.length} הכנסות ללא createdAt`);

    for (const income of incomesWithoutCreatedAt) {
      // אם אין createdAt, השתמש ב-date
      income.createdAt = income.date || new Date();
      await income.save();
      console.log(`✅ עודכן income ${income._id}`);
    }

    // תיקון הזמנות
    console.log('\n📦 בודק הזמנות...');
    const ordersWithoutCreatedAt = await Order.find({
      $or: [
        { createdAt: null },
        { createdAt: { $exists: false } }
      ]
    });

    console.log(`נמצאו ${ordersWithoutCreatedAt.length} הזמנות ללא createdAt`);

    for (const order of ordersWithoutCreatedAt) {
      // אם אין createdAt, השתמש בתאריך נוכחי
      order.createdAt = new Date();
      await order.save();
      console.log(`✅ עודכן order ${order._id}`);
    }

    // תיקון חשבוניות
    console.log('\n💼 בודק חשבוניות...');
    const invoicesWithoutCreatedAt = await Invoice.find({
      $or: [
        { createdAt: null },
        { createdAt: { $exists: false } }
      ]
    });

    console.log(`נמצאו ${invoicesWithoutCreatedAt.length} חשבוניות ללא createdAt`);

    for (const invoice of invoicesWithoutCreatedAt) {
      // אם אין createdAt, השתמש בתאריך נוכחי
      invoice.createdAt = new Date();
      await invoice.save();
      console.log(`✅ עודכן invoice ${invoice._id}`);
    }

    console.log('\n🎉 הסקריפט הסתיים בהצלחה!');
    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

fixMissingCreatedAt();
