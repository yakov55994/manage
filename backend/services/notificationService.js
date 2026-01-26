import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser, emitToAdmins } from "../config/socket.js";
import { sendPushNotification } from "./pushService.js";

const notificationService = {
  /**
   * יצירת התראה חדשה ושליחתה
   */
  async createNotification(userId, data) {
    try {
      const notification = await Notification.create({
        userId,
        ...data
      });

      // שליחה בזמן אמת דרך WebSocket
      emitToUser(userId, "notification:new", notification);

      // שליחת Push Notification
      try {
        const user = await User.findById(userId);
        // בדיקת העדפות המשתמש לפי סוג ההתראה
        if (user?.notificationPreferences?.[data.type] !== false) {
          await sendPushNotification(userId, {
            title: data.title,
            body: data.message,
            data: {
              type: data.type,
              entityType: data.entityType || "",
              entityId: data.entityId?.toString() || ""
            }
          });
        }
      } catch (pushError) {
        console.error("Push notification failed:", pushError.message);
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },

  /**
   * התראת חריגת תקציב
   */
  async checkBudgetThreshold(project, oldRemaining, newRemaining) {
    try {
      if (!project.budget || project.budget <= 0) return;

      const thresholds = [80, 90, 95, 100];
      const oldPercent = Math.round(((project.budget - oldRemaining) / project.budget) * 100);
      const newPercent = Math.round(((project.budget - newRemaining) / project.budget) * 100);

      // מחפשים האם עברנו סף חדש
      for (const threshold of thresholds) {
        if (oldPercent < threshold && newPercent >= threshold) {
          // מצאנו סף שעברנו - שולחים התראה לכל המשתמשים עם גישה לפרויקט
          const users = await User.find({
            isActive: true,
            $or: [
              { role: "admin" },
              { "permissions.project": project._id }
            ]
          });

          const title = newPercent >= 100
            ? `חריגת תקציב - ${project.name}`
            : `התראת תקציב - ${project.name}`;

          const message = newPercent >= 100
            ? `התקציב בפרויקט ${project.name} נוצל במלואו (${newPercent}%)`
            : `נוצלו ${newPercent}% מהתקציב בפרויקט ${project.name}`;

          for (const user of users) {
            await this.createNotification(user._id, {
              type: "budget_threshold",
              title,
              message,
              entityType: "project",
              entityId: project._id,
              metadata: {
                threshold,
                percentUsed: newPercent,
                projectName: project.name,
                budget: project.budget,
                remaining: newRemaining
              }
            });
          }

          break; // שולחים התראה רק על הסף הראשון שעברנו
        }
      }
    } catch (error) {
      console.error("Error checking budget threshold:", error);
    }
  },

  /**
   * התראה על שינוי סטטוס תשלום
   */
  async notifyPaymentStatusChange(invoice, newStatus, changedByUserId) {
    try {
      // מוצאים משתמשים עם גישה לפרויקטים של החשבונית
      const projectIds = invoice.projects?.map(p => p.projectId) || [];

      const users = await User.find({
        isActive: true,
        $or: [
          { role: "admin" },
          { role: "accountant" },
          { "permissions.project": { $in: projectIds } }
        ]
      });

      const statusText = newStatus === "כן" ? "שולם" : newStatus === "יצא לתשלום" ? "יצא לתשלום" : "לא שולם";

      for (const user of users) {
        await this.createNotification(user._id, {
          type: "payment_status_change",
          title: `עדכון תשלום - חשבונית ${invoice.invoiceNumber}`,
          message: `סטטוס התשלום עודכן ל: ${statusText}`,
          entityType: "invoice",
          entityId: invoice._id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            newStatus,
            totalAmount: invoice.totalAmount
          }
        });
      }
    } catch (error) {
      console.error("Error notifying payment status change:", error);
    }
  },

  /**
   * התראה על חשבונית חדשה
   */
  async notifyNewInvoice(invoice, createdByUserId) {
    try {
      const projectIds = invoice.projects?.map(p => p.projectId) || [];

      // שולחים לכל האדמינים ומנהלי חשבונות (כולל היוצר)
      const users = await User.find({
        isActive: true,
        $or: [
          { role: "admin" },
          { role: "accountant" }
        ]
      });

      for (const user of users) {
        await this.createNotification(user._id, {
          type: "new_invoice",
          title: `חשבונית חדשה - ${invoice.invoiceNumber}`,
          message: `נוצרה חשבונית חדשה על סך ${invoice.totalAmount?.toLocaleString("he-IL")} ש״ח`,
          entityType: "invoice",
          entityId: invoice._id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            projectNames: invoice.projects?.map(p => p.projectName).join(", ")
          }
        });
      }
    } catch (error) {
      console.error("Error notifying new invoice:", error);
    }
  },

  /**
   * קבלת התראות של משתמש
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
    const query = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false
    });

    const total = await Notification.countDocuments({ userId });

    return {
      notifications,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * סימון התראה כנקראה
   */
  async markAsRead(userId, notificationId) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true }
    );

    // עדכון ספירת ההתראות שלא נקראו
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false
    });

    emitToUser(userId, "notification:unread_count", { unreadCount });

    return { unreadCount };
  },

  /**
   * סימון כל ההתראות כנקראו
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    emitToUser(userId, "notification:unread_count", { unreadCount: 0 });

    return { unreadCount: 0 };
  },

  /**
   * מחיקת התראה
   */
  async deleteNotification(userId, notificationId) {
    await Notification.findOneAndDelete({ _id: notificationId, userId });
  },

  /**
   * מחיקת כל ההתראות של משתמש
   */
  async deleteAllNotifications(userId) {
    const result = await Notification.deleteMany({ userId });
    emitToUser(userId, "notification:unread_count", { unreadCount: 0 });
    return { deletedCount: result.deletedCount };
  },

  /**
   * מחיקת התראות ישנות (מעל 30 יום)
   */
  async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  }
};

export default notificationService;
