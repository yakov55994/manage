// migration-supplier-type-mongo.js
import mongoose from 'mongoose';

const migrateSupplierTypes = async () => {
  try {
    // התחבר ל-DB
    await mongoose.connect('mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App');
    
    console.log('🚀 מתחיל מיגרציה של supplierType...');
    
    // עדכן את כל הספקים שאין להם supplierType
    const result = await mongoose.connection.db.collection('suppliers').updateMany(
      { 
        $or: [
          { supplierType: { $exists: false } },
          { supplierType: null },
          { supplierType: '' }
        ]
      },
      { 
        $set: { supplierType: 'both' } 
      }
    );

    console.log(`✅ מיגרציה הושלמה!`);
    console.log(`📈 עודכנו ${result.modifiedCount} ספקים`);
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ שגיאה במיגרציה:', error);
    process.exit(1);
  }
};

migrateSupplierTypes();