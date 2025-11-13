import mongoose from "mongoose";
import bcryptjs from "bcryptjs";


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  permissions: {
    projects: [{
      project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
      access: { type: String, enum: ['view', 'edit'], default: 'view' },
      modules: {
        invoices: { type: String, enum: ['view', 'edit'], default: 'view' },
        orders: { type: String, enum: ['view', 'edit'], default: 'view' },
        suppliers: { type: String, enum: ['view', 'edit'], default: 'view' },
        files: { type: String, enum: ['view', 'edit'], default: 'view' }
      }
    }]
  }
}, { timestamps: true });

// Hash password לפני שמירה
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

// השוואת סיסמאות
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User