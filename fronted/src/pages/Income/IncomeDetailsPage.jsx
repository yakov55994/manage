import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import {
  DollarSign,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  ArrowRight,
  StickyNote,
  Link as LinkIcon,
} from "lucide-react";
import InvoiceSelector from "../../Components/InvoiceSelector";

const IncomeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  useEffect(() => {
    const loadIncome = async () => {
      try {
        const res = await api.get(`/incomes/${id}`);
        const data = res.data?.data;

        if (!data) {
          setLoading(false);
          return;
        }

        setIncome(data);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת ההכנסה");
        navigate("/incomes");
      } finally {
        setLoading(false);
      }
    };

    loadIncome();
  }, [id, navigate]);

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("he-IL");
  };

  const formatCurrency = (num) => {
    if (!num) return "₪0";
    return `₪${parseFloat(num).toLocaleString("he-IL")}`;
  };

  const handleDelete = async () => {
    if (!income?._id) return;

    try {
      setDeleting(true);
      await api.delete(`/incomes/${income._id}`);
      toast.success("ההכנסה נמחקה בהצלחה");
      navigate("/incomes");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקת ההכנסה");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleLinkToInvoice = async (invoice) => {
    if (!invoice) {
      setLinkModalOpen(false);
      return;
    }

    try {
      setLinking(true);
      await api.put(`/incomes/${income._id}`, {
        invoiceId: invoice._id,
        isCredited: "כן",
        date: income.date, // שמירת תאריך הזיכוי המקורי
        amount: income.amount,
        description: income.description,
        notes: income.notes,
      });
      toast.success("ההכנסה שויכה להזמנה בהצלחה!");

      // רענון הנתונים
      const res = await api.get(`/incomes/${income._id}`);
      setIncome(res.data?.data);
      setLinkModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשיוך ההכנסה להזמנה");
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-2xl text-slate-900">
          טוען הכנסה...
        </h1>
      </div>
    );
  }

  if (!income) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="text-center">
          <DollarSign className="w-20 h-20 mx-auto mb-4 text-orange-400" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            הכנסה לא נמצאה
          </h2>
          <button
            onClick={() => navigate("/incomes")}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all"
          >
            חזרה להכנסות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-6 md:p-8 border border-white/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      פרטי הכנסה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {formatDate(income.date)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/incomes")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span className="hidden sm:inline">חזרה</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Amount Card */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50 text-center">
              <div className="text-sm font-bold text-slate-600 mb-2">
                סכום
              </div>
              <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {formatCurrency(income.amount)}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Date */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-600 mb-1">
                  תאריך
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {formatDate(income.date)}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice & Status */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-600 mb-1">
                  הזמנה
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {income.invoiceNumber ? `הזמנה #${income.invoiceNumber}` : "—"}
                </div>
                {income.isCredited && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      income.isCredited === "כן"
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : "bg-slate-100 text-slate-600 border border-slate-300"
                    }`}>
                      {income.isCredited === "כן" ? "זוכה ✓" : "לא זוכה"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-600 mb-2">
                תיאור
              </div>
              <div className="text-lg text-slate-900">
                {income.description || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {income.notes && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-md">
                <StickyNote className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-600 mb-2">
                  הערות
                </div>
                <div className="text-lg text-slate-900 whitespace-pre-wrap">
                  {income.notes}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* כפתור שיוך להזמנה */}
            <button
              onClick={() => setLinkModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
            >
              <LinkIcon className="w-5 h-5" />
              {income.invoiceId ? "שנה הזמנה" : "שייך להזמנה"}
            </button>

            <button
              onClick={() => navigate(`/update-income/${income._id}`)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg"
            >
              <Edit2 className="w-5 h-5" />
              ערוך הכנסה
            </button>

            <button
              onClick={() => setConfirmOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
            >
              <Trash2 className="w-5 h-5" />
              מחק הכנסה
            </button>
          </div>
        </div>
      </div>

      {/* Link to Invoice Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                  <LinkIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  שיוך הכנסה להזמנה
                </h3>
                <p className="text-slate-600">
                  בחר הזמנה לשיוך ההכנסה אליה. ההכנסה תסומן כ"זוכה" אוטומטית.
                </p>
              </div>

              <div className="mb-6">
                <InvoiceSelector
                  value={selectedInvoiceId}
                  onSelect={(invoice) => setSelectedInvoiceId(invoice?._id || null)}
                  label="בחר הזמנה"
                  placeholder="חפש הזמנה לפי מספר או פרטים..."
                  allowClear={true}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const invoice = selectedInvoiceId ? { _id: selectedInvoiceId } : null;
                    handleLinkToInvoice(invoice);
                  }}
                  disabled={linking || !selectedInvoiceId}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {linking ? "משייך..." : "שייך להזמנה"}
                </button>
                <button
                  onClick={() => {
                    setLinkModalOpen(false);
                    setSelectedInvoiceId(null);
                  }}
                  disabled={linking}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  האם אתה בטוח?
                </h3>
                <p className="text-slate-600">
                  פעולה זו תמחק את ההכנסה לצמיתות ולא ניתן לשחזר אותה.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg disabled:opacity-50"
                >
                  {deleting ? "מוחק..." : "מחק"}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeDetailsPage;
