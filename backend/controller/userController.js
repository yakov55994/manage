import * as userService from "../services/userservice.js";
import dotenv from 'dotenv';
import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // ← הוסף את זה!

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = '24h';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'נא למלא שם משתמש וסיסמה'
      });
    }

    const user = await User.findOne({ username })
      .populate('permissions.project', 'name');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'המשתמש חסום'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    const token = generateToken(user._id);

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

export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const newUser = await userService.createNewUser(req.body);


    res.status(201).json({
      success: true,
      data: newUser,
      message: "משתמש נוצר בהצלחה"
    });

  } catch (error) {
    console.error("❌ CREATE USER ERROR:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=".repeat(50));

    res.status(500).json({
      success: false,
      message: error.message || "שגיאה ביצירת משתמש"
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);

    if (!updated)
      return res.status(404).json({ message: "משתמש לא נמצא" });

    res.json({ success: true, data: updated });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);

    if (!result.success)
      return res.status(400).json({ message: result.message });

    res.json({ success: true, message: result.message });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ שליחת קישור איפוס סיסמה
export const sendResetLink = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "חסר מזהה משתמש"
      });
    }

    await userService.sendResetPasswordEmail(userId);
    
    res.json({
      success: true,
      message: "קישור איפוס נשלח למייל"
    });

  } catch (err) {
    console.error("Error in sendResetLink:", err);
    res.status(500).json({
      success: false,
      message: err.message || "שגיאה בשליחת קישור איפוס"
    });
  }
};

// ✅ אימות טוקן איפוס סיסמה
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // הצפנת הטוקן שהתקבל כדי להשוות עם מה שבדאטהבייס
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');


    // חיפוש משתמש עם טוקן תקף (לא פג)
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        valid: false,
        message: 'הקישור לא תקף או פג תוקפו',
      });
    }


    res.status(200).json({
      valid: true,
      message: 'הטוקן תקף',
    });
  } catch (error) {
    console.error('❌ Error verifying token:', error);
    res.status(500).json({
      valid: false,
      message: 'שגיאה באימות הטוקן',
    });
  }
};

// ✅ איפוס סיסמה
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;


    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "חסרים פרטים נדרשים"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "הסיסמה חייבת להכיל לפחות 6 תווים"
      });
    }

    const result = await userService.resetPassword(token, newPassword);
    
    res.json({
      success: true,
      message: "הסיסמה אופסה בהצלחה"
    });

  } catch (err) {
    console.error("Error in resetPassword:", err);
    res.status(400).json({
      success: false,
      message: err.message || "שגיאה באיפוס הסיסמה"
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "נא למלא שם משתמש"
      });
    }

    await userService.forgotPasswordByUsername(username);

    // ✅ תמיד מחזירים הצלחה (אבטחה - לא לחשוף אם המשתמש קיים)
    res.json({
      success: true,
      message: "אם המשתמש קיים, מייל נשלח לכתובת המייל הרשומה"
    });

  } catch (err) {
    console.error("Error in forgotPassword:", err);
    // ✅ גם בשגיאה לא חושפים אם המשתמש קיים
    res.json({
      success: true,
      message: "אם המשתמש קיים, מייל נשלח לכתובת המייל הרשומה"
    });
  }
};