// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/userSchema.js'

// Middleware לאימות משתמש
export const authenticate = async (req, res, next) => {
  try {
    // חיפוש הטוקן בheaders או בcookies
    let token = req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7);
    } else {
      // אם אין בheader, נסה בcookies
      token = req.cookies.authToken || req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'אין טוקן אימות, גישה נדחתה',
        authenticated: false 
      });
    }

    // אימות הטוקן
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // חיפוש המשתמש במסד הנתונים
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'משתמש לא נמצא, גישה נדחתה',
        authenticated: false 
      });
    }

    if (user.status !== 'פעיל') {
      return res.status(401).json({ 
        message: 'המשתמש אינו פעיל במערכת',
        authenticated: false 
      });
    }

    // הוספת המשתמש לrequest
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'טוקן לא תקין',
        authenticated: false 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'טוקן פג תוקף',
        authenticated: false 
      });
    }
    
    res.status(500).json({ 
      message: 'שגיאה באימות',
      authenticated: false 
    });
  }
};

// Middleware לבדיקת הרשאות מנהל
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'נדרש אימות',
      authenticated: false 
    });
  }

  // בדיקה אם המשתמש הוא מנהל או שיש לו הרשאות ניהול משתמשים
  if (req.user.role !== 'מנהל' && !req.user.permissions?.users) {
    return res.status(403).json({ 
      message: 'אין לך הרשאות מנהל לפעולה זו',
      authenticated: true,
      authorized: false 
    });
  }

  next();
};

// Middleware לבדיקת הרשאות ספציפיות
export const requirePermission = (module, action = 'view') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'נדרש אימות',
        authenticated: false 
      });
    }

    // מנהלים מקבלים הרשאה מלאה
    if (req.user.role === 'מנהל') {
      return next();
    }

    // בדיקת הרשאות ספציפיות
    const userPermissions = req.user.permissions || {};
    const modulePermissions = userPermissions[module];

    if (!modulePermissions || !modulePermissions[action]) {
      return res.status(403).json({ 
        message: `אין לך הרשאת ${action} למודול ${module}`,
        authenticated: true,
        authorized: false,
        requiredPermission: { module, action }
      });
    }

    next();
  };
};

// בדיקת סטטוס אימות (לא חובה להיות מחובר)
export const checkAuthStatus = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7);
    } else {
      token = req.cookies.authToken || req.cookies.auth_token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    
    req.user = user && user.status === 'פעיל' ? user : null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};