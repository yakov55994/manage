// Service Worker for Push Notifications

// Handle push events
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  let data = {
    title: "התראה חדשה",
    body: "",
    icon: "/logo192.png",
    badge: "/badge.png",
    dir: "rtl",
    lang: "he",
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    dir: data.dir,
    lang: data.lang,
    tag: data.data?.type || "notification",
    data: data.data,
    requireInteraction: true,
    actions: [
      {
        action: "open",
        title: "פתח"
      },
      {
        action: "close",
        title: "סגור"
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click:", event);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Determine URL to open
  let url = "/";
  const data = event.notification.data;
  if (data?.url) {
    url = data.url;
  } else if (data?.entityType && data?.entityId) {
    const routes = {
      project: `/projects/${data.entityId}`,
      invoice: `/invoices/${data.entityId}`,
      order: `/orders/${data.entityId}`,
      salary: `/salaries/${data.entityId}`
    };
    url = routes[data.entityType] || "/";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle service worker installation
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(clients.claim());
});
