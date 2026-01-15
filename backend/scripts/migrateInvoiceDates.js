/**
 * סקריפט מיגרציה: העתקת createdAt ל-invoiceDate
 *
 * הסבר:
 * בעבר, השדה 'createdAt' שימש גם כתאריך החשבונית וגם כתאריך יצירת הרשומה.
 * עכשיו הפרדנו בין:
 * - createdAt: תאריך יצירת הרשומה במערכת (אוטומטי, לא ניתן לשינוי)
 * - invoiceDate: תאריך החשבונית המקורי (ממלא המשתמש)
 *
 * סקריפט זה מעתיק את הערך הישן של createdAt (שהיה תאריך החשבונית)
 * לשדה החדש invoiceDate.
 */

import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateInvoiceDates() {
  try {
    // התחברות למסד הנתונים
    await mongoose.connect("mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App");
    console.log('✅ התחברות למסד נתונים הצליחה');

    // מצא את כל החשבוניות שאין להן invoiceDate
    const invoices = await Invoice.find({
      $or: [
        { invoiceDate: { $exists: false } },
        { invoiceDate: null }
      ]
    });

    console.log(`📊 נמצאו ${invoices.length} חשבוניות לעדכון`);

    let updated = 0;
    let skipped = 0;

    for (const invoice of invoices) {
      // אם יש createdAt, העתק אותו ל-invoiceDate
      if (invoice.createdAt) {
        invoice.invoiceDate = invoice.createdAt;
        await invoice.save();
        updated++;

        if (updated % 100 === 0) {
          console.log(`⏳ עודכנו ${updated} חשבוניות...`);
        }
      } else {
        skipped++;
        console.log(`⚠️ חשבונית ${invoice._id} אין לה createdAt`);
      }
    }

    console.log('\n✅ מיגרציה הושלמה בהצלחה!');
    console.log(`📈 עודכנו: ${updated} חשבוניות`);
    console.log(`⏭️  דולגו: ${skipped} חשבוניות`);

  } catch (error) {
    console.error('❌ שגיאה במיגרציה:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 חיבור למסד נתונים נסגר');
  }
}

// הרצת הסקריפט
migrateInvoiceDates();
