import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Save, ArrowLeft, DollarSign } from "lucide-react";
import { ClipLoader } from "react-spinners";
import api from "../../api/api";
import ProjectSelector from "../../Components/ProjectSelector";

export default function UpdateIncome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    description: "",
    notes: "",
    projectId: null,
  });

  useEffect(() => {
    loadIncome();
  }, [id]);

  const loadIncome = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/incomes/${id}`);
      const income = response.data?.data;

      if (!income) {
        toast.error("הכנסה לא נמצאה");
        navigate("/incomes");
        return;
      }

      // המרת תאריך לפורמט שמתאים ל-input date
      const dateObj = new Date(income.date);
      const formattedDate = dateObj.toISOString().split("T")[0];

      setFormData({
        date: formattedDate,
        amount: income.amount || "",
        description: income.description || "",
        notes: income.notes || "",
        projectId: income.projectId || null,
      });
    } catch (error) {
      console.error("Error loading income:", error);
      toast.error("שגיאה בטעינת ההכנסה");
      navigate("/incomes");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.amount || !formData.description) {
      toast.error("נא למלא את כל השדות החובה");
      return;
    }

    setSaving(true);

    try {
      await api.put(`/incomes/${id}`, formData);
      toast.success("ההכנסה עודכנה בהצלחה!");
      navigate(`/incomes/${id}`);
    } catch (error) {
      console.error("Error updating income:", error);
      toast.error(error.response?.data?.message || "שגיאה בעדכון הכנסה");
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
        <h1 className="mt-8 font-bold text-2xl text-slate-900">
          טוען הכנסה...
        </h1>
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
                      עדכון הכנסה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      ערוך את פרטי ההכנסה
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/incomes/${id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">חזרה</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* תאריך */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  תאריך *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
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
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
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
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="תיאור ההכנסה"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* פרויקט */}
              <div className="md:col-span-2">
                <ProjectSelector
                  value={formData.projectId}
                  onSelect={(project) =>
                    handleChange("projectId", project?._id || null)
                  }
                  label="פרויקט (אופציונלי)"
                  placeholder="בחר פרויקט..."
                  allowClear={true}
                />
              </div>

              {/* הערות */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="הערות נוספות..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => navigate(`/incomes/${id}`)}
                className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg"
              >
                <Save className="w-5 h-5" />
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
