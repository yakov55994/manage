import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Plus, ArrowLeft, DollarSign } from "lucide-react";
import api from "../../api/api";
import OrderSelector from "../../Components/OrderSelector";
import { logClientError } from "../../utils/validation.jsx";

export default function CreateIncome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("single"); // "single" or "excel"

  // טופס הכנסה בודדת
  const [singleIncome, setSingleIncome] = useState({
    date: "",
    amount: "",
    description: "",
    notes: "",
    orderId: null,
    isCredited: "לא",
  });

  // העלאת Excel
  const [excelFile, setExcelFile] = useState(null);
  const [excelNotes, setExcelNotes] = useState("");

  const handleSingleIncomeChange = (field, value) => {
    setSingleIncome(prev => ({ ...prev, [field]: value }));
  };

  // טיפול בבחירת הזמנה
  const handleOrderSelect = (order) => {
    if (order) {
      // שויכו להזמנה - עדכן שדות אוטומטית
      setSingleIncome(prev => ({
        ...prev,
        orderId: order._id,
        isCredited: "כן",
        // התאריך תשלום יהיה תאריך הזיכוי (תאריך ההכנסה הנוכחי או התאריך שהמשתמש בחר)
        // אם עדיין לא בחר תאריך, נשתמש בתאריך של היום
        date: prev.date || new Date().toISOString().split("T")[0],
      }));
    } else {
      // ביטול שיוך
      setSingleIncome(prev => ({
        ...prev,
        orderId: null,
        isCredited: "לא",
      }));
    }
  };

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
    }
  };

  const handleSubmitSingle = async (e) => {
    e.preventDefault();

    const errToast = (msg) => {
      logClientError(msg, 'יצירת תנועת זכות');
      toast.error(msg);
    };

    if (!singleIncome.date) {
      errToast("יש לבחור תאריך");
      return;
    }

    if (!singleIncome.amount?.trim()) {
      errToast("יש להזין סכום");
      return;
    }

    if (!singleIncome.description?.trim()) {
      errToast("יש להזין תיאור");
      return;
    }

    setLoading(true);

    try {
      // צור הכנסה חדשה
      await api.post("/incomes", singleIncome);

      // אם יש שיוך להזמנה, עדכן את ההזמנה
      if (singleIncome.orderId) {
        console.log('🔗 Creating income with order link:', singleIncome.orderId);
        try {
          const orderRes = await api.get(`/orders/${singleIncome.orderId}`);
          const orderData = orderRes.data?.data || orderRes.data;

          await api.put(`/orders/${singleIncome.orderId}`, {
            ...orderData,
            projectId: typeof orderData.projectId === 'object'
              ? (orderData.projectId._id || orderData.projectId.$oid)
              : orderData.projectId,
            supplierId: typeof orderData.supplierId === 'object'
              ? (orderData.supplierId?._id || orderData.supplierId?.$oid)
              : orderData.supplierId,
            isCredited: true,
            creditDate: singleIncome.date,
          });
          console.log('✅ Order marked as credited');
        } catch (err) {
          console.error('Error updating order:', err);
          toast.warning("ההכנסה נוצרה אך ההזמנה לא עודכנה");
        }
      }

      toast.success("ההכנסה נוצרה בהצלחה!");
      navigate("/incomes");
    } catch (error) {
      console.error("Error creating income:", error);
      toast.error(error.response?.data?.message || "שגיאה ביצירת הכנסה");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExcel = async (e) => {
    e.preventDefault();

    if (!excelFile) {
      toast.error("נא להעלות קובץ Excel");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", excelFile);
      formData.append("notes", excelNotes);

      const response = await api.post("/incomes/upload-excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data.message || "הכנסות נוצרו בהצלחה!");
      navigate("/incomes");
    } catch (error) {
      console.error("Error uploading Excel:", error);
      toast.error(error.response?.data?.message || "שגיאה בהעלאת קובץ Excel");
    } finally {
      setLoading(false);
    }
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
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      יצירת הכנסה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      הוסף הכנסה בודדת או העלה קובץ Excel
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/incomes")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">חזרה</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Method Selection */}
        <div className="mb-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/50">
            <div className="flex gap-2">
              <button
                onClick={() => setUploadMethod("single")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                  uploadMethod === "single"
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                <Plus className="w-5 h-5" />
                הכנסה בודדת
              </button>
              <button
                onClick={() => setUploadMethod("excel")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                  uploadMethod === "excel"
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                העלאת Excel
              </button>
            </div>
          </div>
        </div>

        {/* Single Income Form */}
        {uploadMethod === "single" && (
          <form onSubmit={handleSubmitSingle}>
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-white/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* תאריך */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    תאריך *
                  </label>
                  <input
                    type="date"
                    value={singleIncome.date}
                    onChange={(e) => handleSingleIncomeChange("date", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                    required
                  />
                </div>

                {/* סכום */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    סכום (זכות) *
                  </label>
                  <input
                    type="text"
                    value={singleIncome.amount}
                    onChange={(e) => handleSingleIncomeChange("amount", e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                    required
                  />
                </div>

                {/* תיאור */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    תיאור *
                  </label>
                  <textarea
                    value={singleIncome.description}
                    onChange={(e) => handleSingleIncomeChange("description", e.target.value)}
                    placeholder="תיאור ההכנסה"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                    required
                  />
                </div>

                {/* שיוך להזמנה */}
                <div className="md:col-span-2">
                  <OrderSelector
                    value={singleIncome.orderId}
                    onSelect={handleOrderSelect}
                    label="שיוך להזמנה (אופציונלי)"
                    placeholder="בחר הזמנה..."
                    allowClear={true}
                  />
                </div>

                {/* האם זוכה - לקריאה בלבד */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    האם זוכה
                  </label>
                  <div className={`px-4 py-3 border-2 rounded-xl ${
                    singleIncome.isCredited === "כן"
                      ? "border-green-300 bg-green-50 text-green-800 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}>
                    {singleIncome.isCredited}
                    {singleIncome.isCredited === "כן" && (
                      <span className="text-xs text-green-600 mr-2">
                        (משוייך להזמנה)
                      </span>
                    )}
                  </div>
                </div>

                {/* הערות */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    הערות
                  </label>
                  <textarea
                    value={singleIncome.notes}
                    onChange={(e) => handleSingleIncomeChange("notes", e.target.value)}
                    placeholder="הערות נוספות..."
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg"
                >
                  {loading ? "שומר..." : "שמור הכנסה"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Excel Upload Form */}
        {uploadMethod === "excel" && (
          <form onSubmit={handleSubmitExcel}>
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-white/50">
              {/* הוראות */}
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-blue-900">הוראות:</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = 'תאריך,זכות,תיאור\n01/01/2026,5000,תשלום מלקוח א\n05/01/2026,3500,העברה בנקאית\n10/01/2026,2000,תשלום עבור שירותים';
                      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'דוגמה_הכנסות.csv';
                      link.click();
                      toast.success('קובץ דוגמה הורד בהצלחה!');
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📥 הורד קובץ דוגמה
                  </button>
                </div>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>חובה:</strong> הקובץ צריך להכיל 3 עמודות:
                    <ul className="mr-4 mt-1 space-y-1">
                      <li>- <strong>תאריך</strong> (או Date/ת.ערך/תאריך ערך)</li>
                      <li>- <strong>זכות</strong> (או סכום/Amount/Debit)</li>
                      <li>- <strong>תיאור</strong> (או Description/פרטים/הערות)</li>
                    </ul>
                  </li>
                  <li>• לחצי על &quot;הורד קובץ דוגמה&quot; למעלה כדי לקבל תבנית מוכנה</li>
                  <li>• ניתן להוסיף הערות כלליות שיתווספו לכל ההכנסות</li>
                  <li>• כל שורה בקובץ תהפוך להכנסה נפרדת</li>
                  <li className="text-red-700 font-bold">⚠️ אל תעלי ישירות ייצוא מהבנק - צריך להעתיק את הנתונים לקובץ הדוגמה</li>
                </ul>
              </div>

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
                    placeholder="הערות שיתווספו לכל ההכנסות..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  {loading ? "מעלה..." : "העלה והמשך"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
