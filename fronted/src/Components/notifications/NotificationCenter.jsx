import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X, Wallet, FileText, ShoppingCart, Info, BellRing, BellOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import useSocket from "../../hooks/useSocket";
import usePushNotifications from "../../hooks/usePushNotifications";

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { permission, isSupported, isLoading: pushLoading, requestPermission } = usePushNotifications();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/notifications?limit=20");
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleUnreadCount = ({ unreadCount }) => {
      setUnreadCount(unreadCount);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread_count", handleUnreadCount);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread_count", handleUnreadCount);
    };
  }, [socket]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark as read
  const markAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    try {
      await api.delete("/notifications/all");
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // Navigate based on entity type
    if (notification.entityType && notification.entityId) {
      const routes = {
        project: `/projects/${notification.entityId}`,
        invoice: `/invoices/${notification.entityId}`,
        order: `/orders/${notification.entityId}`,
        salary: `/salaries/${notification.entityId}`
      };

      const route = routes[notification.entityType];
      if (route) {
        navigate(route);
        setIsOpen(false);
      }
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    const icons = {
      budget_threshold: <Wallet className="w-5 h-5 text-amber-500" />,
      payment_status_change: <FileText className="w-5 h-5 text-green-500" />,
      new_invoice: <FileText className="w-5 h-5 text-blue-500" />,
      new_order: <ShoppingCart className="w-5 h-5 text-purple-500" />,
      system_update: <Info className="w-5 h-5 text-gray-500" />
    };
    return icons[type] || <Bell className="w-5 h-5 text-gray-500" />;
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "עכשיו";
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString("he-IL");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-orange-100 transition-colors"
        aria-label="התראות"
      >
        <Bell className={`w-6 h-6 ${isConnected ? "text-gray-700" : "text-gray-400"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <h3 className="font-bold text-gray-900 text-lg">התראות</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                  title="סמן הכל כנקרא"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={deleteAllNotifications}
                  className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                  title="מחק הכל"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mb-3 text-gray-300" />
                <p className="font-medium">אין התראות חדשות</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    !notification.read
                      ? "bg-orange-50 hover:bg-orange-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator / Mark as read */}
                    {!notification.read && (
                      <button
                        onClick={(e) => markAsRead(notification._id, e)}
                        className="flex-shrink-0 p-1 hover:bg-orange-200 rounded-full transition-colors"
                        title="סמן כנקרא"
                      >
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
            {/* Push notification button */}
            {isSupported && permission !== "granted" && (
              <button
                onClick={requestPermission}
                disabled={pushLoading}
                className="w-full flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 px-4 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all font-medium disabled:opacity-50"
              >
                {pushLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                הפעל התראות בדפדפן
              </button>
            )}

            {isSupported && permission === "granted" && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <BellRing className="w-4 h-4" />
                התראות דפדפן פעילות
              </div>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => {
                  fetchNotifications();
                }}
                className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                רענן התראות
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
