import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Income from '../models/Income.js';

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

// Migration Script - המרת invoiceId ל-orderId בטבלת Income
const migrateIncomeToOrders = async () => {
  try {
    console.log('🔄 Starting migration: Income invoiceId → orderId');

    // 1. מצא את כל ההכנסות שיש להן invoiceId
    const incomesWithInvoice = await Income.find({
      invoiceId: { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${incomesWithInvoice.length} incomes with invoiceId`);

    if (incomesWithInvoice.length === 0) {
      console.log('✅ No incomes to migrate. All done!');
      return;
    }

    // 2. עדכן כל הכנסה - העתק את invoiceId ל-orderId והסר את invoiceId
    let successCount = 0;
    let errorCount = 0;

    for (const income of incomesWithInvoice) {
      try {
        // עדכן את המסמך - העתק invoiceId ל-orderId
        await Income.updateOne(
          { _id: income._id },
          {
            $set: {
              orderId: income.invoiceId,
              orderNumber: income.invoiceNumber || null
            },
            $unset: {
              invoiceId: "",
              invoiceNumber: ""
            }
          }
        );

        successCount++;
        console.log(`✅ Migrated income ${income._id}: invoiceId → orderId`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating income ${income._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📝 Total: ${incomesWithInvoice.length}`);

    // 3. אימות - בדוק שאין יותר invoiceId
    const remainingInvoices = await Income.countDocuments({
      invoiceId: { $exists: true, $ne: null }
    });

    if (remainingInvoices === 0) {
      console.log('\n✅ Migration completed successfully! No more invoiceId fields found.');
    } else {
      console.log(`\n⚠️  Warning: ${remainingInvoices} incomes still have invoiceId. Please review.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// הרץ את ה-migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateIncomeToOrders();
    console.log('\n✅ Migration script completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  }
};

runMigration();
