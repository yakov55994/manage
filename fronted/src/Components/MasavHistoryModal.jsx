import { useState, useEffect } from "react";
import { X, Download, FileText, Calendar, DollarSign, Users, RefreshCw } from "lucide-react";
import api from "../api/api.js";
import { toast } from "sonner";

export default function MasavHistoryModal({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/masav/history");
      setHistory(data.data || []);
    } catch (err) {
      console.error("Error fetching MASAV history:", err);
      toast.error("שגיאה בטעינת היסטוריית מסב", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record) => {
    try {
      setDownloading(record._id);
      const res = await api.get(`/masav/history/${record._id}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = record.fileName || "masav.zip";
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("הקובץ ירד בהצלחה", {
        className: "sonner-toast success rtl",
      });
    } catch (err) {
      console.error("Error downloading MASAV file:", err);
      toast.error("שגיאה בהורדת הקובץ", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amountInAgorot) => {
    const shekel = (amountInAgorot || 0) / 100;
    return shekel.toLocaleString("he-IL", { minimumFractionDigits: 0 });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                היסטוריית קבצי מסב
              </h2>
              <p className="text-orange-100 text-sm mt-1">
                כל קבצי המסב שהופקו במערכת
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              title="רענן"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">אין היסטוריית מסב</p>
              <p className="text-sm mt-1">קבצי מסב שיופקו יופיעו כאן</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record._id}
                  className="border-2 border-orange-100 rounded-xl p-4 hover:border-orange-300 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-slate-800 text-lg">
                          {record.fileName || "קובץ מסב"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          <span>ביצוע: {formatDate(record.executionDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>הופק: {formatDateTime(record.generatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span>{record.totalPayments} תשלומים</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span>{formatAmount(record.totalAmount)} ₪</span>
                        </div>
                      </div>

                      {record.generatedBy?.userName && (
                        <div className="text-xs text-slate-400 mt-2">
                          הופק ע"י: {record.generatedBy.userName}
                        </div>
                      )}

                      {/* פירוט ספקים */}
                      {record.payments && record.payments.length > 0 && (
                        <details className="mt-3">
                          <summary className="text-sm text-orange-600 cursor-pointer hover:text-orange-700 font-medium">
                            הצג פירוט ספקים ({record.payments.length})
                          </summary>
                          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="text-right p-2 font-medium text-slate-600">#</th>
                                  <th className="text-right p-2 font-medium text-slate-600">ספק</th>
                                  <th className="text-right p-2 font-medium text-slate-600">חשבוניות</th>
                                  <th className="text-right p-2 font-medium text-slate-600">סכום</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.payments.map((p, i) => (
                                  <tr key={i} className="border-t border-slate-100">
                                    <td className="p-2 text-slate-500">{i + 1}</td>
                                    <td className="p-2 font-medium">{p.supplierName}</td>
                                    <td className="p-2 text-slate-500">{p.invoiceNumbers || "—"}</td>
                                    <td className="p-2 font-bold text-green-700">
                                      {formatAmount(p.amount)} ₪
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>

                    {/* DOWNLOAD BUTTON */}
                    <button
                      onClick={() => handleDownload(record)}
                      disabled={downloading === record._id}
                      className="flex-shrink-0 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      {downloading === record._id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      <span className="hidden sm:inline">הורד</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t bg-orange-50/50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">
              {history.length} קבצים בהיסטוריה
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-slate-700"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
