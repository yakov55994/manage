import mongoose from 'mongoose';
import User from './models/userSchema.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ מחובר ל-MongoDB');

    // בדוק אם יש כבר admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin כבר קיים במערכת');
      console.log(`שם משתמש: ${existingAdmin.username}`);
      process.exit(0);
    }

    // צור admin חדש
    const admin = await User.create({
      username: 'admin',
      password: '0527622142',
      role: 'admin',
      email: 'admin@nihulon.com',
      isActive: true,
      permissions: {
        projects: [],
        suppliers: []
      }
    });

    console.log('✅ Admin נוצר בהצלחה!');
    console.log('📋 פרטי התחברות:');
    console.log('   שם משתמש: admin');
    console.log('   סיסמה: admin123');
    console.log('⚠️  חשוב: שנה את הסיסמה לאחר ההתחברות הראשונה!');

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
};

createAdmin();