import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser, emitToAdmins, emitToAll } from "../config/socket.js";
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
  async checkBudgetThreshold(project, oldRemaining, newRemaining, changedByUserId = null) {
    try {
      if (!project.budget || project.budget <= 0) return;

      const thresholds = [80, 90, 95, 100];
      const oldPercent = Math.round(((project.budget - oldRemaining) / project.budget) * 100);
      const newPercent = Math.round(((project.budget - newRemaining) / project.budget) * 100);

      // שליפת שם מבצע הפעולה
      let actorName = null;
      if (changedByUserId) {
        const actor = await User.findById(changedByUserId).select("username name");
        actorName = actor?.username || actor?.name || null;
      }

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

          // יצירת groupId משותף לכל ההתראות
          const groupId = new mongoose.Types.ObjectId();

          for (const user of users) {
            await this.createNotification(user._id, {
              type: "budget_threshold",
              title,
              message,
              entityType: "project",
              entityId: project._id,
              groupId,
              metadata: {
                threshold,
                percentUsed: newPercent,
                projectName: project.name,
                budget: project.budget,
                remaining: newRemaining,
                ...(actorName && { actorName })
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

      // שליפת שם מבצע הפעולה
      let actorName = null;
      if (changedByUserId) {
        const actor = await User.findById(changedByUserId).select("username name");
        actorName = actor?.username || actor?.name || null;
      }

      const statusText = newStatus === "כן" ? "שולם" : newStatus === "יצא לתשלום" ? "יצא לתשלום" : newStatus === "לא לתשלום" ? "לא לתשלום" : "לא שולם";
      const projectNames = invoice.projects?.map(p => p.projectName).join(", ") || "";
      const supplierName = invoice.supplierId?.name || null;

      // יצירת groupId משותף לכל ההתראות
      const groupId = new mongoose.Types.ObjectId();

      for (const user of users) {
        await this.createNotification(user._id, {
          type: "payment_status_change",
          title: `עדכון תשלום - חשבונית ${invoice.invoiceNumber}`,
          message: `סטטוס התשלום עודכן ל: ${statusText}`,
          entityType: "invoice",
          entityId: invoice._id,
          groupId,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            newStatus,
            totalAmount: invoice.totalAmount,
            projectNames,
            ...(supplierName && { supplierName }),
            ...(actorName && { actorName })
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
      // שליפת שם מבצע הפעולה
      let actorName = null;
      if (createdByUserId) {
        const actor = await User.findById(createdByUserId).select("username name");
        actorName = actor?.username || actor?.name || null;
      }

      // שליפת שם ספק
      let supplierName = null;
      if (invoice.supplierId) {
        if (typeof invoice.supplierId === "object" && invoice.supplierId.name) {
          supplierName = invoice.supplierId.name;
        } else {
          const Supplier = (await import("../models/Supplier.js")).default;
          const supplier = await Supplier.findById(invoice.supplierId).select("name");
          supplierName = supplier?.name || null;
        }
      }

      // שולחים לכל האדמינים ומנהלי חשבונות (כולל היוצר)
      const users = await User.find({
        isActive: true,
        $or: [
          { role: "admin" },
          { role: "accountant" }
        ]
      });

      // יצירת groupId משותף לכל ההתראות
      const groupId = new mongoose.Types.ObjectId();

      for (const user of users) {
        await this.createNotification(user._id, {
          type: "new_invoice",
          title: `חשבונית חדשה - ${invoice.invoiceNumber}`,
          message: `נוצרה חשבונית חדשה על סך ${invoice.totalAmount?.toLocaleString("he-IL")} ש״ח`,
          entityType: "invoice",
          entityId: invoice._id,
          groupId,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            projectNames: invoice.projects?.map(p => p.projectName).join(", "),
            ...(supplierName && { supplierName }),
            ...(actorName && { actorName })
          }
        });
      }
    } catch (error) {
      console.error("Error notifying new invoice:", error);
    }
  },

  /**
   * התראה על הזמנה חדשה
   */
  async notifyNewOrder(order, createdByUserId) {
    try {
      // שליפת שם מבצע הפעולה
      let actorName = null;
      if (createdByUserId) {
        const actor = await User.findById(createdByUserId).select("username name");
        actorName = actor?.username || actor?.name || null;
      }

      // שליפת שם ספק
      let supplierName = null;
      if (order.supplierId) {
        if (typeof order.supplierId === "object" && order.supplierId.name) {
          supplierName = order.supplierId.name;
        } else {
          const Supplier = (await import("../models/Supplier.js")).default;
          const supplier = await Supplier.findById(order.supplierId).select("name");
          supplierName = supplier?.name || null;
        }
      }

      // שולחים לכל האדמינים
      const users = await User.find({
        isActive: true,
        role: "admin"
      });

      // יצירת groupId משותף לכל ההתראות
      const groupId = new mongoose.Types.ObjectId();

      for (const user of users) {
        await this.createNotification(user._id, {
          type: "new_order",
          title: `הזמנה חדשה - ${order.orderNumber}`,
          message: `נוצרה הזמנה חדשה על סך ${order.sum?.toLocaleString("he-IL")} ש״ח`,
          entityType: "order",
          entityId: order._id,
          groupId,
          metadata: {
            orderNumber: order.orderNumber,
            sum: order.sum,
            projectName: order.projectName,
            ...(supplierName && { supplierName }),
            ...(actorName && { actorName })
          }
        });
      }
    } catch (error) {
      console.error("Error notifying new order:", error);
    }
  },

  /**
   * סנכרון התראות לאדמין חדש - מעתיק התראות שחסרות לו מאדמינים אחרים
   */
  async syncAdminNotifications(userId) {
    try {
      // בדיקה אם יש כבר התראות למשתמש
      const userNotifCount = await Notification.countDocuments({ userId });
      if (userNotifCount > 5) return; // כבר מסונכרן

      // איסוף groupIds שכבר קיימים למשתמש
      const existingGroupIds = await Notification.distinct("groupId", { userId });

      // מציאת התראות מאדמינים אחרים שחסרות למשתמש (30 יום אחרונים)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const missingNotifications = await Notification.aggregate([
        {
          $match: {
            userId: { $ne: new mongoose.Types.ObjectId(userId) },
            groupId: { $nin: existingGroupIds, $ne: null },
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        // קבוצה לפי groupId - לקחת רק אחד מכל קבוצה
        {
          $group: {
            _id: "$groupId",
            doc: { $first: "$$ROOT" }
          }
        },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { createdAt: -1 } },
        { $limit: 50 }
      ]);

      if (missingNotifications.length === 0) return;

      // יצירת עותקים למשתמש החדש
      const copies = missingNotifications.map(n => ({
        userId,
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entityType,
        entityId: n.entityId,
        groupId: n.groupId,
        read: false,
        metadata: n.metadata,
        createdAt: n.createdAt
      }));

      await Notification.insertMany(copies);
      console.log(`Synced ${copies.length} notifications for admin ${userId}`);
    } catch (error) {
      console.error("Error syncing admin notifications:", error);
    }
  },

  /**
   * קבלת התראות של משתמש
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
    // סנכרון התראות לאדמינים חדשים
    const user = await User.findById(userId).select("role");
    if (user?.role === "admin") {
      await this.syncAdminNotifications(userId);
    }

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
   * מחיקת התראה - מוחק גם לכל המנהלים אם יש groupId
   */
  async deleteNotification(userId, notificationId) {
    const notification = await Notification.findById(notificationId);

    if (!notification) return;

    if (notification.groupId) {
      // מוחקים את כל ההתראות מהאירוע (לכל המשתמשים)
      const result = await Notification.deleteMany({
        groupId: notification.groupId
      });

      emitToAll("notification:deleted", {
        groupId: notification.groupId
      });

      return { deletedCount: result.deletedCount };
    } else {
      // אין groupId - מוחקים רק את ההתראה הספציפית
      await Notification.findByIdAndDelete(notificationId);

      emitToUser(userId, "notification:unread_count", {
        unreadCount: await Notification.countDocuments({ userId, read: false })
      });

      return { deletedCount: 1 };
    }
  },

  /**
   * מחיקת כל ההתראות של משתמש - כולל סנכרון לשאר המשתמשים
   */
  async deleteAllNotifications(userId) {
    // איסוף כל ה-groupIds של ההתראות של המשתמש
    const userNotifications = await Notification.find({ userId }).select("groupId");
    const groupIds = [...new Set(
      userNotifications.map(n => n.groupId).filter(Boolean).map(id => id.toString())
    )];

    // מחיקת כל ההתראות עם אותם groupIds (לכל המשתמשים)
    let deletedCount = 0;
    if (groupIds.length > 0) {
      const result = await Notification.deleteMany({
        $or: [
          { userId },
          { groupId: { $in: groupIds } }
        ]
      });
      deletedCount = result.deletedCount;

      // שליחת עדכון סנכרון לכל המשתמשים
      for (const groupId of groupIds) {
        emitToAll("notification:deleted", { groupId });
      }
    } else {
      const result = await Notification.deleteMany({ userId });
      deletedCount = result.deletedCount;
    }

    emitToUser(userId, "notification:unread_count", { unreadCount: 0 });
    return { deletedCount };
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
