import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import ProjectSelector from "../../Components/ProjectSelector";
import {
  Save,
  ArrowRight,
  User,
  Briefcase,
  DollarSign,
  Percent,
  Users,
} from "lucide-react";

export default function EditSalary() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    projectId: "",
    employeeName: "",
    baseAmount: "",
    netAmount: "",
    overheadPercent: 0,
    department: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salaryRes, projectsRes] = await Promise.all([
        api.get(`/salaries/${id}`),
        api.get("/projects"),
      ]);

      const salary = salaryRes.data.data;

      setForm({
        projectId: salary.projectId?._id,
        employeeName: salary.employeeName,
        baseAmount: salary.baseAmount,
        netAmount: salary.netAmount || "",
        overheadPercent: salary.overheadPercent || 0,
        department: salary.department || "",
      });

      setProjects(
        (projectsRes.data.data || []).filter((p) => p.type !== "salary")
      );
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינת משכורת");
      navigate("/salaries");
    } finally {
      setLoading(false);
    }
  };

  const finalAmount =
    Number(form.baseAmount || 0) +
    (Number(form.baseAmount || 0) * Number(form.overheadPercent || 0)) / 100;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.employeeName?.trim()) {
      toast.error("יש להזין שם עובד");
      return;
    }

    if (!form.baseAmount || Number(form.baseAmount) <= 0) {
      toast.error("יש להזין שכר בסיס תקין");
      return;
    }

    if (!form.projectId) {
      toast.error("יש לבחור פרויקט");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/salaries/${id}`, {
        ...form,
        baseAmount: Number(form.baseAmount),
        netAmount: form.netAmount ? Number(form.netAmount) : null,
        overheadPercent: Number(form.overheadPercent),
        finalAmount,
      });

      toast.success("המשכורת עודכנה בהצלחה");
      navigate("/salaries");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בעדכון משכורת");
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
        <h1 className="mt-8 font-bold text-xl sm:text-2xl md:text-3xl text-slate-900">
          טוען משכורת...
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

      <div className="relative z-10 max-w-4xl mx-auto px-6">
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
                    עריכת משכורת
                  </h1>
                  <p className="text-sm font-medium text-slate-600 mt-1">
                    עדכון פרטי משכורת
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="space-y-6">
                {/* Project Selector */}
                <div>
                  <ProjectSelector
                    projects={projects}
                    selectedProjectId={form.projectId}
                    onProjectChange={(projectId) =>
                      setForm((prev) => ({ ...prev, projectId }))
                    }
                    label="פרויקט מקור"
                  />
                </div>

                {/* Employee Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <User className="w-4 h-4 text-orange-500" />
                    שם עובד
                  </label>
                  <input
                    name="employeeName"
                    value={form.employeeName}
                    onChange={handleChange}
                    placeholder="הזן שם עובד..."
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors font-medium"
                    required
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    מחלקה (אופציונלי)
                  </label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="הזן מחלקה..."
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors font-medium"
                  />
                </div>

                {/* Base Amount + Net Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <DollarSign className="w-4 h-4 text-yellow-500" />
                      סכום ברוטו
                    </label>
                    <input
                      type="number"
                      name="baseAmount"
                      value={form.baseAmount}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors font-medium"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      סכום נטו (אופציונלי)
                    </label>
                    <input
                      type="number"
                      name="netAmount"
                      value={form.netAmount}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors font-medium"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Overhead Percent */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Percent className="w-4 h-4 text-purple-500" />
                    אחוז תקורה
                  </label>

                  {/* Quick Buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[42, 45, 50].map((percent) => (
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
                    type="number"
                    name="overheadPercent"
                    value={form.overheadPercent}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors font-medium"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                {/* Final Amount Display */}
                <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 shadow-xl shadow-orange-500/30">
                  <div className="text-center">
                    <p className="text-sm font-bold text-white/90 mb-2">
                      סכום סופי לתשלום
                    </p>
                    <p className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-white">
                      ₪{finalAmount.toLocaleString("he-IL")}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 sm:gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
            className="group px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all flex items-center gap-3"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? "שומר..." : "שמור שינויים"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/salaries")}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    <ArrowRight className="w-5 h-5" />
                    <span>ביטול</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
