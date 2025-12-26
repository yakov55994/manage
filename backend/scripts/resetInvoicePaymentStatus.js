import mongoose from 'mongoose';

async function resetPaymentStatus() {
  try {
    await mongoose.connect('mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App');

    const db = mongoose.connection.db;
    const result = await db.collection('invoices').updateMany(
      {},
      { $set: { paid: 'לא' } }
    );

    console.log(`✅ עודכנו ${result.modifiedCount} חשבוניות ל"לא שולם"`);
    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

resetPaymentStatus();
