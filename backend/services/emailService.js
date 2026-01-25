import * as brevo from '@getbrevo/brevo';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// אתחול Brevo
let apiInstance = null;
let apiKey = null;

if (process.env.BREVO_API_KEY) {
  apiInstance = new brevo.TransactionalEmailsApi();
  apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
} else {
  console.warn('⚠ BREVO_API_KEY not configured');
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
      console.warn('⚠ Brevo not configured - skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    if (!user || !user.email) {
      throw new Error('משתמש או אימייל לא תקינים');
    }

    if (typeof user.save !== 'function') {
      throw new Error('User object is not a Mongoose document');
    }

    const resetToken = await generateResetToken(user);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

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
            <strong>⚠ שים לב:</strong>
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
      console.warn('⚠ Brevo not configured - skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    if (!user || !user.email) {
      throw new Error('משתמש או אימייל לא תקינים');
    }

    if (typeof user.save !== 'function') {
      throw new Error('User object is not a Mongoose document');
    }

    const resetToken = await generateResetToken(user);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

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

    return { success: true, data };

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    console.error('❌ Error body:', error.body);
    throw new Error('שגיאה בשליחת מייל ברוכים הבאים');
  }
};

// ✅ אישור תשלום לספק
export const sendPaymentConfirmationEmail = async (supplierEmail, supplierName, invoiceData) => {
  try {
    if (!apiInstance) {
      console.warn('⚠ Brevo not configured - skipping email');
      return { success: false, message: 'Email service not configured' };
    }

    if (!supplierEmail) {
      console.warn('⚠ Supplier email not provided - skipping email');
      return { success: false, message: 'Supplier email not provided' };
    }

    const { invoiceNumber, totalAmount, paymentDate, documentType, detail } = invoiceData;

    // בדיקה אם חסר מסמך מס/קבלה
    const isMissingDocument = !documentType ||
      !['חשבונית מס / קבלה', 'אין צורך'].includes(documentType);

    console.log(`📧 Email debug - documentType: "${documentType}", isMissingDocument: ${isMissingDocument}`);

    // פורמט תאריך
    const formattedDate = paymentDate
      ? new Date(paymentDate).toLocaleDateString('he-IL')
      : new Date().toLocaleDateString('he-IL');

    // פורמט סכום
    const formattedAmount = Number(totalAmount).toLocaleString('he-IL');

    const sendSmtpEmail = new brevo.SendSmtpEmail();

    // צבעים מותנים - אדום אם חסר מסמך, ירוק אם לא חסר
    const headerGradient = isMissingDocument
      ? 'linear-gradient(135deg, #dc2626, #ef4444)'  // אדום
      : 'linear-gradient(135deg, #16a34a, #22c55e)'; // ירוק
    const boxBg = isMissingDocument ? '#fef2f2' : '#f0fdf4';
    const boxBorder = isMissingDocument ? '#dc2626' : '#16a34a';
    const textColor = isMissingDocument ? '#991b1b' : '#166534';
    const dividerColor = isMissingDocument ? '#fca5a5' : '#86efac';

    sendSmtpEmail.subject = `✅ אישור תשלום - חשבונית מספר ${invoiceNumber}`;
    sendSmtpEmail.to = [{ email: supplierEmail, name: supplierName || 'ספק יקר' }];
    sendSmtpEmail.replyTo = { email: 'AN089921117@GMAIL.COM', name: 'עמותת חינוך עם חיוך' };
    sendSmtpEmail.htmlContent = `
<div dir="rtl" style="font-family: Arial; max-width: 650px; margin: 0 auto; background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 6px 12px rgba(0,0,0,0.12);">

  ${isMissingDocument
        ? `
      <div style="background:#7f1d1d; color:white; padding:35px; text-align:center;">
        <h1 style="margin:0; font-size:34px; font-weight:900;">
          ⚠️ נדרש לשלוח חשבונית מס / קבלה
        </h1>
        <p style="margin-top:12px; font-size:18px;">
          התשלום בוצע — אך טרם התקבל מסמך חשבונאי
        </p>
      </div>
      `
        : `
      <div style="background:#15803d; color:white; padding:35px; text-align:center;">
        <h1 style="margin:0; font-size:30px;">✅ אישור תשלום</h1>
        <p style="margin-top:10px;">עמותת חינוך עם חיוך</p>
      </div>
      `
      }

  <div style="padding:40px; color:#1f2937; line-height:1.9;">

    <p style="font-size:17px;">
      שלום <strong>${supplierName || 'ספק יקר'}</strong>,
    </p>

    ${isMissingDocument
        ? `
        <div style="background:#fef2f2; border-right:6px solid #dc2626; padding:22px; border-radius:10px; margin:25px 0;">
          <h2 style="margin:0 0 12px 0; color:#991b1b; font-size:20px;">
            🔴 טרם התקבלה חשבונית מס / קבלה
          </h2>

          <p style="margin:0 0 10px 0;">
            עבור התשלום המפורט להלן, נבקש לשלוח:
          </p>

          <ul style="margin:10px 0 0; padding-right:20px;">
            <li><strong>חשבונית מס / קבלה</strong></li>
            <li>על שם: <strong>עמותת חינוך עם חיוך</strong></li>
            <li>בציון מספר החשבונית שלהלן</li>
          </ul>
        </div>
        `
        : ''
      }

    <div style="background:${boxBg}; border-right:5px solid ${boxBorder}; padding:24px; border-radius:10px; margin:30px 0;">
      <h2 style="margin:0 0 18px 0; color:${textColor}; font-size:20px;">
        📄 פרטי החשבונית
      </h2>

      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0; font-weight:bold;">מספר חשבונית:</td>
          <td>${invoiceNumber}</td>
        </tr>

       
            <tr>
              <td style="padding:10px 0; font-weight:bold;">פירוט:</td>
              <td>${detail}</td>
            </tr>

        <tr>
          <td style="padding:10px 0; font-weight:bold;">תאריך תשלום:</td>
          <td>${formattedDate}</td>
        </tr>

        <tr>
          <td style="padding:10px 0; font-weight:bold;">סכום ששולם:</td>
          <td style="font-size:20px; font-weight:bold;">₪${formattedAmount}</td>
        </tr>
      </table>
    </div>

    <p style="margin-top:30px;">
      בברכה,<br>
      <strong>עמותת חינוך עם חיוך</strong>
    </p>

  </div>

  <div style="background:#f3f4f6; padding:20px; text-align:center; font-size:14px; color:#6b7280;">
    מייל זה נשלח אוטומטית ממערכת ניהולון<br/>
    © 2025
  </div>

</div>
`;

    sendSmtpEmail.sender = {
      name: 'עמותת חינוך עם חיוך',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@nihulon.com'
    };

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Payment confirmation email sent to ${supplierEmail}`);

    return { success: true, data };

  } catch (error) {
    console.error('❌ Error sending payment confirmation email:', error);
    console.error('❌ Error body:', error.body);
    // לא זורקים שגיאה - רק מחזירים false כדי לא לעצור את התהליך
    return { success: false, message: 'שגיאה בשליחת מייל אישור תשלום' };
  }
};