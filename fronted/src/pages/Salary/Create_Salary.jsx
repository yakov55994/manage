import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/api.js";
import { toast } from "sonner";
import {
  Building2,
  User,
  DollarSign,
  Percent,
  Save,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import ProjectSelector from "../../Components/ProjectSelector.jsx";

const CreateSalary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");

  // ============================
  // STATE
  // ============================
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    projectId: projectIdFromUrl || "",
    employeeName: "",
    baseAmount: "",
    overheadPercent: 0,
    department: "", // מחלקה - לא חובה
  });

  // ============================
  // LOAD PROJECTS
  // ============================
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        const allProjects = res.data?.data || [];

        // סנן רק פרויקטים שאינם מסוג "salary" (כי אנחנו צריכים פרויקט מקור)
        const regularProjects = allProjects.filter(p => p.type !== "salary");
        setProjects(regularProjects);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת פרויקטים");
      }
    };

    fetchProjects();
  }, []);

  // ============================
  // CALCULATED FINAL AMOUNT
  // ============================
  const calculateFinalAmount = () => {
    const base = parseFloat(form.baseAmount) || 0;
    const overhead = parseFloat(form.overheadPercent) || 0;
    return base + (base * overhead / 100);
  };

  const finalAmount = calculateFinalAmount();

  // ============================
  // HANDLE INPUT
  // ============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ============================
  // HANDLE SUBMIT
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.projectId) {
      toast.error("יש לבחור פרויקט", { className: "sonner-toast error rtl" });
      return;
    }
    if (!form.employeeName.trim()) {
      toast.error("יש להזין שם מקבל משכורת", { className: "sonner-toast error rtl" });
      return;
    }
    if (!form.baseAmount || parseFloat(form.baseAmount) <= 0) {
      toast.error("יש להזין סכום משכורת תקין", { className: "sonner-toast error rtl" });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        projectId: form.projectId,
        employeeName: form.employeeName,
        baseAmount: parseFloat(form.baseAmount),
        overheadPercent: parseFloat(form.overheadPercent) || 0,
        finalAmount: finalAmount,
        department: form.department || null, // מחלקה אופציונלית
      };

      await api.post("/salaries", payload);

      toast.success("המשכורת נוספה בהצלחה!", {
        className: "sonner-toast success rtl",
      });

      // ניווט חזרה לרשימת משכורות או לפרויקט
      navigate("/salaries");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "שגיאה ביצירת משכורת", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // OVERHEAD QUICK BUTTONS
  // ============================
  const quickOverheadButtons = [42, 45, 50];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <DollarSign className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    הוספת משכורת חדשה
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      מערכת ניהול משכורות
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => navigate("/salaries")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לרשימה</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <Building2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    פרטי המשכורת
                  </h2>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Project Selection */}
              <ProjectSelector
                projects={projects}
                selectedProjectId={form.projectId}
                onProjectChange={(projectId) => setForm(prev => ({ ...prev, projectId }))}
                multiSelect={false}
                label="פרויקט מקור (שממנו יורד התקציב) *"
                placeholder="חפש פרויקט..."
              />

              {/* Employee Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <User className="w-4 h-4 text-orange-600" />
                  שם מקבל המשכורת *
                </label>
                <input
                  type="text"
                  name="employeeName"
                  value={form.employeeName}
                  onChange={handleChange}
                  required
                  placeholder="הזן שם..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-right"
                />
              </div>

              {/* Department (optional) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  מחלקה (אופציונלי)
                </label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="הזן שם מחלקה..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-right"
                />
              </div>

              {/* Base Amount */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  סכום ברוטו *
                </label>
                <input
                  // type="number"
                  name="baseAmount"
                  value={form.baseAmount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-right"
                />
              </div>

              {/* Overhead Percent */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <Percent className="w-4 h-4 text-orange-600" />
                  תקורה (%)
                </label>

                {/* Quick Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickOverheadButtons.map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, overheadPercent: percent }))}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        form.overheadPercent == percent
                          ? "bg-orange-600 text-white shadow-lg"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      }`}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  name="overheadPercent"
                  value={form.overheadPercent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-right"
                />
              </div>

              {/* Final Amount Display */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-100">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-600">סכום סופי</p>
                      <p className="text-3xl font-black text-emerald-900">
                        ₪ {finalAmount.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-lg rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {loading ? "שומר..." : "שמור משכורת"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSalary;
