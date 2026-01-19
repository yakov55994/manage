import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { TrendingDown, Edit2, Trash2, ArrowRight, Calendar, FileText, Hash, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";

export default function ExpenseDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await api.get(`/expenses/${id}`);
      setExpense(response.data?.data);
    } catch (err) {
      console.error("Fetch expense error:", err);
      toast.error("שגיאה בטעינת ההוצאה");
      navigate("/expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/expenses/${id}`);
      toast.success("ההוצאה נמחקה בהצלחה");
      navigate("/expenses");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("שגיאה במחיקת הוצאה");
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const formatCurrency = (num) => {
    if (!num) return "₪0";
    return `₪${parseFloat(num).toLocaleString("he-IL")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-2xl text-slate-900">טוען הוצאה...</h1>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="text-center">
          <TrendingDown className="w-20 h-20 mx-auto mb-4 text-orange-400" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            הוצאה לא נמצאה
          </h2>
          <button
            onClick={() => navigate("/expenses")}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all"
          >
            חזרה להוצאות
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
                    <TrendingDown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      פרטי הוצאה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/expenses")}
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
                {formatCurrency(expense.amount)}
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
                  {formatDate(expense.date)}
                </div>
              </div>
            </div>
          </div>

          {/* אסמכתא */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-600 mb-1">
                  אסמכתא
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {expense.reference || "—"}
                </div>
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
                {expense.description || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* סוג פעולה ויתרה */}
        {(expense.transactionType || expense.balance) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* סוג פעולה */}
            {expense.transactionType && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-600 mb-1">
                      סוג פעולה
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {expense.transactionType}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* יתרה */}
            {expense.balance && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-md">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-600 mb-1">
                      יתרה
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {expense.balance}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
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
                  {expense.notes}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* פרטי יצירה */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50 mb-6">
          <div className="text-sm text-slate-500 space-y-1">
            <p>נוצר על ידי: <span className="font-medium text-slate-700">{expense.createdByName || "לא ידוע"}</span></p>
            <p>תאריך יצירה: <span className="font-medium text-slate-700">{formatDate(expense.createdAt)}</span></p>
            {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
              <p>עודכן לאחרונה: <span className="font-medium text-slate-700">{formatDate(expense.updatedAt)}</span></p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(`/update-expense/${expense._id}`)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg"
            >
              <Edit2 className="w-5 h-5" />
              ערוך הוצאה
            </button>

            <button
              onClick={() => setDeleteModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              <Trash2 className="w-5 h-5" />
              מחק הוצאה
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  האם אתה בטוח?
                </h3>
                <p className="text-slate-600">
                  פעולה זו תמחק את ההוצאה לצמיתות ולא ניתן לשחזר אותה.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50"
                >
                  {deleting ? "מוחק..." : "מחק"}
                </button>
                <button
                  onClick={() => setDeleteModal(false)}
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
}
