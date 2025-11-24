import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const permissionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  access: {
    type: String,
    enum: ["none", "view", "edit"],
    default: "none"
  },
  modules: {
    invoices: { type: String, enum: ["none", "view", "edit"], default: "none" },
    orders: { type: String, enum: ["none", "view", "edit"], default: "none" },
    suppliers: { type: String, enum: ["none", "view", "edit"], default: "none" },
    files: { type: String, enum: ["none", "view", "edit"], default: "none" },
  }
});

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    permissions: {
      type: [permissionSchema],
      default: []
    },
    
    // ✅ שדות חדשים לאיפוס סיסמה
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (candidate) {
  return bcryptjs.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);