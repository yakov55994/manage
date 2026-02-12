import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import {
  ArrowRight,
  Edit2,
  Trash2,
  User,
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  AlertCircle,
  Users,
  CreativeCommons,
  Link2,
  TrendingDown,
} from "lucide-react";

export default function SalaryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkedExpenses, setLinkedExpenses] = useState([]);

  useEffect(() => {
    fetchSalary();
  }, []);

  const fetchSalary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/salaries/${id}`);
      setSalary(res.data.data);

      // טען הוצאות משויכות למשכורת זו
      try {
        const expensesRes = await api.get("/expenses");
        const allExpenses = expensesRes.data?.data || [];
        const linked = allExpenses.filter(exp =>
          exp.linkedSalaries?.some(sal =>
            (sal._id || sal) === id
          )
        );
        setLinkedExpenses(linked);
      } catch (expErr) {
        console.error("שגיאה בטעינת הוצאות משויכות:", expErr);
      }
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינת משכורת");
      navigate("/salaries");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!salary?._id) return;

    try {
      setDeleting(true);
      await api.delete(`/salaries/${id}`);
      toast.success("המשכורת נמחקה בהצלחה");
      navigate("/salaries");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקת משכורת");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const formatCurrency = (num) => {
    if (!num) return "₪0";
    return `₪${Number(num).toLocaleString("he-IL")}`;
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
        <h1 className="mt-8 font-bold text-xl sm:text-2xl md:text-3xl text-slate-900">
          טוען משכורת...
        </h1>
      </div>
    );
  }

  if (!salary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 mb-4 sm:mb-5 md:mb-6">משכורת לא נמצאה</h1>
        <button
          onClick={() => navigate("/salaries")}
            className="w-44 p-4 rounded-xl bg-orange-600 text-white font-bold shadow-xl ml-5"
        >
          חזור לרשימה
        </button>
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

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* HEADER */}
        <div className="relative mb-8">
          <div className="absolute -inset-6 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">
                    פרטי משכורת
                  </h1>
                  <p className="text-sm font-medium text-slate-600 mt-1">
                    {salary.employeeName}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/salaries/${id}/edit`)}
            className="group px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all flex items-center gap-3"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>עריכה</span>
                </button>

                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold rounded-xl hover:from-red-700 hover:to-pink-700 transition-all shadow-xl shadow-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>מחיקה</span>
                </button>

                <button
                  onClick={() => navigate("/salaries")}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזרה</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS CARD */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:p-5 md:p-6">
              {/* Employee Name */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-bold text-orange-600">שם עובד</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                  {salary.employeeName}
                </p>
              </div>

              {/* Department */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-600">מחלקה</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                  {salary.department || "—"}
                </p>
              </div>

              {/* Project */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-600">פרויקט</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                  {salary.projectId?.name || "—"}
                </p>
              </div>

              {/* Date */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-bold text-orange-600">תאריך</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                  {formatDate(salary.date)}
                </p>
              </div>

              {/* Base Amount */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-600">שכר בסיס (ברוטו)</span>
                </div>
                <p className="text-2xl font-black bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  {formatCurrency(salary.baseAmount)}
                </p>
              </div>

              {/* Net Amount */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-600">נטו</span>
                </div>
                <p className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {salary.netAmount ? formatCurrency(salary.netAmount) : "—"}
                </p>
              </div>

              {/* Overhead */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-600">תקורה</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                  {salary.overheadPercent || 0}%
                </p>
              </div>
            {/* Final Amount - Full Width */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-600">סכום סופי</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                 {formatCurrency(salary.finalAmount)}
                </p>
              </div>
            {/* Created By */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <CreativeCommons className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-600">נוצר על ידי</span>
                </div>
                <p className="text-xl font-black text-slate-900">
                  {salary.createdByName}
                </p>
              </div>
            </div>

            {/* הוצאות משויכות */}
            {linkedExpenses.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                  <Link2 className="w-5 h-5 text-orange-600" />
                  <span className="text-lg font-bold text-orange-800">הוצאות משויכות</span>
                </div>
                <div className="space-y-2">
                  {linkedExpenses.map((expense) => (
                    <div
                      key={expense._id}
                      className="p-3 bg-white rounded-xl border border-orange-200 cursor-pointer hover:bg-orange-50 transition-colors"
                      onClick={() => navigate(`/expense/${expense._id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                          <div>
                            <span className="font-bold text-slate-900">
                              {expense.description}
                            </span>
                            <span className="text-slate-600 mr-2 text-sm">
                              ({formatDate(expense.date)})
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">אישור מחיקה</h3>
            </div>

            <p className="text-slate-600 mb-4 sm:mb-5 md:mb-6">
              האם אתה בטוח שברצונך למחוק את משכורת <b>{salary.employeeName}</b>?
              <br />
              פעולה זו אינה ניתנת לביטול.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
              >
                {deleting ? "מוחק..." : "מחק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
