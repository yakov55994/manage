// models/User.js - מודל מתוקן
import mongoose from 'mongoose';

// בדיקה אם המודל כבר קיים
let User;

try {
  // נסה לקבל את המודל הקיים
  User = mongoose.model('User');
} catch (error) {
  // אם המודל לא קיים, צור אותו
  const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'שם משתמש נדרש'],
      trim: true,
      minlength: [2, 'שם משתמש חייב להכיל לפחות 2 תווים'],
      maxlength: [50, 'שם משתמש לא יכול להכיל יותר מ-50 תווים']
    },
    
    email: {
      type: String,
      required: [true, 'אימייל נדרש'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'אנא הזן כתובת אימייל תקינה'
      ]
    },
    
    password: {
      type: String,
      required: [true, 'סיסמה נדרשת'],
      minlength: [6, 'סיסמה חייבת להכיל לפחות 6 תווים']
    },
    
    role: {
      type: String,
      required: [true, 'תפקיד נדרש'],
      enum: {
        values: ['מנהל', 'רכש', 'פרויקטים', 'חשבות', 'משאבי אנוש'],
        message: 'תפקיד לא תקין'
      }
    },
    
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^05\d-?\d{7}$|^0[2-4,8-9]\d-?\d{7}$/.test(v.replace(/\s/g, ''));
        },
        message: 'מספר טלפון לא תקין'
      }
    },
    
    permissions: {
      projects: {
        type: Boolean,
        default: false
      },
      invoices: {
        type: Boolean,
        default: false
      },
      suppliers: {
        type: Boolean,
        default: false
      },
      orders: {
        type: Boolean,
        default: false
      },
      reports: {
        type: Boolean,
        default: false
      }
    },
    
    status: {
      type: String,
      enum: ['פעיל', 'לא פעיל', 'מושהה'],
      default: 'פעיל'
    },
    
    lastLogin: {
      type: Date
    },
    
    loginAttempts: {
      type: Number,
      default: 0
    },
    
    lockUntil: {
      type: Date
    },
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    
    updatedAt: {
      type: Date,
      default: Date.now
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }, {
    timestamps: true
  });

  // אינדקסים
  userSchema.index({ email: 1 });
  userSchema.index({ role: 1 });
  userSchema.index({ status: 1 });
  userSchema.index({ createdAt: -1 });

  // Virtual field לבדיקה אם החשבון נעול
  userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
  });

  // הוספת הרשאות מלאות למנהלים אוטומטית
  userSchema.pre('save', function(next) {
    if (this.role === 'מנהל') {
      this.permissions = {
        projects: true,
        invoices: true,
        suppliers: true,
        orders: true,
        reports: true
      };
    }
    
    this.updatedAt = new Date();
    next();
  });

  // מתודות
  userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    return this.save();
  };

  userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
      return this.updateOne({
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        }
      });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
      updates.$set = {
        lockUntil: Date.now() + 30 * 60 * 1000
      };
    }
    
    return this.updateOne(updates);
  };

  userSchema.methods.hasPermission = function(module, action = null) {
    if (this.role === 'מנהל') {
      return true;
    }
    
    if (!this.permissions || !this.permissions[module]) {
      return false;
    }
    
    if (!action) {
      return this.permissions[module];
    }
    
    return this.permissions[module][action] || this.permissions[module];
  };

  userSchema.methods.getActivePermissions = function() {
    if (this.role === 'מנהל') {
      return ['projects', 'invoices', 'suppliers', 'orders', 'reports'];
    }
    
    return Object.keys(this.permissions || {}).filter(key => this.permissions[key]);
  };

  userSchema.statics.findWithFilters = function(filters = {}) {
    const query = {};
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    return this.find(query).select('-password').sort({ createdAt: -1 });
  };

  userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.loginAttempts;
    delete user.lockUntil;
    return user;
  };

  User = mongoose.model('User', userSchema);
}

export default User;