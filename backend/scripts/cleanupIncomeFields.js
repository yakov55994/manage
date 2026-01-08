import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// חיבור למסד נתונים
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Cleanup Script - הסרת השדות invoiceId ו-invoiceNumber מכל המסמכים
const cleanupIncomeFields = async () => {
  try {
    console.log('🧹 Starting cleanup: Removing old invoice fields from Income collection');

    const db = mongoose.connection.db;
    const incomeCollection = db.collection('incomes');

    // 1. בדיקה - ספירת מסמכים עם השדות הישנים
    const docsWithOldFields = await incomeCollection.countDocuments({
      $or: [
        { invoiceId: { $exists: true } },
        { invoiceNumber: { $exists: true } }
      ]
    });

    console.log(`📊 Found ${docsWithOldFields} documents with old invoice fields`);

    if (docsWithOldFields === 0) {
      console.log('✅ No documents to clean up. All done!');
      return;
    }

    // 2. הסרת השדות הישנים מכל המסמכים
    const result = await incomeCollection.updateMany(
      {},
      {
        $unset: {
          invoiceId: "",
          invoiceNumber: ""
        }
      }
    );

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`  ✅ Matched: ${result.matchedCount} documents`);
    console.log(`  🔧 Modified: ${result.modifiedCount} documents`);

    // 3. אימות - בדיקה שהשדות הוסרו
    const remainingDocs = await incomeCollection.countDocuments({
      $or: [
        { invoiceId: { $exists: true } },
        { invoiceNumber: { $exists: true } }
      ]
    });

    if (remainingDocs === 0) {
      console.log('\n✅ Cleanup completed successfully! All invoice fields removed.');
    } else {
      console.log(`\n⚠️  Warning: ${remainingDocs} documents still have invoice fields. Please review.`);
    }

    // 4. הצגת דוגמה של מסמך לאחר העדכון
    const sampleDoc = await incomeCollection.findOne({});
    if (sampleDoc) {
      console.log('\n📄 Sample document after cleanup:');
      console.log(JSON.stringify(sampleDoc, null, 2));
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
};

// הרץ את ה-cleanup
const runCleanup = async () => {
  try {
    await connectDB();
    await cleanupIncomeFields();
    console.log('\n✅ Cleanup script completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup script failed:', error);
    process.exit(1);
  }
};

runCleanup();
