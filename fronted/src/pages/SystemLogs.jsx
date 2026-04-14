import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  LogIn,
  LogOut,
  AlertTriangle,
  Info,
  XCircle,
  RefreshCw,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import api from "../api/api";

const LOG_TYPES = [
  { value: "all", label: "הכל", color: "bg-gray-100 text-gray-700" },
  { value: "login_success", label: "כניסה מוצלחת", color: "bg-green-100 text-green-700" },
  { value: "login_failed", label: "כניסה כשלה", color: "bg-red-100 text-red-700" },
  { value: "logout", label: "יציאה", color: "bg-blue-100 text-blue-700" },
  { value: "error", label: "שגיאה", color: "bg-orange-100 text-orange-700" },
  { value: "info", label: "מידע", color: "bg-purple-100 text-purple-700" },
];

const TYPE_CONFIG = {
  login_success: {
    icon: LogIn,
    label: "כניסה מוצלחת",
    rowClass: "bg-green-50 border-l-4 border-green-400",
    badgeClass: "bg-green-100 text-green-700",
  },
  login_failed: {
    icon: XCircle,
    label: "כניסה כשלה",
    rowClass: "bg-red-50 border-l-4 border-red-400",
    badgeClass: "bg-red-100 text-red-700",
  },
  logout: {
    icon: LogOut,
    label: "יציאה",
    rowClass: "bg-blue-50 border-l-4 border-blue-400",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  error: {
    icon: AlertTriangle,
    label: "שגיאה",
    rowClass: "bg-orange-50 border-l-4 border-orange-400",
    badgeClass: "bg-orange-100 text-orange-700",
  },
  info: {
    icon: Info,
    label: "מידע",
    rowClass: "bg-purple-50 border-l-4 border-purple-400",
    badgeClass: "bg-purple-100 text-purple-700",
  },
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const LIMIT = 50;

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: LIMIT, page };
      if (typeFilter !== "all") params.type = typeFilter;
      const { data } = await api.get("/logs", { params });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("שגיאה בטעינת לוגים", { className: "sonner-toast error rtl" });
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // איפוס עמוד בעת שינוי פילטר
  const handleTypeChange = (value) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleClearLogs = async () => {
    try {
      await api.delete("/logs");
      toast.success("הלוגים נמחקו בהצלחה", { className: "sonner-toast success rtl" });
      setLogs([]);
      setTotal(0);
      setConfirmClear(false);
    } catch {
      toast.error("שגיאה במחיקת לוגים", { className: "sonner-toast error rtl" });
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div dir="rtl" className="p-4 max-w-6xl mx-auto">
      {/* כותרת */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-800 rounded-lg">
          <Monitor className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">לוגים של המערכת</h1>
          <p className="text-sm text-gray-500">מעקב אחר כניסות, שגיאות ואירועים</p>
        </div>
      </div>

      {/* סרגל כלים */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        {/* פילטרים */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-500" />
          {LOG_TYPES.map((lt) => (
            <button
              key={lt.value}
              onClick={() => handleTypeChange(lt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                typeFilter === lt.value
                  ? "ring-2 ring-offset-1 ring-gray-400 " + lt.color
                  : lt.color + " opacity-60 hover:opacity-100"
              }`}
            >
              {lt.label}
            </button>
          ))}
        </div>

        {/* כפתורים */}
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            רענן
          </button>
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              מחק לוגים
            </button>
          ) : (
            <div className="flex gap-2 items-center bg-red-50 border border-red-300 rounded-lg px-3 py-1.5">
              <span className="text-sm text-red-700 font-medium">בטוח למחוק?</span>
              <button
                onClick={handleClearLogs}
                className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700"
              >
                כן, מחק
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-300"
              >
                ביטול
              </button>
            </div>
          )}
        </div>
      </div>

      {/* סטטיסטיקה */}
      <div className="text-sm text-gray-500 mb-3">
        {loading ? "טוען..." : `סה"כ ${total} רשומות`}
      </div>

      {/* טבלה */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        {logs.length === 0 && !loading ? (
          <div className="text-center py-16 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">אין לוגים להצגה</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const config = TYPE_CONFIG[log.type] || TYPE_CONFIG["info"];
              const Icon = config.icon;
              return (
                <div
                  key={log._id}
                  className={`px-4 py-3 ${config.rowClass} hover:brightness-[0.97] transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeClass}`}>
                          {config.label}
                        </span>
                        {log.username && (
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {log.username}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 mr-auto">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-800">{log.message}</p>
                      {log.ip && log.ip !== "unknown" && (
                        <p className="text-xs text-gray-400 mt-0.5">IP: {log.ip}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* דפדוף */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            עמוד {page} מתוך {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
