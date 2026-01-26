import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import api from "../api/api";

// Convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Fetch VAPID key from backend
      fetchVapidKey();
    }
  }, []);

  const fetchVapidKey = async () => {
    try {
      const { data } = await api.get("/notifications/vapid-key");
      if (data.success) {
        setVapidKey(data.data.vapidKey);
      }
    } catch (error) {
      console.error("Error fetching VAPID key:", error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error("הדפדפן שלך לא תומך בהתראות", {
        className: "sonner-toast error rtl"
      });
      return false;
    }

    if (!vapidKey) {
      toast.error("לא ניתן להתחבר לשרת ההתראות", {
        className: "sonner-toast error rtl"
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("לא ניתנה הרשאה להתראות", {
          className: "sonner-toast error rtl"
        });
        setIsLoading(false);
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service worker registered:", registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      console.log("Push subscription:", subscription);

      // Send subscription to backend
      await api.post("/notifications/subscribe", {
        subscription: subscription.toJSON()
      });

      toast.success("התראות הופעלו בהצלחה!", {
        className: "sonner-toast success rtl"
      });

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error requesting push permission:", error);
      toast.error("שגיאה בהפעלת התראות", {
        className: "sonner-toast error rtl"
      });
      setIsLoading(false);
      return false;
    }
  }, [isSupported, vapidKey]);

  const disableNotifications = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Unsubscribe locally
          await subscription.unsubscribe();

          // Remove from backend
          await api.post("/notifications/unsubscribe", {
            endpoint: subscription.endpoint
          });
        }
      }

      toast.success("התראות הושבתו", {
        className: "sonner-toast success rtl"
      });
    } catch (error) {
      console.error("Error disabling notifications:", error);
    }
  }, []);

  return {
    permission,
    isSupported,
    isLoading,
    requestPermission,
    disableNotifications,
    isEnabled: permission === "granted"
  };
};

export default usePushNotifications;
