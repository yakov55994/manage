import { useEffect, useState, useRef } from "react";
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
  Link,
  Upload,
  FileSpreadsheet,
  Percent,
  CheckSquare,
  Square,
  X,
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
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, salaryId: null, salaryName: "" });
  const [allExpenses, setAllExpenses] = useState([]);

  // Multi-select state
  const [selectedSalaries, setSelectedSalaries] = useState([]);
  const lastSelectedIdRef = useRef(null);
  const [bulkActionModal, setBulkActionModal] = useState({ open: false, type: null });
  const [bulkDepartment, setBulkDepartment] = useState("");
  const [bulkProjectId, setBulkProjectId] = useState("");
  const [bulkOverhead, setBulkOverhead] = useState(0);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Upload Excel state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadOverhead, setUploadOverhead] = useState(0);
  const [uploadDepartment, setUploadDepartment] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchSalaries();
    fetchProjects();
  }, []);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const [salariesRes, expensesRes] = await Promise.all([
        api.get("/salaries"),
        api.get("/expenses")
      ]);
      setSalaries(salariesRes.data?.data || []);
      setAllExpenses(expensesRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching salaries:", err);
      toast.error("שגיאה בטעינת המשכורות");
    } finally {
      setLoading(false);
    }
  };

  // מיפוי הוצאות למשכורות (reverse lookup)
  const salaryToExpenseMap = {};
  allExpenses.forEach(expense => {
    if (expense.linkedSalaries && expense.linkedSalaries.length > 0) {
      expense.linkedSalaries.forEach(salaryRef => {
        const salaryId = salaryRef._id || salaryRef;
        if (!salaryToExpenseMap[salaryId]) {
          salaryToExpenseMap[salaryId] = [];
        }
        salaryToExpenseMap[salaryId].push(expense);
      });
    }
  });

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
    if (!selectedProjectIds || selectedProjectIds.length === 0) {
      toast.error("יש לבחור לפחות פרויקט אחד", { className: "sonner-toast error rtl" });
      return;
    }

    try {
      setExportLoading(true);
      // ✅ שימוש ב-POST במקום GET כדי למנוע חסימה של antivirus
      const response = await api.post('/salaries/export',
        { projectIds: selectedProjectIds },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const fileName = selectedProjectIds.length === 1
        ? `salary-export-${projects.find(p => p._id === selectedProjectIds[0])?.name || 'project'}.pdf`
        : `salary-export-multiple-projects.pdf`;

      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("קובץ סיכום משכורות הורד בהצלחה!", { className: "sonner-toast success rtl" });
    } catch (err) {
      console.error("Export error:", err);

      // טיפול מיוחד ב-404 - אין משכורות לפרויקט
      if (err.response?.status === 404) {
        // ניסיון לקרוא את הודעת השגיאה מה-blob
        let errorMessage = "לא נמצאו משכורות לפרויקט/ים שנבחרו";

        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const errorData = JSON.parse(text);
            if (errorData.error) {
              errorMessage = errorData.error === "No salaries found for the selected projects"
                ? "לא נמצאו משכורות לפרויקט/ים שנבחרו"
                : errorData.error;
            }
          } catch (e) {
            // אם לא הצלחנו לקרוא, נשאר עם ההודעה ברירת המחדל
          }
        }

        toast.error(errorMessage, {
          className: "sonner-toast error rtl"
        });
      } else {
        // שגיאות אחרות
        const errorMsg = err.response?.data?.error || err.message || "שגיאה בהורדת הסיכום";
        toast.error(`שגיאה ביצירת סיכום משכורות: ${errorMsg}`, {
          className: "sonner-toast error rtl"
        });
      }
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

  // ========== Multi-select functions ==========
  const toggleSelectSalary = (salary, event) => {
    const currentId = salary._id;
    const currentIndex = filteredSalaries.findIndex(s => s._id === currentId);
    const lastId = lastSelectedIdRef.current;
    const lastIndex = lastId ? filteredSalaries.findIndex(s => s._id === lastId) : -1;

    if (!event.shiftKey || lastIndex === -1) {
      setSelectedSalaries(prev => {
        const exists = prev.some(s => s._id === currentId);
        return exists ? prev.filter(s => s._id !== currentId) : [...prev, salary];
      });
      lastSelectedIdRef.current = currentId;
      return;
    }

    // Shift selection
    const start = Math.min(lastIndex, currentIndex);
    const end = Math.max(lastIndex, currentIndex);
    const range = filteredSalaries.slice(start, end + 1);

    setSelectedSalaries(prev => {
      const map = new Map(prev.map(s => [s._id, s]));
      range.forEach(s => map.set(s._id, s));
      return Array.from(map.values());
    });
  };

  const toggleSelectAll = () => {
    if (selectedSalaries.length === filteredSalaries.length) {
      setSelectedSalaries([]);
      lastSelectedIdRef.current = null;
    } else {
      setSelectedSalaries([...filteredSalaries]);
    }
  };

  const clearSelection = () => {
    setSelectedSalaries([]);
    lastSelectedIdRef.current = null;
  };

  const handleBulkAction = async () => {
    setBulkLoading(true);
    try {
      const ids = selectedSalaries.map(s => s._id);

      if (bulkActionModal.type === "delete") {
        await api.post("/salaries/bulk-delete", { salaryIds: ids });
        setSalaries(prev => prev.filter(s => !ids.includes(s._id)));
        toast.success(`נמחקו ${ids.length} משכורות`, { className: "sonner-toast success rtl" });
      } else {
        const updateData = { salaryIds: ids };
        if (bulkActionModal.type === "department") updateData.department = bulkDepartment;
        if (bulkActionModal.type === "project") updateData.projectId = bulkProjectId;
        if (bulkActionModal.type === "overhead") updateData.overheadPercent = parseFloat(bulkOverhead) || 0;

        await api.put("/salaries/bulk-update", updateData);
        toast.success(`עודכנו ${ids.length} משכורות`, { className: "sonner-toast success rtl" });
        fetchSalaries();
      }

      setSelectedSalaries([]);
      lastSelectedIdRef.current = null;
      setBulkActionModal({ open: false, type: null });
    } catch (err) {
      console.error("Bulk action error:", err);
      toast.error(err.response?.data?.error || "שגיאה בביצוע הפעולה", { className: "sonner-toast error rtl" });
    } finally {
      setBulkLoading(false);
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

  const handleUploadExcel = async () => {
    if (!uploadFile) {
      toast.error("יש לבחור קובץ אקסל", { className: "sonner-toast error rtl" });
      return;
    }
    if (!uploadProjectId) {
      toast.error("יש לבחור פרויקט", { className: "sonner-toast error rtl" });
      return;
    }

    try {
      setUploadLoading(true);
      setUploadResult(null);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("projectId", uploadProjectId);
      formData.append("overheadPercent", uploadOverhead);
      formData.append("department", uploadDepartment);

      const res = await api.post("/salaries/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const msg = res.data.message || "הקובץ הועלה בהצלחה!";
      setUploadResult({ success: true, message: msg });
      toast.success(msg, { className: "sonner-toast success rtl" });
      setUploadFile(null);
      setUploadProjectId("");
      setUploadOverhead(0);
      setUploadDepartment("");
      const fileInput = document.getElementById("salary-excel-file");
      if (fileInput) fileInput.value = "";
      fetchSalaries();
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg = err.response?.data?.error || "שגיאה בהעלאת הקובץ";
      setUploadResult({ success: false, message: errMsg });
      toast.error(errMsg, { className: "sonner-toast error rtl" });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">
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
        <div className="relative mb-4 sm:mb-5 md:mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-5 md:p-6 border border-white/50">
            <div className="space-y-4">
              <div>
                <ProjectSelector
                  projects={projects}
                  selectedProjects={selectedProjectIds.map(id => projects.find(p => p._id === id)).filter(Boolean)}
                  onProjectsChange={(selectedProjects) => {
                    const ids = selectedProjects.map(p => p._id);
                    setSelectedProjectIds(ids);
                  }}
                  multiSelect={true}
                  label="בחר פרויקטים לייצוא סיכום משכורות"
                  placeholder="חפש פרויקטים..."
                  showSelectAll={true}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleExportSalaries}
                  disabled={exportLoading || selectedProjectIds.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
                >
                  <Download className="w-5 h-5" />
                  {exportLoading ? "מוריד..." : `הורד סיכום PDF${selectedProjectIds.length > 0 ? ` (${selectedProjectIds.length} פרויקטים)` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Excel Section */}
        <div className="relative mb-4 sm:mb-5 md:mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-5 md:p-6 border border-white/50">
            <button
              onClick={() => setUploadOpen(!uploadOpen)}
              className="flex items-center gap-2 text-lg font-bold text-slate-900 w-full"
            >
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              העלאת משכורות מאקסל
              <span className={`mr-auto text-orange-500 transition-transform ${uploadOpen ? "rotate-180" : ""}`}>▼</span>
            </button>

            {uploadOpen && (
              <div className="mt-4 space-y-4">
                {/* Project Selector */}
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={uploadProjectId}
                  onProjectChange={(projectId) => setUploadProjectId(projectId)}
                  multiSelect={false}
                  label="פרויקט מקור *"
                  placeholder="חפש פרויקט..."
                />

                {/* File Drop Area */}
                <div>
                  <input
                    id="salary-excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const validTypes = [
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          "application/vnd.ms-excel",
                        ];
                        if (!validTypes.includes(file.type)) {
                          toast.error("נא להעלות קובץ Excel בלבד (.xlsx או .xls)");
                          e.target.value = "";
                          return;
                        }
                        setUploadFile(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="salary-excel-file"
                    className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-orange-500" />
                    <span className="font-medium text-slate-700">
                      {uploadFile ? uploadFile.name : "לחץ לבחירת קובץ Excel"}
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    עמודות: שם כולל, סה"כ תשלומים (ברוטו), נטו לתשלום
                  </p>
                </div>

                {/* Advanced Options - Collapsed */}
                <details className="group">
                  <summary className="flex items-center gap-2 text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
                    <span className="text-orange-400 group-open:rotate-90 transition-transform">▶</span>
                    אפשרויות נוספות (תקורה, מחלקה)
                  </summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <Percent className="w-4 h-4 text-orange-600" />
                        תקורה (%)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {[0, 42, 45, 50].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setUploadOverhead(p)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${
                              uploadOverhead == p
                                ? "bg-orange-600 text-white shadow-lg"
                                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={uploadOverhead}
                        onChange={(e) => setUploadOverhead(e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-2.5 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <Building2 className="w-4 h-4 text-orange-600" />
                        מחלקה (אופציונלי)
                      </label>
                      <input
                        type="text"
                        value={uploadDepartment}
                        onChange={(e) => setUploadDepartment(e.target.value)}
                        placeholder="הזן שם מחלקה..."
                        className="w-full px-4 py-2.5 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors mt-8"
                      />
                    </div>
                  </div>
                </details>

                {/* Upload Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleUploadExcel}
                    disabled={uploadLoading || !uploadFile || !uploadProjectId}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5" />
                    {uploadLoading ? "מעלה..." : "העלה משכורות"}
                  </button>
                </div>

                {/* Upload Result */}
                {uploadResult && (
                  <div className={`p-4 rounded-xl ${uploadResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                    <div className="flex items-center gap-3">
                      {uploadResult.success ? (
                        <Users className="w-5 h-5 text-green-600" />
                      ) : (
                        <Users className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-bold ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadResult.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="relative mb-4 sm:mb-5 md:mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-5 md:p-6 border border-white/50">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
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

        {/* Bulk Action Bar */}
        {selectedSalaries.length > 0 && (
          <div className="relative mb-4 sm:mb-5 md:mb-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>
            <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl p-4 border-2 border-blue-200">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-slate-900">{selectedSalaries.length} נבחרו</span>
                  <button onClick={clearSelection} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="h-6 w-px bg-slate-300"></div>
                <button
                  onClick={() => { setBulkDepartment(""); setBulkActionModal({ open: true, type: "department" }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-all"
                >
                  <Building2 className="w-4 h-4" />
                  מחלקה
                </button>
                <button
                  onClick={() => { setBulkProjectId(""); setBulkActionModal({ open: true, type: "project" }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-200 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  פרויקט
                </button>
                <button
                  onClick={() => { setBulkOverhead(0); setBulkActionModal({ open: true, type: "overhead" }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold hover:bg-amber-200 transition-all"
                >
                  <Percent className="w-4 h-4" />
                  תקורה
                </button>
                <button
                  onClick={() => setBulkActionModal({ open: true, type: "delete" })}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  מחיקה
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Salaries Table */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {filteredSalaries.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 mx-auto mb-4 text-orange-400 opacity-50" />
                <p className="font-bold text-xl text-slate-600">
                  {searchTerm ? "לא נמצאו משכורות" : "אין משכורות להצגה"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                      <tr>
                        <th className="px-2 py-2.5 text-center text-xs font-bold text-white w-[4%]">
                          <button onClick={toggleSelectAll} className="hover:opacity-80 transition-opacity">
                            {selectedSalaries.length === filteredSalaries.length && filteredSalaries.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </th>
                        <th className="px-2 py-2.5 text-right text-xs font-bold text-white w-[12%]">
                          שם עובד
                        </th>
                        <th className="px-2 py-2.5 text-right text-xs font-bold text-white w-[7%]">
                          מחלקה
                        </th>
                        <th className="px-2 py-2.5 text-right text-xs font-bold text-white w-[10%]">
                          פרויקט
                        </th>
                        <th className="px-2 py-2.5 text-center text-xs font-bold text-white w-[9%]">
                          ברוטו
                        </th>
                        <th className="px-1 py-2.5 text-center text-xs font-bold text-white w-[8%]">
                          נטו
                        </th>
                        <th className="px-1 py-2.5 text-center text-xs font-bold text-white w-[5%]">
                          תקורה
                        </th>
                        <th className="px-2 py-2.5 text-center text-xs font-bold text-white w-[9%]">
                          סופי
                        </th>
                        <th className="px-2 py-2.5 text-center text-xs font-bold text-white w-[8%]">
                          תאריך
                        </th>
                        <th className="px-2 py-2.5 text-right text-xs font-bold text-white w-[8%]">
                          נוצר ע"י
                        </th>
                        <th className="px-1 py-2.5 text-center text-xs font-bold text-white w-[7%]">
                          שויך
                        </th>
                        <th className="px-1 py-2.5 text-center text-xs font-bold text-white w-[10%]">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-orange-100">
                      {filteredSalaries.map((salary, index) => (
                        <tr
                          key={salary._id}
                          className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${
                            selectedSalaries.some(s => s._id === salary._id)
                              ? "bg-blue-50/70"
                              : index % 2 === 0 ? "bg-white" : "bg-orange-50/30"
                          }`}
                          onClick={() => navigate(`/salaries/${salary._id}`)}
                        >
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelectSalary(salary, e); }}
                              className="hover:opacity-80 transition-opacity"
                            >
                              {selectedSalaries.some(s => s._id === salary._id) ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-2 py-1.5 truncate">
                            <span className="font-bold text-slate-900 text-sm">
                              {salary.employeeName}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 truncate">
                            <span className="text-xs text-slate-600">
                              {salary.department || "—"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 truncate">
                            <span className="text-xs text-slate-600">
                              {salary.projectId?.name || "—"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            <span className="font-bold text-slate-700 text-xs">
                              {formatCurrency(salary.baseAmount)}
                            </span>
                          </td>
                          <td className="px-1 py-1.5 whitespace-nowrap text-center">
                            <span className="font-bold text-amber-600 text-xs">
                              {salary.netAmount ? formatCurrency(salary.netAmount) : "—"}
                            </span>
                          </td>
                          <td className="px-1 py-1.5 whitespace-nowrap text-center">
                            <span className="text-xs font-bold text-amber-700">
                              {salary.overheadPercent || 0}%
                            </span>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            <span className="font-bold text-orange-600 text-xs">
                              {formatCurrency(salary.finalAmount)}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-center text-xs text-slate-600">
                            {formatDate(salary.date)}
                          </td>
                          <td className="px-2 py-1.5 truncate text-xs text-slate-600">
                            {salary.createdByName || "—"}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            {salaryToExpenseMap[salary._id]?.length > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <Link className="w-3 h-3" />
                                <span className="text-xs font-bold">
                                  {salaryToExpenseMap[salary._id].length}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <div className="flex justify-center gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/salaries/${salary._id}`);
                                }}
                                className="p-1 hover:bg-blue-100 rounded-lg transition-colors group"
                                title="צפייה"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/update-salary/${salary._id}`);
                                }}
                                className="p-1 hover:bg-orange-100 rounded-lg transition-colors group"
                                title="עריכה"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-orange-600 group-hover:text-orange-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteModal(salary);
                                }}
                                className="p-1 hover:bg-red-100 rounded-lg transition-colors group"
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

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredSalaries.map((salary) => (
                    <div
                      key={salary._id}
                      onClick={() => navigate(`/salaries/${salary._id}`)}
                      className={`backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all border p-4 cursor-pointer active:scale-98 ${
                        selectedSalaries.some(s => s._id === salary._id)
                          ? "bg-blue-50/90 border-blue-200"
                          : "bg-white/90 border-orange-100"
                      }`}
                    >
                      {/* Header - Employee Name */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-orange-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelectSalary(salary, e); }}
                            className="hover:opacity-80 transition-opacity"
                          >
                            {selectedSalaries.some(s => s._id === salary._id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">שם עובד</div>
                            <div className="text-lg font-bold text-slate-900">
                              {salary.employeeName}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">תאריך</div>
                          <div className="text-sm font-medium text-slate-700">
                            {formatDate(salary.date)}
                          </div>
                        </div>
                      </div>

                      {/* Department & Project */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <Briefcase className="w-3 h-3" />
                            מחלקה
                          </div>
                          <div className="text-sm font-medium text-slate-700">
                            {salary.department || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <Building2 className="w-3 h-3" />
                            פרויקט
                          </div>
                          <div className="text-sm font-medium text-slate-700">
                            {salary.projectId?.name || "—"}
                          </div>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="grid grid-cols-2 gap-2 mb-3 bg-orange-50 rounded-lg p-3">
                        <div className="text-center">
                          <div className="text-xs text-slate-600 mb-1">ברוטו</div>
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(salary.baseAmount)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-600 mb-1">נטו</div>
                          <div className="text-sm font-bold text-amber-600">
                            {salary.netAmount ? formatCurrency(salary.netAmount) : "—"}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-600 mb-1">תקורה</div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800">
                            {salary.overheadPercent || 0}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-600 mb-1">סופי</div>
                          <div className="text-sm font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            {formatCurrency(salary.finalAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Created By */}
                      <div className="mb-3 text-xs text-slate-500">
                        נוצר ע"י: <span className="font-medium text-slate-700">{salary.createdByName || "—"}</span>
                      </div>

                      {/* שיוך */}
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 mb-1">שויך</div>
                        {salaryToExpenseMap[salary._id]?.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
                            <Link className="w-3 h-3" />
                            {salaryToExpenseMap[salary._id].length} הוצאות
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">לא שויך</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/salaries/${salary._id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>צפייה</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/update-salary/${salary._id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>עריכה</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(salary);
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary Card */}
        {filteredSalaries.length > 0 && (
          <div className="relative mt-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-5 md:p-6 border border-white/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 sm:p-5 md:p-6">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                  <p className="text-sm font-bold text-orange-600 mb-2">
                    סה"כ ברוטו
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {formatCurrency(
                      filteredSalaries.reduce(
                        (sum, s) => sum + (s.baseAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                  <p className="text-sm font-bold text-amber-600 mb-2">
                    סה"כ נטו
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {formatCurrency(
                      filteredSalaries.reduce(
                        (sum, s) => sum + (s.netAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                  <p className="text-sm font-bold text-amber-600 mb-2">
                    סה"כ סופי
                  </p>
                  <p className="text-xl font-black text-slate-900">
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
                  <p className="text-xl font-black text-slate-900">
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
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl sm:rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 max-w-md w-full">
                <div className="text-center mb-4 sm:mb-5 md:mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">
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

        {/* Bulk Action Modal */}
        {bulkActionModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className={`absolute -inset-4 rounded-2xl sm:rounded-3xl opacity-20 blur-2xl ${
                bulkActionModal.type === "delete"
                  ? "bg-gradient-to-r from-red-500 to-rose-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
              }`}></div>

              <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    bulkActionModal.type === "delete"
                      ? "bg-gradient-to-br from-red-500 to-rose-500"
                      : "bg-gradient-to-br from-blue-500 to-indigo-500"
                  }`}>
                    {bulkActionModal.type === "department" && <Building2 className="w-8 h-8 text-white" />}
                    {bulkActionModal.type === "project" && <Briefcase className="w-8 h-8 text-white" />}
                    {bulkActionModal.type === "overhead" && <Percent className="w-8 h-8 text-white" />}
                    {bulkActionModal.type === "delete" && <Trash2 className="w-8 h-8 text-white" />}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">
                    {bulkActionModal.type === "department" && "עדכון מחלקה"}
                    {bulkActionModal.type === "project" && "עדכון פרויקט"}
                    {bulkActionModal.type === "overhead" && "עדכון תקורה"}
                    {bulkActionModal.type === "delete" && "מחיקה מרובה"}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {selectedSalaries.length} משכורות נבחרו
                  </p>
                </div>

                {bulkActionModal.type === "department" && (
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">מחלקה</label>
                    <input
                      type="text"
                      value={bulkDepartment}
                      onChange={(e) => setBulkDepartment(e.target.value)}
                      placeholder="הזן שם מחלקה..."
                      className="w-full p-3 border-2 border-blue-200 rounded-xl focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                )}

                {bulkActionModal.type === "project" && (
                  <div className="mb-6">
                    <ProjectSelector
                      projects={projects}
                      selectedProjectId={bulkProjectId}
                      onProjectChange={(projectId) => setBulkProjectId(projectId)}
                      multiSelect={false}
                      label="פרויקט"
                      placeholder="חפש פרויקט..."
                    />
                  </div>
                )}

                {bulkActionModal.type === "overhead" && (
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">אחוז תקורה</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[0, 42, 45, 50].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBulkOverhead(p)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all ${
                            bulkOverhead == p
                              ? "bg-amber-600 text-white shadow-lg"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={bulkOverhead}
                      onChange={(e) => setBulkOverhead(e.target.value)}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full p-3 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                {bulkActionModal.type === "delete" && (
                  <div className="mb-6 text-center">
                    <p className="text-slate-600">
                      פעולה זו תמחק <span className="font-bold text-red-600">{selectedSalaries.length}</span> משכורות לצמיתות.
                    </p>
                    <p className="text-sm text-red-600 mt-2 font-medium">
                      פעולה זו אינה ניתנת לביטול!
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleBulkAction}
                    disabled={bulkLoading || (bulkActionModal.type === "project" && !bulkProjectId)}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg disabled:opacity-50 ${
                      bulkActionModal.type === "delete"
                        ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    }`}
                  >
                    {bulkLoading ? "מעדכן..." : bulkActionModal.type === "delete" ? "מחק" : "עדכן"}
                  </button>
                  <button
                    onClick={() => setBulkActionModal({ open: false, type: null })}
                    disabled={bulkLoading}
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
