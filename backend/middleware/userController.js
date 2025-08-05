// controllers/userController.js
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// קבלת כל המשתמשים
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'שגיאה בקבלת המשתמשים' });
  }
};

// קבלת משתמש ספציפי
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    res.status(500).json({ message: 'שגיאה בקבלת המשתמש' });
  }
};

// יצירת משתמש חדש
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, permissions } = req.body;

    // בדיקת שדות חובה
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'שם, אימייל, סיסמה ותפקיד הם שדות חובה' 
      });
    }

    // בדיקת תקינות אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'כתובת אימייל לא תקינה' 
      });
    }

    // בדיקת אורך סיסמה
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'סיסמה חייבת להכיל לפחות 6 תווים' 
      });
    }

    // בדיקה שהמייל לא קיים כבר
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'משתמש עם המייל הזה כבר קיים במערכת' 
      });
    }

    // הצפנת הסיסמה
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // הגדרת הרשאות ברירת מחדל לפי תפקיד
    const defaultPermissions = getDefaultPermissionsByRole(role);
    const finalPermissions = permissions || defaultPermissions;

    // יצירת המשתמש החדש
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      phone: phone?.trim() || '',
      permissions: finalPermissions,
      status: 'פעיל',
      createdAt: new Date(),
      createdBy: req.user.id,
      lastLogin: null
    });

    await newUser.save();

    // רישום פעילות
    await logActivity({
      userId: req.user.id,
      action: 'יצר משתמש חדש',
      target: newUser.name,
      targetId: newUser._id,
      details: { role: newUser.role }
    });

    // החזרת המשתמש ללא סיסמה
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'שגיאה ביצירת המשתמש' });
  }
};

// עדכון משתמש
export const updateUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, permissions } = req.body;
    const userId = req.params.id;

    // חיפוש המשתמש
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // בדיקת שדות חובה
    if (!name || !email || !role) {
      return res.status(400).json({ 
        message: 'שם, אימייל ותפקיד הם שדות חובה' 
      });
    }

    // בדיקת תקינות אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'כתובת אימייל לא תקינה' 
      });
    }

    // בדיקה שהמייל לא קיים אצל משתמש אחר
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: userId }
    });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'משתמש אחר עם המייל הזה כבר קיים במערכת' 
      });
    }

    // עדכון הנתונים
    user.name = name.trim();
    user.email = email.toLowerCase().trim();
    user.role = role;
    user.phone = phone?.trim() || '';
    user.permissions = permissions || user.permissions;
    user.updatedAt = new Date();
    user.updatedBy = req.user.id;

    // עדכון סיסמה אם סופקה
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ 
          message: 'סיסמה חייבת להכיל לפחות 6 תווים' 
        });
      }
      
      const saltRounds = 12;
      user.password = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    // רישום פעילות
    await logActivity({
      userId: req.user.id,
      action: 'עדכן משתמש',
      target: user.name,
      targetId: user._id,
      details: { 
        role: user.role,
        passwordChanged: !!password 
      }
    });

    // החזרת המשתמש ללא סיסמה
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    res.status(500).json({ message: 'שגיאה בעדכון המשתמש' });
  }
};

// מחיקת משתמש
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // בדיקה שלא מוחקים את עצמו
    if (userId === req.user.id.toString()) {
      return res.status(400).json({ 
        message: 'לא ניתן למחוק את המשתמש שלך' 
      });
    }

    // חיפוש המשתמש
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // שמירת שם המשתמש לפני המחיקה
    const userName = user.name;
    const userRole = user.role;

    // מחיקת המשתמש
    await User.findByIdAndDelete(userId);

    // רישום פעילות
    await logActivity({
      userId: req.user.id,
      action: 'מחק משתמש',
      target: userName,
      targetId: userId,
      details: { role: userRole }
    });

    res.json({ 
      message: 'המשתמש נמחק בהצלחה',
      deletedUser: { id: userId, name: userName }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    res.status(500).json({ message: 'שגיאה במחיקת המשתמש' });
  }
};

// עדכון סטטוס משתמש
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    // בדיקת תקינות הסטטוס
    const validStatuses = ['פעיל', 'לא פעיל', 'מושהה'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'סטטוס לא תקין. סטטוסים תקינים: ' + validStatuses.join(', ')
      });
    }

    // בדיקה שלא משנים את הסטטוס של עצמו
    if (userId === req.user.id.toString()) {
      return res.status(400).json({ 
        message: 'לא ניתן לשנות את הסטטוס של המשתמש שלך' 
      });
    }

    // חיפוש המשתמש ועדכון הסטטוס
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    const oldStatus = user.status;
    user.status = status;
    user.updatedAt = new Date();
    user.updatedBy = req.user.id;

    await user.save();

    // רישום פעילות
    await logActivity({
      userId: req.user.id,
      action: 'שינה סטטוס משתמש',
      target: user.name,
      targetId: user._id,
      details: { 
        oldStatus,
        newStatus: status 
      }
    });

    // החזרת המשתמש ללא סיסמה
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user status:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    res.status(500).json({ message: 'שגיאה בעדכון סטטוס המשתמש' });
  }
};

// פונקציות עזר
const getDefaultPermissionsByRole = (role) => {
  const permissions = {
    projects: false,
    invoices: false,
    suppliers: false,
    orders: false,
    reports: false
  };

  switch (role) {
    case 'מנהל':
      return {
        projects: true,
        invoices: true,
        suppliers: true,
        orders: true,
        reports: true
      };
    case 'רכש':
      return {
        ...permissions,
        suppliers: true,
        orders: true,
        invoices: true
      };
    case 'פרויקטים':
      return {
        ...permissions,
        projects: true,
        orders: true
      };
    case 'חשבות':
      return {
        ...permissions,
        invoices: true,
        reports: true
      };
    default:
      return permissions;
  }
};

// רישום פעילות (צריך להתאים למודל שלך)
const logActivity = async (activityData) => {
  try {
    // כאן תוכל להוסיף רישום לטבלת פעילויות
    // await Activity.create(activityData);
    console.log('Activity logged:', activityData);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};