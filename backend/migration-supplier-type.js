// migration-supplier-type-mongo.js
import mongoose from 'mongoose';

const migrateSupplierTypes = async () => {
  try {
    // התחברות ל־DB
    await mongoose.connect(
      'mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App'
    );

    console.log('🚀 מתחיל מיגרציה: שינוי כל הספקים ל-type "invoice"...');

    // עדכון ALL ללא תנאי
    const result = await mongoose.connection.db
      .collection('suppliers')
      .updateMany({}, { $set: { supplierType: 'invoices' } });

    console.log('✅ מיגרציה הושלמה!');
    console.log(`📈 עודכנו ${result.modifiedCount} ספקים`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ שגיאה במיגרציה:', error);
    process.exit(1);
  }
};

migrateSupplierTypes();
