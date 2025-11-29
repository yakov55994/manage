import * as brevo from '@getbrevo/brevo';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔑 BREVO_API_KEY exists:', !!process.env.BREVO_API_KEY);
console.log('🌐 CLIENT_URL:', process.env.CLIENT_URL);

// אתחול Brevo
let apiInstance = null;
let apiKey = null;

if (process.env.BREVO_API_KEY) {
  apiInstance = new brevo.TransactionalEmailsApi();
  apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  console.log('✅ Brevo initialized successfully');
} else {
  console.warn('⚠️ BREVO_API_KEY not configured');
}

// פונקציה עזר ליצירת טוקן איפוס
const generateResetToken = async (user) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  return resetToken;
};

// ✅ איפוס סיסמה
export const sendPasswordResetEmail = async (user) => {
  try {
    if (!apiInstance) {
      console.warn('⚠️ Brevo not configured - skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    if (!user || !user.email) {
      throw new Error('משתמש או אימייל לא תקינים');
    }

    if (typeof user.save !== 'function') {
      throw new Error('User object is not a Mongoose document');
    }

    console.log('🔐 Generating reset token...');
    const resetToken = await generateResetToken(user);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    console.log('📧 Sending password reset email via Brevo to:', user.email);
    console.log('🔗 Reset URL:', resetUrl);

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = '🔐 איפוס סיסמה - ניהולון';
    sendSmtpEmail.to = [{ email: user.email, name: user.username }];
    sendSmtpEmail.htmlContent = `
      <div dir="rtl" style="font-family: Arial; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #f97316, #fb923c); color: white; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🔐 איפוס סיסמה</h1>
          <p style="margin: 10px 0 0;">מערכת ניהול ניהולון</p>
        </div>
        
        <div style="padding: 40px; color: #333; line-height: 1.8;">
          <p style="font-size: 16px;">שלום <strong>${user.username}</strong>,</p>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת ניהולון.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: bold; font-size: 16px;">
              בחר סיסמה חדשה
            </a>
          </div>
          
          <div style="background: #fef3c7; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>⚠️ שים לב:</strong>
            <ul style="margin: 10px 0 0; padding-right: 20px;">
              <li>הקישור תקף ל-24 שעות</li>
              <li>אם לא ביקשת לאפס, התעלם</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            אם הכפתור לא עובד, העתק את הקישור:<br>
            <span style="color: #f97316; word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 2px solid #e5e5e5;">
          <p style="margin: 0;"><strong>ניהולון</strong> - מערכת ניהול עסקית</p>
          <p style="margin: 5px 0 0;">© 2025 כל הזכויות שמורות</p>
        </div>
        
      </div>
    `;
    sendSmtpEmail.sender = { 
      name: 'ניהולון', 
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@nihulon.com' 
    };

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Password reset email sent via Brevo!');
    console.log('📨 Message ID:', data.messageId);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    console.error('❌ Error body:', error.body);
    throw new Error('שגיאה בשליחת מייל איפוס סיסמה');
  }
};

// ✅ ברוכים הבאים
export const sendWelcomeEmail = async (user) => {
  try {
    if (!apiInstance) {
      console.warn('⚠️ Brevo not configured - skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    if (!user || !user.email) {
      throw new Error('משתמש או אימייל לא תקינים');
    }

    if (typeof user.save !== 'function') {
      throw new Error('User object is not a Mongoose document');
    }

    console.log('🔐 Generating reset token...');
    const resetToken = await generateResetToken(user);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    console.log('📧 Sending welcome email via Brevo to:', user.email);
    console.log('🔗 Setup URL:', resetUrl);

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = '🎉 ברוכים הבאים לניהולון!';
    sendSmtpEmail.to = [{ email: user.email, name: user.username }];
    sendSmtpEmail.htmlContent = `
      <div dir="rtl" style="font-family: Arial; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #f97316, #fb923c); color: white; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 ברוכים הבאים!</h1>
          <p style="margin: 10px 0 0;">חשבונך נוצר בהצלחה</p>
        </div>
        
        <div style="padding: 40px; color: #333; line-height: 1.8;">
          <p>שלום <strong>${user.username}</strong>,</p>
          <p>חשבונך במערכת ניהולון נוצר בהצלחה! 🎊</p>
          
          <div style="background: #f0f9ff; border-right: 4px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📌 שם המשתמש שלך:</strong> ${user.username}</p>
          </div>
          
          <p>כדי להתחיל, בחר סיסמה למערכת:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: bold;">
              בחר סיסמה
            </a>
          </div>
          
          <p><strong>הקישור תקף ל-24 שעות.</strong></p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            אם הכפתור לא עובד, העתק את הקישור:<br>
            <span style="color: #f97316; word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 2px solid #e5e5e5;">
          <p style="margin: 0;"><strong>ניהולון</strong></p>
          <p style="margin: 5px 0 0;">© 2025</p>
        </div>
        
      </div>
    `;
    sendSmtpEmail.sender = { 
      name: 'ניהולון', 
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@nihulon.com' 
    };

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Welcome email sent via Brevo!');
    console.log('📨 Message ID:', data.messageId);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    console.error('❌ Error body:', error.body);
    throw new Error('שגיאה בשליחת מייל ברוכים הבאים');
  }
};
