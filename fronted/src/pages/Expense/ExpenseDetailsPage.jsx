import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { TrendingDown, Edit2, Trash2, ArrowRight, Calendar, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";

export default function ExpenseDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);

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
      await api.delete(`/expenses/${id}`);
      toast.success("ההוצאה נמחקה בהצלחה");
      navigate("/expenses");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("שגיאה במחיקת הוצאה");
    }
  };

  const formatCurrency = (num) => {
    if (!num) return "₪0";
    return `₪${parseFloat(num).toLocaleString("he-IL")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex flex-col justify-center items-center">
        <ClipLoader size={100} color="#ef4444" loading />
        <h1 className="mt-8 font-bold text-2xl text-slate-900">טוען הוצאה...</h1>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex flex-col justify-center items-center">
        <TrendingDown className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="font-bold text-2xl text-slate-900">הוצאה לא נמצאה</h1>
        <button
          onClick={() => navigate("/expenses")}
          className="mt-4 px-6 py-3 bg-red-500 text-white font-bold rounded-xl"
        >
          חזור לרשימה
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-red-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-3xl">
        {/* Header */}
        <header className="mb-8">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-red-500/10 p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg">
                    <TrendingDown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      פרטי הוצאה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {expense.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/expenses")}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span className="hidden sm:inline">חזור</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Details Card */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8">
            {/* Amount */}
            <div className="text-center mb-8">
              <div className="text-5xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                {formatCurrency(expense.amount)}
              </div>
              <p className="text-slate-500 mt-2">סכום ההוצאה</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* תאריך */}
              <div className="bg-red-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-bold">תאריך</span>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {formatDate(expense.date)}
                </p>
              </div>

              {/* תיאור */}
              <div className="bg-red-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-bold">תיאור</span>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {expense.description}
                </p>
              </div>

              {/* אסמכתא */}
              {expense.reference && (
                <div className="bg-red-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <Hash className="w-5 h-5" />
                    <span className="font-bold">אסמכתא</span>
                  </div>
                  <p className="text-lg font-medium text-slate-900">
                    {expense.reference}
                  </p>
                </div>
              )}

              {/* סוג פעולה */}
              {expense.transactionType && (
                <div className="bg-red-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <FileText className="w-5 h-5" />
                    <span className="font-bold">סוג פעולה</span>
                  </div>
                  <p className="text-lg font-medium text-slate-900">
                    {expense.transactionType}
                  </p>
                </div>
              )}
            </div>

            {/* הערות */}
            {expense.notes && (
              <div className="mt-6 bg-red-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-bold">הערות</span>
                </div>
                <p className="text-slate-700">{expense.notes}</p>
              </div>
            )}

            {/* פרטי יצירה */}
            <div className="mt-6 pt-6 border-t border-red-200">
              <div className="text-sm text-slate-500">
                <p>נוצר על ידי: {expense.createdByName || "לא ידוע"}</p>
                <p>תאריך יצירה: {formatDate(expense.createdAt)}</p>
                {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
                  <p>עודכן לאחרונה: {formatDate(expense.updatedAt)}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => navigate(`/update-expense/${expense._id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg"
              >
                <Edit2 className="w-5 h-5" />
                עריכה
              </button>
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-all"
              >
                <Trash2 className="w-5 h-5" />
                מחק
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal && (
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
                  פעולה זו תמחק את ההוצאה לצמיתות ולא ניתן לשחזר אותה.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                >
                  מחק
                </button>
                <button
                  onClick={() => setDeleteModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
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
