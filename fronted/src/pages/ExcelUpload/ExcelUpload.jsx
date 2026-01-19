import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, ArrowLeft, DollarSign, CreditCard, Check, AlertCircle } from "lucide-react";
import api from "../../api/api";

export default function ExcelUpload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelNotes, setExcelNotes] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // בדוק שזה קובץ Excel
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel"
      ];

      if (!validTypes.includes(file.type)) {
        toast.error("נא להעלות קובץ Excel בלבד (.xlsx או .xls)");
        e.target.value = "";
        return;
      }

      setExcelFile(file);
      setUploadResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile) {
      toast.error("נא להעלות קובץ Excel");
      return;
    }

    setLoading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", excelFile);
      formData.append("notes", excelNotes);

      const response = await api.post("/incomes/upload-excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = response.data;
      setUploadResult({
        success: true,
        incomes: result.data?.incomes?.length || 0,
        expenses: result.data?.expenses?.length || 0,
        message: result.message,
      });

      toast.success(response.data.message || "קובץ הועלה בהצלחה!");
      setExcelFile(null);
      setExcelNotes("");
      // Reset the file input
      const fileInput = document.getElementById("excel-file");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error uploading Excel:", error);
      setUploadResult({
        success: false,
        message: error.response?.data?.message || "שגיאה בהעלאת קובץ Excel",
      });
      toast.error(error.response?.data?.message || "שגיאה בהעלאת קובץ Excel");
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleFile = () => {
    const csv = 'תאריך,זכות,חובה,תיאור,אסמכתא\n01/01/2026,5000,,תשלום מלקוח א,12345\n05/01/2026,,3500,תשלום לספק,67890\n10/01/2026,2000,,העברה בנקאית,11111\n15/01/2026,,1500,תשלום חשמל,22222';
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'דוגמה_הכנסות_הוצאות.csv';
    link.click();
    toast.success('קובץ דוגמה הורד בהצלחה!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                    <FileSpreadsheet className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      העלאת אקסל
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      העלה קובץ Excel עם הכנסות והוצאות
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">חזרה</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-white/50">
            {/* הוראות */}
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-blue-900">הוראות:</h3>
                <button
                  type="button"
                  onClick={downloadSampleFile}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📥 הורד קובץ דוגמה
                </button>
              </div>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• <strong>חובה:</strong> הקובץ צריך להכיל את העמודות הבאות:
                  <ul className="mr-4 mt-1 space-y-1">
                    <li>- <strong>תאריך</strong> (או Date/ת.ערך/תאריך ערך)</li>
                    <li>- <strong>זכות</strong> (סכום הכנסה - יילך להכנסות)</li>
                    <li>- <strong>חובה</strong> (סכום הוצאה - יילך להוצאות)</li>
                    <li>- <strong>תיאור</strong> (או Description/פרטים/הערות)</li>
                    <li>- <strong>אסמכתא</strong> (אופציונלי - מספר אסמכתא/Reference)</li>
                  </ul>
                </li>
                <li>• לחצי על &quot;הורד קובץ דוגמה&quot; למעלה כדי לקבל תבנית מוכנה</li>
                <li>• ניתן להוסיף הערות כלליות שיתווספו לכל הרשומות</li>
                <li>• <strong>כל שורה עם סכום ב"זכות"</strong> תיווצר <strong className="text-green-700">הכנסה</strong></li>
                <li>• <strong>כל שורה עם סכום ב"חובה"</strong> תיווצר <strong className="text-red-700">הוצאה</strong></li>
              </ul>
            </div>

            {/* תוצאת העלאה */}
            {uploadResult && (
              <div className={`mb-6 p-4 rounded-xl ${uploadResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {uploadResult.success ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  <span className={`font-bold ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {uploadResult.message}
                  </span>
                </div>
                {uploadResult.success && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-800">{uploadResult.incomes} הכנסות</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-800">{uploadResult.expenses} הוצאות</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              {/* העלאת קובץ */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  קובץ Excel *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-file"
                  />
                  <label
                    htmlFor="excel-file"
                    className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-orange-500" />
                    <span className="font-medium text-slate-700">
                      {excelFile ? excelFile.name : "לחץ להעלאת קובץ Excel"}
                    </span>
                  </label>
                </div>
              </div>

              {/* הערות כלליות */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  הערות כלליות
                </label>
                <textarea
                  value={excelNotes}
                  onChange={(e) => setExcelNotes(e.target.value)}
                  placeholder="הערות שיתווספו לכל ההכנסות וההוצאות..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4 justify-end">
              {uploadResult?.success && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/incomes")}
                    className="px-6 py-3 bg-green-100 text-green-700 font-bold rounded-xl hover:bg-green-200 transition-all flex items-center gap-2"
                  >
                    <DollarSign className="w-5 h-5" />
                    צפה בהכנסות
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/expenses")}
                    className="px-6 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-all flex items-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    צפה בהוצאות
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {loading ? "מעלה..." : "העלה קובץ"}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Links */}
        <div className="mt-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
          <h3 className="text-lg font-bold text-slate-800 mb-4">קיצורים</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/create-income")}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all"
            >
              <DollarSign className="w-4 h-4" />
              יצירת הכנסה ידנית
            </button>
            <button
              onClick={() => navigate("/create-expense")}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              יצירת הוצאה ידנית
            </button>
            <button
              onClick={() => navigate("/incomes")}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
            >
              הצגת הכנסות
            </button>
            <button
              onClick={() => navigate("/expenses")}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
            >
              הצגת הוצאות
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
