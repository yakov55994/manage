import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // מאפשר null/undefined אבל unique אם קיים
  },
  password: {
    type: String,
    required: false, // ← שינוי כאן! לא חובה
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'accountant', 'limited'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  permissions: [
    {
      project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
      access: {
        type: String,
        enum: ['none', 'view', 'edit'],
        default: 'none',
      },
      modules: {
        invoices: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        orders: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        suppliers: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        files: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
      },
    },
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, {
  timestamps: true,
});

// Hash password לפני שמירה - רק אם יש סיסמה
userSchema.pre('save', async function (next) {
  // אם הסיסמה לא השתנתה או לא קיימת - דלג
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// השוואת סיסמה
userSchema.methods.comparePassword = async function (candidatePassword) {
  // אם אין סיסמה - החזר false
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;