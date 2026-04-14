import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['login_success', 'login_failed', 'logout', 'error', 'info'],
    required: true
  },
  message: { type: String, required: true },
  username: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String },
  userAgent: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

// מחיקה אוטומטית אחרי 90 יום
systemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('SystemLog', systemLogSchema);
