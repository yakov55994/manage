import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    sparse: true // אופציונלי, אבל אם קיים חייב להיות unique
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    // רשימת IDs של פרויקטים שהמשתמש רשאי לראות
    projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    }],
  }
}, {
  timestamps: true
});

// Hash password לפני שמירה
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// פונקציה להשוואת סיסמאות
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);