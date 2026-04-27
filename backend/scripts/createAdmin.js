import mongoose from 'mongoose';
import User from '../models/User.js'; // תעדכן לפי הנתיב שלך
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect("mongodb+srv://yakov1020:Yakov7470893@cluster-new.owlab0x.mongodb.net/?appName=Cluster-new");
    console.log('✅ Connected to MongoDB');

    const adminData = {
      username: 'admin',
      email: 'yakov1002444@gmail.com',
      password: '123456', // תחליף לסיסמה חזקה!
      role: 'admin',
    };

    // בדיקה אם כבר קיים
    const existingUser = await User.findOne({
      $or: [
        { username: adminData.username },
        { email: adminData.email }
      ]
    });

    if (existingUser) {
      console.log('⚠️ Admin user already exists');
      process.exit();
    }

    const admin = new User(adminData);
    await admin.save();

    console.log('🎉 Admin user created successfully!');
    console.log({
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

    process.exit();
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();