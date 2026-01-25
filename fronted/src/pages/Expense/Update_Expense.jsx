import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { TrendingDown, Save, ArrowRight, Calendar, FileText, Link2, Receipt, Briefcase, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import ExpenseLinkModal from "../../Components/ExpenseLinkModal";

export default function UpdateExpense() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    description: "",
    notes: "",
    reference: "",
    transactionType: "",
  });

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await api.get(`/expenses/${id}`);
      const expenseData = response.data?.data;
      if (expenseData) {
        setExpense(expenseData);
        setFormData({
          date: expenseData.date ? new Date(expenseData.date).toISOString().slice(0, 10) : "",
          amount: expenseData.amount || "",
          description: expenseData.description || "",
          notes: expenseData.notes || "",
          reference: expenseData.reference || "",
          transactionType: expenseData.transactionType || "",
        });
      }
    } catch (err) {
      console.error("Fetch expense error:", err);
      toast.error("שגיאה בטעינת ההוצאה");
      navigate("/expenses");
    } finally {
      setLoading(false);
    }
  };

  // טיפול בשמירה מהמודל שיוך
  const handleLinked = (updatedExpense) => {
    setExpense(updatedExpense);
    toast.success("השיוך עודכן בהצלחה!");
  };

  // חישוב מספר השיוכים
  const getLinkCount = () => {
    if (!expense) return 0;
    return (expense.linkedInvoices?.length || 0) +
           (expense.linkedSalaries?.length || 0) +
           (expense.linkedOrders?.length || 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.amount || !formData.description) {
      toast.error("יש למלא תאריך, סכום ותיאור");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/expenses/${id}`, formData);
      toast.success("ההוצאה עודכנה בהצלחה!");
      navigate("/expenses");
    } catch (err) {
      console.error("Update expense error:", err);
      toast.error("שגיאה בעדכון הוצאה");
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-2xl">
        {/* Header */}
        <header className="mb-8">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                    <TrendingDown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      עדכון הוצאה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      ערוך את פרטי ההוצאה
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

        {/* Form */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <form
            onSubmit={handleSubmit}
            className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 space-y-6"
          >
            {/* תאריך */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline ml-2" />
                תאריך *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                required
              />
            </div>

            {/* סכום */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <TrendingDown className="w-4 h-4 inline ml-2" />
                סכום (חובה) *
              </label>
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="הזן סכום..."
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                required
                step="0.01"
              />
            </div>

            {/* תיאור */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline ml-2" />
                תיאור *
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="הזן תיאור..."
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                required
              />
            </div>

            {/* אסמכתא */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                אסמכתא
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="הזן אסמכתא (אופציונלי)..."
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
              />
            </div>

            {/* סוג פעולה */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                סוג פעולה
              </label>
              <input
                type="text"
                name="transactionType"
                value={formData.transactionType}
                onChange={handleChange}
                placeholder="הזן סוג פעולה (אופציונלי)..."
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
              />
            </div>

            {/* הערות */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                הערות
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="הזן הערות (אופציונלי)..."
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all resize-none"
                rows={3}
              />
            </div>

            {/* שיוך לחשבוניות/משכורות/הזמנות */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Link2 className="w-4 h-4 inline ml-2" />
                שיוך לחשבוניות / משכורות / הזמנות
              </label>

              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className="w-full py-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 font-bold hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
              >
                <Link2 className="w-5 h-5" />
                {getLinkCount() > 0 ? `${getLinkCount()} פריטים משויכים - לחץ לעריכה` : "לחץ לשיוך"}
              </button>

              {/* הצגת שיוכים קיימים */}
              {expense && getLinkCount() > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {expense.linkedInvoices?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      <Receipt className="w-4 h-4" />
                      {expense.linkedInvoices.length} חשבוניות
                    </span>
                  )}
                  {expense.linkedSalaries?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      <Briefcase className="w-4 h-4" />
                      {expense.linkedSalaries.length} משכורות
                    </span>
                  )}
                  {expense.linkedOrders?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      <ShoppingCart className="w-4 h-4" />
                      {expense.linkedOrders.length} הזמנות
                    </span>
                  )}
                </div>
              )}

              {expense && (
                <ExpenseLinkModal
                  isOpen={isLinkModalOpen}
                  onClose={() => setIsLinkModalOpen(false)}
                  expense={expense}
                  onLinked={handleLinked}
                />
              )}
            </div>

            {/* כפתור שמירה */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg disabled:opacity-50"
            >
              {saving ? (
                "שומר..."
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  עדכן הוצאה
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
