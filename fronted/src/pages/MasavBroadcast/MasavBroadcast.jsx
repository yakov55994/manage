import { useState, useEffect, useRef } from "react";
import { Upload, Download, Trash2, ChevronDown, ChevronUp, FileText, Plus, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../api/api";

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${MONTHS_HE[parseInt(month, 10) - 1]} ${year}`;
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MasavBroadcast() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    notes: "",
    files: [],
  });

  const fileInputRef = useRef(null);

  const fetchRecords = async () => {
    try {
      const res = await api.get("/masav-broadcast");
      setRecords(res.data.data || []);
    } catch {
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const grouped = records.reduce((acc, rec) => {
    if (!acc[rec.month]) acc[rec.month] = [];
    acc[rec.month].push(rec);
    return acc;
  }, {});

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const toggleMonth = (month) =>
    setExpandedMonths((prev) => ({ ...prev, [month]: !prev[month] }));

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
      setForm((f) => ({ ...f, files: [...f.files, ...newFiles] }));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== index) }));
  };

  const resetForm = () => {
    setForm({ month: new Date().toISOString().slice(0, 7), notes: "", files: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUpload = async () => {
    if (form.files.length === 0 || !form.month) { toast.error("יש לבחור קובץ וחודש"); return; }
    setUploading(true);
    try {
      for (const file of form.files) {
        const base64 = await readFileAsBase64(file);
        await api.post("/masav-broadcast/upload", {
          month: form.month,
          fileName: file.name,
          fileBase64: base64,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          notes: form.notes,
        });
      }
      toast.success(form.files.length === 1 ? "הקובץ הועלה בהצלחה" : `${form.files.length} קבצים הועלו בהצלחה`);
      setUploadModal(false);
      setExpandedMonths((prev) => ({ ...prev, [form.month]: true }));
      resetForm();
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || "שגיאה בהעלאת הקובץ");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const res = await api.get(`/masav-broadcast/${id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("שגיאה בהורדת הקובץ");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/masav-broadcast/${id}`);
      toast.success("הקובץ נמחק בהצלחה");
      setDeleteConfirm(null);
      fetchRecords();
    } catch {
      toast.error("שגיאה במחיקת הקובץ");
    }
  };

  return (
    <div dir="rtl" className="max-w-4xl mx-auto p-4">
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מסב ששודר</h1>
          <p className="text-slate-500 text-sm mt-1">קבצי מסב שנשלחו לבנק, מסודרים לפי חודשים</p>
        </div>
        <button
          onClick={() => setUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg"
        >
          <Plus size={18} />
          העלאת קובץ
        </button>
      </div>

      {/* תוכן */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedMonths.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 text-center py-20">
          <FileText size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg text-slate-500">אין קבצים עדיין</p>
          <p className="text-sm text-slate-400 mt-1">לחץ על "העלאת קובץ" כדי להוסיף קובץ מסב ששודר</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMonths.map((month) => {
            const isOpen = expandedMonths[month];
            const files = grouped[month];
            return (
              <div
                key={month}
                className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg overflow-hidden"
              >
                {/* כותרת חודש */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-800">
                      {formatMonthLabel(month)}
                    </span>
                    <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                      {files.length} {files.length === 1 ? "קובץ" : "קבצים"}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} className="text-orange-500" />
                  ) : (
                    <ChevronDown size={18} className="text-orange-500" />
                  )}
                </button>

                {/* רשימת קבצים */}
                {isOpen && (
                  <div className="border-t border-slate-200 divide-y divide-slate-100">
                    {files.map((rec) => (
                      <div
                        key={rec._id}
                        className="flex items-center justify-between px-5 py-3 hover:bg-orange-50/40 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={18} className="text-orange-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {rec.fileName}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatFileSize(rec.fileSize)}
                              {rec.notes && (
                                <span className="mr-2">• {rec.notes}</span>
                              )}
                              <span className="mr-2">• {rec.uploadedBy?.userName}</span>
                              <span className="mr-2">
                                • {new Date(rec.uploadedAt).toLocaleDateString("he-IL")}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 mr-4">
                          <button
                            onClick={() => handleDownload(rec._id, rec.fileName)}
                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-all"
                            title="הורדה"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(rec)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-all"
                            title="מחיקה"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* מודל העלאה */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div dir="rtl" className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">העלאת קובץ מסב ששודר</h2>
              <button
                onClick={() => { setUploadModal(false); resetForm(); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* בחירת חודש */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  חודש <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={form.month}
                  onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border-2 border-orange-200 rounded-xl text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* בחירת קבצים */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  קבצים <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/30 transition-all"
                >
                  <Upload size={22} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-sm text-slate-500">לחץ להוספת קבצים</p>
                </div>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                {form.files.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {form.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-orange-500 flex-shrink-0" />
                          <span className="text-sm text-slate-800 font-medium truncate">{file.name}</span>
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0 mr-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* הערות */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  הערות (אופציונלי)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="לדוגמה: מסב חלקי עם 5 ספקים"
                  className="w-full px-4 py-2.5 bg-white border-2 border-orange-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button
                onClick={handleUpload}
                disabled={uploading || form.files.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                {uploading ? "מעלה..." : "העלאה"}
              </button>
              <button
                onClick={() => { setUploadModal(false); resetForm(); }}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* אישור מחיקה */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div dir="rtl" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200">
            <Trash2 size={36} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">מחיקת קובץ</h3>
            <p className="text-slate-500 text-sm mb-5">
              האם למחוק את <span className="text-slate-800 font-medium">{deleteConfirm.fileName}</span>?
              <br />פעולה זו אינה ניתנת לביטול.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
