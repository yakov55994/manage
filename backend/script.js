// יצירת קובץ זמני: createAdmin.js
import mongoose from 'mongoose';
import User from './models/User.js';

mongoose.connect('mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App');

async function createAdmin() {
  try {
    const admin = new User({
      username: 'admin',
      password: '123456', // תשתנה אחרי ההתחברות הראשונה!
      email: 'admin@example.com',
      role: 'admin',
      isActive: true
    });
    
    await admin.save();
    console.log('Admin created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();