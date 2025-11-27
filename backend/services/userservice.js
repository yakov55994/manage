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

export const createNewUser = async (data) => {
  // ✅ יצירת סיסמה זמנית רנדומלית (אף אחד לא יודע אותה!)
  const tempPassword = crypto.randomBytes(16).toString('hex');

  const user = await User.create({
    ...data,
    password: tempPassword, // סיסמה זמנית - אף אחד לא יודע אותה
  });

  // ✅ שליחת מייל ברוכים הבאים עם קישור לבחירת סיסמה
  if (user.email) {
    try {
      const resetToken = await generatePasswordResetToken(user._id);
      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      await sendWelcomeEmail({
        to: user.email,
        username: user.username,
        resetUrl,
      });

      console.log("✅ Welcome email sent to:", user.email);
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
      // לא נכשיל את יצירת המשתמש בגלל כשל במייל
    }
  } else {
    console.warn("⚠️ User created without email - cannot send welcome email");
  }

  return { success: true, user };
};

export const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) return null;

  console.log("=== UPDATE USER DEBUG ===");
  console.log("Incoming password:", data.password);

  // עדכון שדות רגילים
  if (data.username) user.username = data.username;
  if (data.email) user.email = data.email;
  if (data.role) user.role = data.role;
  if (data.isActive !== undefined) user.isActive = data.isActive;
  if (data.permissions) user.permissions = data.permissions;

  // סיסמה — רק אם באמת קיבלנו חדשה
  if (data.password && data.password.trim() !== "") {
    console.log("Password WILL be updated!");
    user.password = data.password.trim();
  } else {
    console.log("Password NOT updated (empty or missing).");
  }

  console.log("Password before save():", user.password);

  await user.save();

  console.log("Password after save():", user.password);
  console.log("=== END UPDATE USER DEBUG ===");

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
  const user = await User.findById(userId);
  if (!user) throw new Error("משתמש לא נמצא");

  if (!user.email) {
    throw new Error("למשתמש אין כתובת אימייל");
  }

  // יצירת טוקן
  const resetToken = await generatePasswordResetToken(userId);

  // יצירת URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // שליחת המייל
  await sendPasswordResetEmail({
    to: user.email,
    username: user.username,
    resetUrl,
  });

  return { success: true, message: "מייל איפוס סיסמה נשלח בהצלחה" };
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
export const resetPassword = async (token, newPassword) => {
  // הצפנת הטוקן
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // חיפוש משתמש
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error("הקישור לא תקף או פג תוקפו");
  }

  // עדכון הסיסמה
  user.password = newPassword;

  // מחיקת הטוקן
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  return { success: true, message: "הסיסמה שונתה בהצלחה" };
};

export const forgotPasswordByUsername = async (username) => {
  console.log("🔍 Received username:", username); // הוסף את זה

  const user = await User.findOne({ username });

  if (!user) {
    // לא חושפים שהמשתמש לא קיים (אבטחה)
    console.log(`⚠️ Forgot password attempt for non-existent user: ${username}`);
    return { success: true, message: "אם המשתמש קיים, מייל נשלח" };
  }
  console.log("👤 Found user:", user.username); // הוסף את זה
  console.log("📧 User email:", user.email);    // הוסף את זה


  if (!user.email) {
    console.log(`⚠️ User ${username} has no email`);
    return { success: true, message: "אם המשתמש קיים, מייל נשלח" };
  }

  // יצירת טוקן
  const resetToken = await generatePasswordResetToken(user._id);
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // שליחת המייל
  try {
    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      resetUrl,
    });

    console.log(`✅ Password reset email sent to: ${user.email}`);
  } catch (emailError) {
    console.error(`❌ Failed to send password reset email:`, emailError);
    throw emailError;
  }

  return { success: true, message: "מייל איפוס סיסמה נשלח בהצלחה" };
};
