import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { TrendingDown, Save, ArrowRight, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

export default function CreateExpense() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    description: "",
    notes: "",
    reference: "",
    transactionType: "",
  });

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
      setLoading(true);
      await api.post("/expenses", formData);
      toast.success("ההוצאה נוצרה בהצלחה!");
      navigate("/expenses");
    } catch (err) {
      console.error("Create expense error:", err);
      toast.error("שגיאה ביצירת הוצאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-red-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-2xl">
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
                      יצירת הוצאה חדשה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      הזן את פרטי ההוצאה
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
          <div className="absolute -inset-2 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-3xl opacity-10 blur-xl"></div>

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
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
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
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="הזן סכום..."
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
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
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
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
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
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
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:outline-none transition-all"
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
                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:outline-none transition-all resize-none"
                rows={3}
              />
            </div>

            {/* כפתור שמירה */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? (
                "שומר..."
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  שמור הוצאה
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
