import User from "../models/User.js";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./emailService.js";

export const authenticateUser = async (username, password) => {
  const user = await User.findOne({ username });

  if (!user) return { success: false, message: "שם משתמש או סיסמה שגויים" };

  const match = await user.comparePassword(password);
  if (!match) return { success: false, message: "שם משתמש או סיסמה שגויים" };

  return { success: true, user };
};

export const getAllUsers = () => {
  return User.find()
    .select("-password -resetPasswordToken -resetPasswordExpires");
};

export const createNewUser = async (userData) => {
  console.log("🔧 SERVICE: createNewUser started");
  console.log("📦 User data:", userData);

  try {
    // בדיקה שיש username
    if (!userData.username) {
      throw new Error("שם משתמש חסר");
    }

    // יצירת המשתמש
    const newUser = new User({
      username: userData.username,
      email: userData.email,
      role: userData.role || "user",
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      permissions: userData.permissions || [],
    });

    console.log("💾 Saving user to database...");
    await newUser.save();
    console.log("✅ User saved successfully:", newUser._id);

    // ניסיון לשלוח מייל - לא קריטי
    if (newUser.email) {
      console.log("📧 Attempting to send welcome email...");
      try {
        await sendWelcomeEmail(newUser);
        console.log("✅ Welcome email sent");
      } catch (emailError) {
        console.warn("⚠️ Email failed (non-critical):", emailError.message);
        // לא זורקים שגיאה - המשתמש נוצר בהצלחה
      }
    } else {
      console.log("ℹ️ No email provided, skipping welcome email");
    }

    console.log("🎉 createNewUser completed successfully");
    return newUser;

  } catch (error) {
    console.error("❌ SERVICE ERROR in createNewUser:", error);
    throw error;
  }
};

export const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) return null;

  // עדכון שדות רגילים
  if (data.username) user.username = data.username;
  if (data.email) user.email = data.email;
  if (data.role) user.role = data.role;
  if (data.isActive !== undefined) user.isActive = data.isActive;
  if (data.permissions) user.permissions = data.permissions;

  // סיסמה — רק אם באמת קיבלנו חדשה
  if (data.password && data.password.trim() !== "") {
    user.password = data.password.trim();
  } else {
  }


  await user.save();

  return user.toObject({ getters: true, virtuals: false });
};

export const deleteUser = async (id) => {
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return { success: false, message: "משתמש לא נמצא" };
  return { success: true, message: "משתמש נמחק" };
};

// ✅ יצירת טוקן איפוס סיסמה
export const generatePasswordResetToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("משתמש לא נמצא");

  // יצירת טוקן רנדומלי
  const resetToken = crypto.randomBytes(32).toString("hex");

  // הצפנת הטוקן לפני שמירה במסד הנתונים
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // שמירת הטוקן המוצפן ותוקף של 24 שעות
  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  // החזרת הטוקן הלא מוצפן (זה מה ששולחים למשתמש)
  return resetToken;
};

// ✅ שליחת מייל איפוס סיסמה
export const sendResetPasswordEmail = async (userId) => {
  try {
    console.log('🔍 sendResetPasswordEmail service - userId:', userId);

    // שליפת המשתמש מה-DB (חשוב! צריך Mongoose document עם save())
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ User not found:', userId);
      throw new Error('משתמש לא נמצא');
    }
    
    console.log('✅ User found:', user.username);
    
    if (!user.email) {
      console.error('❌ User has no email:', user.username);
      throw new Error('למשתמש אין כתובת אימייל');
    }

    console.log('📧 User email:', user.email);
    console.log('🔧 Calling sendPasswordResetEmail from emailService...');
    
    // שליחת המייל - הפונקציה תטפל ביצירת הטוקן
    await sendPasswordResetEmail(user);
    
    console.log('✅ Reset email sent successfully to:', user.email);
    return { success: true, message: 'מייל נשלח בהצלחה' };
    
  } catch (error) {
    console.error('❌ Error in sendResetPasswordEmail service:', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};
export const forgotPasswordByUsername = async (username) => {
  try {
    console.log('🔍 forgotPasswordByUsername - username:', username);

    const user = await User.findOne({ username });

    if (!user) {
      console.log('⚠️ User not found for username:', username);
      // לא זורקים שגיאה - אבטחה
      return { success: false, message: 'משתמש לא נמצא' };
    }

    if (!user.email) {
      console.log('⚠️ User has no email:', username);
      // לא זורקים שגיאה - אבטחה
      return { success: false, message: 'למשתמש אין אימייל' };
    }

    console.log('📧 Sending reset email to:', user.email);

    // שליחת המייל
    await sendPasswordResetEmail(user);

    console.log('✅ Reset email sent for username:', username);
    return { success: true, message: 'מייל נשלח בהצלחה' };

  } catch (error) {
    console.error('❌ Error in forgotPasswordByUsername:', error);
    // לא זורקים שגיאה - אבטחה
    return { success: false, message: 'שגיאה בשליחת מייל' };
  }
};

// ✅ איפוס סיסמה עם טוקן
export const resetPassword = async (token, newPassword) => {
  try {
    console.log('🔐 resetPassword service - token exists:', !!token);

    // הצפנת הטוקן שהתקבל
    const crypto = await import('crypto');
    const hashedToken = crypto.default.createHash('sha256').update(token).digest('hex');

    console.log('🔍 Looking for user with hashed token...');

    // חיפוש משתמש עם טוקן תקף
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log('❌ No user found with valid token');
      throw new Error('הקישור לא תקף או פג תוקפו');
    }

    console.log('✅ User found:', user.username);

    // עדכון הסיסמה
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    console.log('✅ Password reset successfully for user:', user.username);

    return { success: true, message: 'הסיסמה אופסה בהצלחה' };

  } catch (error) {
    console.error('❌ Error in resetPassword service:', error);
    throw error;
  }
};
// ✅ אימות טוקן איפוס סיסמה
export const verifyResetToken = async (token) => {
  // הצפנת הטוקן שהתקבל
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // חיפוש משתמש עם טוקן תקף
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return { valid: false, message: "הקישור לא תקף או פג תוקפו" };
  }

  return {
    valid: true,
    username: user.username,
    userId: user._id
  };
};

// ✅ איפוס סיסמה
