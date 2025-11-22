// יצירת קובץ זמני: createAdmin.js
import mongoose from 'mongoose';
import User from './models/User.js';

mongoose.connect('mongodb+srv://yakov1:Yakov7470893@cluster0.5spt3.mongodb.net/?appName=Cluster0');

async function createAdmin() {
  try {
    const admin = new User({
      username: 'מנהל',
      password: '123', // תשתנה אחרי ההתחברות הראשונה!
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