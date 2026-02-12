import { useState, useEffect } from "react";
import { DownloadCloud, FileSpreadsheet, FileText, Loader2, Calendar, Database, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../api/api";

const ExportDataPage = () => {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // יצירת רשימת שנים (5 שנים אחורה)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // שליפת סטטוס גיבוי אחרון
  useEffect(() => {
    const fetchBackupStatus = async () => {
      try {
        const { data } = await api.get("/backup/status");
        setBackupStatus(data);
      } catch (error) {
        console.error("Failed to fetch backup status:", error);
      }
    };
    fetchBackupStatus();
  }, []);

  // ייצוא לאקסל
  const handleExportExcel = async () => {
    try {
      setLoadingExcel(true);

      const response = await api.get(`/export/excel?year=${selectedYear}`, {
        responseType: "blob",
      });

      // יצירת URL להורדה
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // שם הקובץ
      const filename = `export_${selectedYear}.xlsx`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`הקובץ יוצא בהצלחה לשנת ${selectedYear}!`, {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("שגיאה בייצוא לאקסל", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoadingExcel(false);
    }
  };

  // ייצוא ל-PDF
  const handleExportPDF = async () => {
    try {
      setLoadingPDF(true);

      const response = await api.get(`/export/pdf?year=${selectedYear}`, {
        responseType: "blob",
      });

      // יצירת URL להורדה
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // שם הקובץ
      const filename = `export_${selectedYear}.pdf`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`הקובץ יוצא בהצלחה לשנת ${selectedYear}!`, {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("שגיאה בייצוא ל-PDF", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoadingPDF(false);
    }
  };

  // גיבוי מלא של מסד הנתונים
  const handleBackup = async () => {
    try {
      setLoadingBackup(true);
      const response = await api.get("/backup/download", {
        responseType: "blob",
        timeout: 300000,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `backup_${date}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("הגיבוי הורד בהצלחה!", {
        className: "sonner-toast success rtl",
      });

      // רענון סטטוס
      try {
        const { data } = await api.get("/backup/status");
        setBackupStatus(data);
      } catch {}
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("שגיאה ביצירת גיבוי", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoadingBackup(false);
    }
  };

  // הורדת גיבוי אוטומטי אחרון
  const handleDownloadLatest = async () => {
    try {
      setLoadingLatest(true);
      const response = await api.get("/backup/download-latest", {
        responseType: "blob",
        timeout: 300000,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `backup_latest.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("הגיבוי האוטומטי הורד בהצלחה!", {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("Download latest error:", error);
      const isNotFound = error.response?.status === 404;
      toast.error(isNotFound ? "אין גיבוי אוטומטי זמין" : "שגיאה בהורדת גיבוי", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoadingLatest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20 p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl shadow-orange-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-lg">
              <DownloadCloud className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                ייצוא נתונים
              </h1>
              <p className="text-orange-100 mt-1">
                ייצוא כל הנתונים במערכת לקובץ Excel או PDF
              </p>
            </div>
          </div>
        </div>

        {/* Year Selector */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-orange-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 mb-1">בחר שנה לייצוא</h3>
              <p className="text-sm text-slate-500">הנתונים יסוננו לפי השנה שתבחר</p>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-6 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Excel Card */}
          <div className="bg-white rounded-3xl shadow-xl border-2 border-orange-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FileSpreadsheet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">ייצוא לאקסל</h2>
                  <p className="text-orange-100 text-sm">קובץ xlsx עם גיליונות</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3 mb-6">
                <p className="text-slate-600 text-sm">
                  הקובץ יכלול את הגיליונות הבאים לשנת <strong>{selectedYear}</strong>:
                </p>
                <ul className="text-sm text-slate-500 space-y-1 mr-4">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    פרויקטים
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    חשבוניות
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    הזמנות
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    ספקים
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    משכורות
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    הכנסות והוצאות
                  </li>
                </ul>
              </div>

              <button
                onClick={handleExportExcel}
                disabled={loadingExcel || loadingPDF}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-bold text-lg hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {loadingExcel ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    מייצא...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-6 h-6" />
                    הורד קובץ Excel לשנת {selectedYear}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PDF Card */}
          <div className="bg-white rounded-3xl shadow-xl border-2 border-orange-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">ייצוא ל-PDF</h2>
                  <p className="text-amber-100 text-sm">דוח סיכום להדפסה</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3 mb-6">
                <p className="text-slate-600 text-sm">
                  הדוח יכלול סיכום לשנת <strong>{selectedYear}</strong>:
                </p>
                <ul className="text-sm text-slate-500 space-y-1 mr-4">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    סיכום כמויות נתונים
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    סיכום פיננסי
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    סה"כ תקציבים
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    סה"כ חשבוניות
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    סה"כ הזמנות
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    סה"כ משכורות
                  </li>
                </ul>
              </div>

              <button
                onClick={handleExportPDF}
                disabled={loadingExcel || loadingPDF}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-2xl font-bold text-lg hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {loadingPDF ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    מייצא...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-6 h-6" />
                    הורד קובץ PDF לשנת {selectedYear}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Backup Card */}
        <div className="mt-6 bg-white rounded-3xl shadow-xl border-2 border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-amber-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Database className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  גיבוי מסד נתונים
                </h2>
                <p className="text-orange-100 text-sm">
                  קבצי Excel + קבצים מ-Cloudinary בקובץ ZIP
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {/* סטטוס גיבוי אחרון */}
            {backupStatus?.lastBackup && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-bold text-orange-800">גיבוי אחרון: </span>
                  <span className="text-orange-700">
                    {new Date(backupStatus.lastBackup.date).toLocaleString("he-IL")}
                    {" "}({backupStatus.lastBackup.type === "scheduled" ? "אוטומטי" : "ידני"})
                  </span>
                  {backupStatus.lastBackup.recordCounts && (
                    <span className="text-orange-600 mr-2">
                      - {Object.values(backupStatus.lastBackup.recordCounts).reduce((a, b) => a + b, 0)} רשומות
                      {backupStatus.lastBackup.filesCount > 0 && `, ${backupStatus.lastBackup.filesCount} קבצים`}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <p className="text-slate-600 text-sm">
                הגיבוי יכלול את <strong>כל</strong> הנתונים כקבצי Excel + כל הקבצים מ-Cloudinary:
              </p>
              <ul className="text-sm text-slate-500 space-y-1 mr-4">
                {[
                  "חשבוניות (Excel + קבצים מצורפים)",
                  "פרויקטים",
                  "ספקים",
                  "הזמנות (Excel + קבצים מצורפים)",
                  "משכורות",
                  "הכנסות",
                  "הוצאות",
                  "משתמשים (ללא סיסמאות)",
                  "הערות",
                  "התראות",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBackup}
                disabled={loadingBackup || loadingLatest}
                className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-2xl font-bold text-lg hover:from-orange-700 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {loadingBackup ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    מייצא גיבוי...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-6 h-6" />
                    הורד גיבוי מלא
                  </>
                )}
              </button>

              {backupStatus?.lastScheduled && (
                <button
                  onClick={handleDownloadLatest}
                  disabled={loadingBackup || loadingLatest}
                  className="py-4 px-6 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-2xl font-bold hover:from-slate-600 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
                  title="הורד גיבוי אוטומטי אחרון"
                >
                  {loadingLatest ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Clock className="w-5 h-5" />
                      אחרון
                    </>
                  )}
                </button>
              )}
            </div>

            {/* הודעה על גיבוי אוטומטי */}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-4 h-4" />
              גיבוי אוטומטי רץ כל יום בחצות
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800 mb-1">טיפ</h3>
              <p className="text-amber-700 text-sm">
                קובץ האקסל מכיל את כל הנתונים המפורטים ומתאים לעבודה ועריכה.
                קובץ ה-PDF מכיל סיכום כללי ומתאים לארכיון והדפסה.
                הגיבוי המלא כולל קבצי Excel עם כל הנתונים + כל הקבצים שהועלו למערכת.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDataPage;
