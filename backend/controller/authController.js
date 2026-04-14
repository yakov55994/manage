import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { saveLog, getIp } from '../utils/logger.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = '24h';

// יצירת טוקן
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// התחברות
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'נא למלא שם משתמש וסיסמה'
      });
    }

    // חפש משתמש
    const user = await User.findOne({ username })
      .populate('permissions.project', 'name')

    if (!user) {
      await saveLog({
        type: 'login_failed',
        message: `ניסיון כניסה כושל - משתמש לא קיים: ${username}`,
        username,
        ip: getIp(req),
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // בדוק אם המשתמש פעיל
    if (!user.isActive) {
      await saveLog({
        type: 'login_failed',
        message: `ניסיון כניסה למשתמש חסום: ${username}`,
        username,
        userId: user._id,
        ip: getIp(req),
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({
        success: false,
        message: 'המשתמש חסום'
      });
    }

    // בדוק סיסמה
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await saveLog({
        type: 'login_failed',
        message: `ניסיון כניסה עם סיסמה שגויה: ${username}`,
        username,
        userId: user._id,
        ip: getIp(req),
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // צור טוקן
    const token = generateToken(user._id);

    await saveLog({
      type: 'login_success',
      message: `כניסה מוצלחת: ${username}`,
      username,
      userId: user._id,
      ip: getIp(req),
      userAgent: req.headers['user-agent'],
      meta: { role: user.role }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בהתחברות'
    });
  }
};

// יצירת משתמש ראשון (Admin) - רק פעם אחת
export const createInitialAdmin = async (req, res) => {
  try {
    // בדוק אם כבר יש admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin כבר קיים במערכת'
      });
    }

    const admin = await User.create({
      username: 'admin',
      password: 'admin123', // ישתנה בהתחברות הראשונה
      role: 'admin',
      email: 'admin@example.com'
    });

    res.json({
      success: true,
      message: 'Admin נוצר בהצלחה',
      credentials: {
        username: 'admin',
        password: 'admin123'
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת Admin'
    });
  }
};

// קבלת פרופיל המשתמש המחובר
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('permissions.project', 'name')

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת פרופיל'
    });
  }
};