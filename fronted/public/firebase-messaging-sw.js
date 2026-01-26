// Firebase Messaging Service Worker
// Note: You need to add your Firebase config values here

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration - Replace with your values from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "management-b2a97",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'התראה חדשה';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo192.png',
    badge: '/badge.png',
    dir: 'rtl',
    lang: 'he',
    tag: payload.data?.type || 'notification',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'פתח'
      },
      {
        action: 'close',
        title: 'סגור'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app or focus if already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate to the relevant page based on notification data
          const data = event.notification.data;
          if (data?.entityType && data?.entityId) {
            const routes = {
              project: `/projects/${data.entityId}`,
              invoice: `/invoices/${data.entityId}`,
              order: `/orders/${data.entityId}`,
              salary: `/salaries/${data.entityId}`
            };
            const route = routes[data.entityType];
            if (route) {
              client.navigate(route);
            }
          }
          return client.focus();
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        let url = '/';
        const data = event.notification.data;
        if (data?.entityType && data?.entityId) {
          const routes = {
            project: `/projects/${data.entityId}`,
            invoice: `/invoices/${data.entityId}`,
            order: `/orders/${data.entityId}`,
            salary: `/salaries/${data.entityId}`
          };
          url = routes[data.entityType] || '/';
        }
        return clients.openWindow(url);
      }
    })
  );
});
