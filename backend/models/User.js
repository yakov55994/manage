import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const permissionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  access: { type: String, enum: ['view', 'edit'], default: 'view' },

  modules: {
    invoices: { type: String, enum: ['view', 'edit'], default: 'view' },
    orders: { type: String, enum: ['view', 'edit'], default: 'view' },
    suppliers: { type: String, enum: ['view', 'edit'], default: 'view' },
    files: { type: String, enum: ['view', 'edit'], default: 'view' }
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },

  // 🔥 מבנה חד וברור של הרשאות
  permissions: [permissionSchema]

}, { timestamps: true });

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
