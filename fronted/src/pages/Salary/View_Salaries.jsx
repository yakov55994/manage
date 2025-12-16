import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import {
  Users,
  Search,
  ArrowUpDown,
  Building2,
  DollarSign,
  Calendar,
  User,
  Briefcase,
  Eye,
  Edit2,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import ProjectSelector from "../../Components/ProjectSelector";

export default function View_Salaries() {
  const navigate = useNavigate();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date, employeeName, finalAmount
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, salaryId: null, salaryName: "" });

  useEffect(() => {
    fetchSalaries();
    fetchProjects();
  }, []);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await api.get("/salaries");
      setSalaries(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching salaries:", err);
      toast.error("שגיאה בטעינת המשכורות");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get("/projects");
      const allProjects = response.data?.data || [];
      setProjects(allProjects.filter(p => p.type !== "salary"));
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const handleExportSalaries = async () => {
    if (!selectedProjectId) {
      toast.error("יש לבחור פרויקט", { className: "sonner-toast error rtl" });
      return;
    }

    try {
      setExportLoading(true);
      const response = await api.get(`/salaries/export?projectId=${selectedProjectId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const project = projects.find(p => p._id === selectedProjectId);
      link.download = `salary-export-${project?.name || 'project'}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("קובץ סיכום משכורות הורד בהצלחה!", { className: "sonner-toast success rtl" });
    } catch (err) {
      console.error("Export error:", err);
      const errorMsg = err.response?.data?.error || err.message || "שגיאה בהורדת הסיכום";
      toast.error(`שגיאה ביצירת סיכום משכורות: ${errorMsg}`, { className: "sonner-toast error rtl" });
    } finally {
      setExportLoading(false);
    }
  };

  const filteredSalaries = salaries
    .filter((salary) => {
      if (!searchTerm) return true;

      const q = searchTerm.toLowerCase();

      // חיפוש בשדות טקסט
      const textFields = [
        salary.employeeName,
        salary.department,
        salary.projectId?.name,
        salary.createdByName,
      ].filter(Boolean).map(field => field.toLowerCase());

      // חיפוש בסכומים (המרה למחרוזת)
      const numericFields = [
        salary.baseAmount?.toString(),
        salary.finalAmount?.toString(),
        salary.overheadPercent?.toString(),
      ].filter(Boolean);

      // בדיקה אם החיפוש קיים באחד מהשדות
      return textFields.some(field => field.includes(q)) ||
             numericFields.some(field => field.includes(q));
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison = new Date(b.date) - new Date(a.date);
      } else if (sortBy === "employeeName") {
        comparison = (a.employeeName || "").localeCompare(b.employeeName || "");
      } else if (sortBy === "finalAmount") {
        comparison = (a.finalAmount || 0) - (b.finalAmount || 0);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
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
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען משכורות...
        </h1>
      </div>
    );
  }
  const openDeleteModal = (salary) => {
    setDeleteModal({
      open: true,
      salaryId: salary._id,
      salaryName: salary.employeeName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, salaryId: null, salaryName: "" });
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/salaries/${deleteModal.salaryId}`);
      setSalaries(prev => prev.filter(s => s._id !== deleteModal.salaryId));
      toast.success("המשכורת נמחקה בהצלחה", { className: "sonner-toast success rtl" });
      closeDeleteModal();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("שגיאה במחיקת משכורת", { className: "sonner-toast error rtl" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    רשימת משכורות
                  </h1>
                  <p className="text-sm font-medium text-slate-600 mt-2">
                    סה"כ {filteredSalaries.length} משכורות
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Export Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-500/10 p-6 border border-white/50">
            <div className="space-y-4">
              <div>
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onProjectChange={(projectId) => setSelectedProjectId(projectId)}
                  multiSelect={false}
                  label="בחר פרויקט לייצוא סיכום משכורות"
                  placeholder="חפש פרויקט..."
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleExportSalaries}
                  disabled={exportLoading || !selectedProjectId}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {exportLoading ? "מוריד..." : "הורד סיכום PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 p-6 border border-white/50">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש לפי שם עובד, מחלקה, פרויקט..."
                  className="w-full pr-12 pl-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Sort Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSort("date")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                    sortBy === "date"
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  תאריך
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleSort("employeeName")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                    sortBy === "employeeName"
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
                >
                  <User className="w-4 h-4" />
                  שם
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleSort("finalAmount")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                    sortBy === "finalAmount"
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  סכום
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Salaries Table */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {filteredSalaries.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 mx-auto mb-4 text-orange-400 opacity-50" />
                <p className="font-bold text-xl text-slate-600">
                  {searchTerm ? "לא נמצאו משכורות" : "אין משכורות להצגה"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <tr>
                      <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase">
                        שם עובד
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase">
                        מחלקה
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase">
                        פרויקט
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase">
                        ברוטו
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase">
                        תקורה
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase">
                        סופי
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase">
                        תאריך
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase">
                        נוצר ע"י
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-orange-100">
                    {filteredSalaries.map((salary, index) => (
                      <tr
                        key={salary._id}
                        className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${
                          index % 2 === 0 ? "bg-white" : "bg-orange-50/30"
                        }`}
                        onClick={() => navigate(`/salaries/${salary._id}`)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-orange-500" />
                            <span className="font-bold text-slate-900 text-sm">
                              {salary.employeeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-slate-600">
                              {salary.department || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-slate-600">
                              {salary.projectId?.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className="font-bold text-slate-700 text-sm">
                            {formatCurrency(salary.baseAmount)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            {salary.overheadPercent || 0}%
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className="font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            {formatCurrency(salary.finalAmount)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center text-xs text-slate-600">
                          {formatDate(salary.date)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                          {salary.createdByName || "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/salaries/${salary._id}`);
                              }}
                              className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group"
                              title="צפייה"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/update-salary/${salary._id}`);
                              }}
                              className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors group"
                              title="עריכה"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-orange-600 group-hover:text-orange-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(salary);
                              }}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                              title="מחיקה"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600 group-hover:text-red-700" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card */}
        {filteredSalaries.length > 0 && (
          <div className="relative mt-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 p-6 border border-white/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                  <p className="text-sm font-bold text-orange-600 mb-2">
                    סה"כ סכום ברוטו
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(
                      filteredSalaries.reduce(
                        (sum, s) => sum + (s.baseAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                  <p className="text-sm font-bold text-amber-600 mb-2">
                    סה"כ סכום סופי
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(
                      filteredSalaries.reduce(
                        (sum, s) => sum + (s.finalAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                  <p className="text-sm font-bold text-yellow-600 mb-2">
                    מספר עובדים
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {filteredSalaries.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <Trash2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    פעולה זו תמחק את משכורת של <span className="font-bold text-orange-600">{deleteModal.salaryName}</span> לצמיתות.
                  </p>
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    פעולה זו אינה ניתנת לביטול!
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
                    onClick={closeDeleteModal}
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
    </div>
  );
}
