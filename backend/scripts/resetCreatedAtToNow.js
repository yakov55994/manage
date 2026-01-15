/**
 * סקריפט: איפוס createdAt של כל החשבוניות וההכנסות להיום
 *
 * הסבר:
 * מכיוון שאין דרך לדעת מתי באמת הוזנו הרשומות הישנות,
 * הסקריפט מעדכן את createdAt של כולן להיום.
 * מעכשיו והלאה, רשומות חדשות יקבלו createdAt אוטומטי.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function resetCreatedAtToNow() {
  try {
    // התחברות למסד הנתונים
    await mongoose.connect("mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App");
    console.log('✅ התחברות למסד נתונים הצליחה');

    const now = new Date();
    console.log(`📅 תאריך עדכון: ${now.toLocaleDateString('he-IL')}`);

    // עדכון כל החשבוניות
    const invoicesResult = await mongoose.connection.collection('invoices').updateMany(
      {}, // כל החשבוניות
      { $set: { createdAt: now } }
    );
    console.log(`\n📄 חשבוניות: עודכנו ${invoicesResult.modifiedCount} רשומות`);

    // עדכון כל ההכנסות
    const incomesResult = await mongoose.connection.collection('incomes').updateMany(
      {}, // כל ההכנסות
      { $set: { createdAt: now } }
    );
    console.log(`💰 הכנסות: עודכנו ${incomesResult.modifiedCount} רשומות`);

    console.log('\n✅ עדכון הושלם בהצלחה!');

  } catch (error) {
    console.error('❌ שגיאה:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 חיבור למסד נתונים נסגר');
  }
}

// הרצת הסקריפט
resetCreatedAtToNow();
