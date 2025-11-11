// models/userSchema.js
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs'
const { Schema } = mongoose;

const ModuleAccessSchema = new Schema({
  invoices: { type: String, enum: ['view', 'edit', null], default: null },
  orders:   { type: String, enum: ['view', 'edit', null], default: null },
  files:    { type: String, enum: ['view', 'edit', null], default: null },
}, { _id: false });

const ProjectPermissionSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  // גישת ברירת מחדל לפרויקט כולו (אם אין override ב־modules)
  access:  { type: String, enum: ['view', 'edit'], default: 'view' },
  // אפשר לשים null כדי לרשת את access, או 'view'/'edit' כדי להחמיר/להרחיב לפי מודול
  modules: { type: ModuleAccessSchema, default: () => ({}) },
}, { _id: false });

const SupplierPermissionSchema = new Schema({
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
}, { _id: false });

const PermissionsSchema = new Schema({
  // מצב הרשאות כללי: 'all' = גישה לכל הפרויקטים, 'restricted' = לפי הרשומות למטה
  mode:      { type: String, enum: ['all', 'restricted'], default: 'all' },

  // הרשאות לפי פרויקט
  projects:  { type: [ProjectPermissionSchema], default: [] },

  // אם תרצה להגביל גם לפי ספקים (למשל במסכים גלובליים)
  suppliers: { type: [SupplierPermissionSchema], default: [] },

  // אופרטורים גלובליים (לא חובה) — למשל יכולות CRUD כלליות לפי מודול
  ops: {
    type: Map,
    of:   new Schema({
      read:  { type: Boolean, default: true },
      write: { type: Boolean, default: false },
      del:   { type: Boolean, default: false },
    }, { _id: false }),
    default: undefined
  }
}, { _id: false });

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // ודא הצפנה ב־pre('save')
  email:    { type: String, trim: true },
  role:     { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },

  permissions: { type: PermissionsSchema, default: () => ({}) },

}, { timestamps: true });

// Hash password לפני שמירה
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
  next();
});

// פונקציה להשוואת סיסמאות
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcryptjs.compare(candidatePassword, this.password);
};

export default mongoose.model('User', UserSchema);
