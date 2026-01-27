import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  // נמען
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // סוג ההתראה
  type: {
    type: String,
    enum: [
      "budget_threshold",       // התראת תקציב
      "payment_status_change",  // שינוי סטטוס תשלום
      "new_invoice",            // חשבונית חדשה
      "new_order",              // הזמנה חדשה
      "system_update"           // עדכון מערכת
    ],
    required: true
  },

  // תוכן
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },

  // ישות קשורה
  entityType: {
    type: String,
    enum: ["project", "invoice", "order", "salary", "system"]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // מזהה קבוצה - לקישור התראות בין מנהלים (כשאחד מוחק, כולם מקבלים)
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // סטטוס
  read: {
    type: Boolean,
    default: false
  },

  // מטא-דאטא נוסף
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }

}, {
  timestamps: true
});

// אינדקס לשאילתות יעילות
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
