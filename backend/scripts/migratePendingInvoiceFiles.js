/**
 * סקריפט מיגרציה: מעבר משדה `file` (יחיד) לשדה `files` (מערך) בחשבוניות ממתינות
 *
 * הסבר:
 * קומיט c11f251 הוסיף תמיכה בריבוי קבצים בחשבוניות ממתינות ושינה את שם השדה
 * מ-`file` ל-`files` מבלי להעביר את הנתונים הקיימים. מסמכים ישנים שנשארו עם
 * `file` בלבד הפכו בלתי קריאים דרך הסכימה החדשה (files חוזר ריק כברירת מחדל),
 * מה שגרם לאובדן ההפניה לקובץ המצורף באישור חשבונית (ראה approveInvoice).
 *
 * סקריפט זה מעתיק כל `file` קיים למערך `files` ומוחק את השדה הישן.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PendingInvoice from '../models/PendingInvoice.js';

dotenv.config();

async function migratePendingInvoiceFiles() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ התחברות למסד נתונים הצליחה');

    const docs = await PendingInvoice.find({
      file: { $ne: null },
    });

    console.log(`📊 נמצאו ${docs.length} חשבוניות ממתינות עם שדה 'file' ישן`);

    let migrated = 0;
    let merged = 0;

    for (const doc of docs) {
      if (!doc.files || doc.files.length === 0) {
        doc.files = [doc.file];
      } else {
        // כבר יש files - נוסיף את הקובץ הישן בתחילת המערך אם הוא לא כבר שם
        const alreadyPresent = doc.files.some((f) => f.publicId === doc.file.publicId);
        if (!alreadyPresent) {
          doc.files = [doc.file, ...doc.files];
          merged++;
        }
      }
      doc.file = undefined;
      await doc.save();
      migrated++;
      console.log(`✔️  ${doc._id} — ${doc.supplierName} / ${doc.invoiceNumber}`);
    }

    console.log('\n✅ מיגרציה הושלמה בהצלחה!');
    console.log(`📈 הועברו: ${migrated} חשבוניות`);
    console.log(`🔗 מוזגו לתוך files קיים: ${merged}`);
  } catch (error) {
    console.error('❌ שגיאה במיגרציה:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 חיבור למסד נתונים נסגר');
  }
}

migratePendingInvoiceFiles();
