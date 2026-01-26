import webpush from "web-push";
import User from "../models/User.js";

// VAPID Keys - הוסף את אלה ל-.env שלך
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BJbjMjR0in5TdX0cYJ1kjwuUXpVUkvjx0dagobVMOGvEEikO6_3ve-MCIw-SumMV-PVeMPHPdcjV_72a6gW3DFM";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "TYh92DU92HjrO2qe-_xy2uOnBgM-eTdmp1jmY80Ejpw";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@nihulon.co.il";

// Configure web-push
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * קבלת VAPID Public Key לפרונטאנד
 */
export const getVapidPublicKey = () => VAPID_PUBLIC_KEY;

/**
 * שליחת Push Notification למשתמש
 */
export const sendPushNotification = async (userId, { title, body, data }) => {
  try {
    const user = await User.findById(userId);
    const subscriptions = user?.pushSubscriptions || [];

    if (subscriptions.length === 0) {
      return { success: false, reason: "No push subscriptions" };
    }

    // Check user preferences
    if (user.notificationPreferences?.pushNotifications === false) {
      return { success: false, reason: "Push notifications disabled by user" };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/logo192.png",
      badge: "/badge.png",
      dir: "rtl",
      lang: "he",
      data: {
        ...data,
        url: data?.entityType && data?.entityId
          ? `/${data.entityType}s/${data.entityId}`
          : "/"
      }
    });

    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        webpush.sendNotification(subscription, payload)
      )
    );

    // Remove invalid subscriptions
    const invalidSubscriptions = [];
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        const statusCode = result.reason?.statusCode;
        // 404 or 410 means subscription is no longer valid
        if (statusCode === 404 || statusCode === 410) {
          invalidSubscriptions.push(subscriptions[idx]);
        }
      }
    });

    if (invalidSubscriptions.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: {
            endpoint: { $in: invalidSubscriptions.map(s => s.endpoint) }
          }
        }
      });
      console.log(`Removed ${invalidSubscriptions.length} invalid subscriptions for user ${userId}`);
    }

    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failureCount = results.filter(r => r.status === "rejected").length;

    return {
      success: successCount > 0,
      successCount,
      failureCount
    };
  } catch (error) {
    console.error("Push notification error:", error);
    return { success: false, reason: error.message };
  }
};

/**
 * רישום Push Subscription למשתמש
 */
export const registerPushSubscription = async (userId, subscription) => {
  if (!subscription || !subscription.endpoint) {
    throw new Error("Invalid subscription");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if subscription already exists (by endpoint)
  const existingSubscription = user.pushSubscriptions?.find(
    s => s.endpoint === subscription.endpoint
  );

  if (!existingSubscription) {
    await User.findByIdAndUpdate(userId, {
      $push: {
        pushSubscriptions: {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        }
      }
    });
  }

  return { success: true };
};

/**
 * הסרת Push Subscription
 */
export const unregisterPushSubscription = async (userId, endpoint) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { pushSubscriptions: { endpoint } }
  });

  return { success: true };
};

// Backward compatibility - keep old names as aliases
export const registerFcmToken = registerPushSubscription;
export const unregisterFcmToken = async (userId, subscription) => {
  const endpoint = typeof subscription === "string"
    ? subscription
    : subscription?.endpoint;
  return unregisterPushSubscription(userId, endpoint);
};

export default {
  getVapidPublicKey,
  sendPushNotification,
  registerPushSubscription,
  unregisterPushSubscription,
  registerFcmToken,
  unregisterFcmToken
};
