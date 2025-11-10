import { useEffect, useState } from 'react';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  DownloadCloud,
  Edit2,
  Trash2,
  Filter,
  FileSpreadsheet,
  X,
  Building2,
  Sparkles,
  AlertCircle,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { toast } from 'sonner';

const ProjectsPage = ({ initialProjects = [] }) => {
  const [projects, setProjects] = useState(initialProjects);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    budgetMin: "",
    budgetMax: "",
    remainingBudgetMin: "",
    remainingBudgetMax: "",
    projectName: "",
    invitingName: "",
    contactPerson: "",
    budgetStatus: "all",
    supplierName: "",
    paymentStatus: "",
    missingDocument: "",
  });

  const [exportColumns, setExportColumns] = useState({
    name: true,
    invitingName: true,
    budget: true,
    remainingBudget: true,
    createdAt: true,
    contactPerson: true,
    budgetUsage: false,
    budgetPercentage: false,
    projectStatus: false,
    supplierName: false,
    paymentStatus: false,
    missingDocument: false,
  });

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString('he-IL');
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const availableColumns = [
    { key: 'name', label: 'שם הפרויקט' },
    { key: 'invitingName', label: 'שם המזמין' },
    { key: 'budget', label: 'תקציב' },
    { key: 'remainingBudget', label: 'תקציב שנותר' },
    { key: 'createdAt', label: 'תאריך יצירה' },
    { key: 'contactPerson', label: 'איש קשר' },
    { key: 'supplierName', label: 'שם ספק' },
    { key: 'paymentStatus', label: 'מצב תשלום' },
    { key: 'missingDocument', label: 'חוסר מסמך' },
    { key: 'budgetUsage', label: 'תקציב שנוצל' },
    { key: 'budgetPercentage', label: 'אחוז ניצול תקציב' },
    { key: 'projectStatus', label: 'סטטוס פרויקט' },
  ];

  const getFilteredProjects = () => {
    let filtered = [...allProjects];

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.invitingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.Contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showReportModal) {
      if (advancedFilters.dateFrom) {
        filtered = filtered.filter(project =>
          new Date(project.createdAt) >= new Date(advancedFilters.dateFrom)
        );
      }
      if (advancedFilters.dateTo) {
        filtered = filtered.filter(project =>
          new Date(project.createdAt) <= new Date(advancedFilters.dateTo)
        );
      }
      if (advancedFilters.budgetMin) {
        filtered = filtered.filter(project =>
          project.budget && project.budget >= parseInt(advancedFilters.budgetMin)
        );
      }
      if (advancedFilters.budgetMax) {
        filtered = filtered.filter(project =>
          project.budget && project.budget <= parseInt(advancedFilters.budgetMax)
        );
      }
      if (advancedFilters.remainingBudgetMin) {
        filtered = filtered.filter(project =>
          project.remainingBudget !== undefined && project.remainingBudget >= parseInt(advancedFilters.remainingBudgetMin)
        );
      }
      if (advancedFilters.remainingBudgetMax) {
        filtered = filtered.filter(project =>
          project.remainingBudget !== undefined && project.remainingBudget <= parseInt(advancedFilters.remainingBudgetMax)
        );
      }
      if (advancedFilters.projectName) {
        filtered = filtered.filter(project =>
          project.name?.toLowerCase().includes(advancedFilters.projectName.toLowerCase())
        );
      }
      if (advancedFilters.invitingName) {
        filtered = filtered.filter(project =>
          project.invitingName?.toLowerCase().includes(advancedFilters.invitingName.toLowerCase())
        );
      }
      if (advancedFilters.contactPerson) {
        filtered = filtered.filter(project =>
          project.Contact_person?.toLowerCase().includes(advancedFilters.contactPerson.toLowerCase())
        );
      }
      if (advancedFilters.budgetStatus === "positive") {
        filtered = filtered.filter(project =>
          project.remainingBudget !== undefined && project.remainingBudget > 0
        );
      } else if (advancedFilters.budgetStatus === "negative") {
        filtered = filtered.filter(project =>
          project.remainingBudget !== undefined && project.remainingBudget < 0
        );
      } else if (advancedFilters.budgetStatus === "zero") {
        filtered = filtered.filter(project =>
          project.remainingBudget !== undefined && project.remainingBudget === 0
        );
      } else if (advancedFilters.budgetStatus === "noBudget") {
        filtered = filtered.filter(project =>
          !project.budget || project.remainingBudget === undefined
        );
      }
    }

    return filtered;
  };

  const filteredProjects = getFilteredProjects();

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      budgetMin: "",
      budgetMax: "",
      remainingBudgetMin: "",
      remainingBudgetMax: "",
      projectName: "",
      invitingName: "",
      contactPerson: "",
      budgetStatus: "all",
      supplierName: "",
      paymentStatus: "",
      missingDocument: "",
    });
  };

  const sortedProjects = [...(searchTerm ? filteredProjects : projects)].sort((a, b) => {
    if (sortBy === "budget") {
      const aVal = a.budget || 0;
      const bVal = b.budget || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (sortBy === "remainingBudget") {
      const aVal = a.remainingBudget !== undefined ? a.remainingBudget : 0;
      const bVal = b.remainingBudget !== undefined ? b.remainingBudget : 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (sortBy === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === "name") {
      return sortOrder === "asc"
        ? (a.name || '').localeCompare((b.name || ''), 'he')
        : (b.name || '').localeCompare((a.name || ''), 'he');
    }
    return 0;
  });

  const calculateProjectStats = (project) => {
    const budgetUsed = project.budget && project.remainingBudget !== undefined
      ? project.budget - project.remainingBudget
      : 0;

    const budgetPercentage = project.budget && project.remainingBudget !== undefined
      ? ((budgetUsed / project.budget) * 100).toFixed(1)
      : 0;

    let projectStatus = "לא זמין";
    if (project.budget && project.remainingBudget !== undefined) {
      if (project.remainingBudget > 0) {
        projectStatus = "תקציב זמין";
      } else if (project.remainingBudget === 0) {
        projectStatus = "תקציב מוצה";
      } else {
        projectStatus = "חריגה מתקציב";
      }
    } else {
      projectStatus = "אין תקציב מוגדר";
    }

    return { budgetUsed, budgetPercentage, projectStatus };
  };

  const exportCustomReport = () => {
    const dataToExport = filteredProjects;

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const columnMapping = {
      name: "שם הפרויקט",
      invitingName: "שם המזמין",
      budget: "תקציב",
      remainingBudget: "תקציב שנותר",
      createdAt: "תאריך יצירה",
      contactPerson: "איש קשר",
      budgetUsage: "תקציב שנוצל",
      budgetPercentage: "אחוז ניצול תקציב",
      projectStatus: "סטטוס פרויקט",
      supplierName: "שם ספק",
      paymentStatus: "מצב תשלום",
      missingDocument: "חוסר מסמך",
    };

    const selectedColumns = Object.keys(exportColumns).filter(key => exportColumns[key]);

    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const projectsData = dataToExport.map((project) => {
      const stats = calculateProjectStats(project);
      const row = {};

      selectedColumns.forEach(col => {
        switch (col) {
          case 'name':
            row[columnMapping.name] = project.name || '';
            break;
          case 'invitingName':
            row[columnMapping.invitingName] = project.invitingName || '';
            break;
          case 'budget':
            row[columnMapping.budget] = project.budget || 'אין תקציב';
            break;
          case 'remainingBudget':
            row[columnMapping.remainingBudget] = project.remainingBudget !== undefined ? project.remainingBudget : 'לא זמין';
            break;
          case 'createdAt':
            row[columnMapping.createdAt] = formatDate(project.createdAt);
            break;
          case 'contactPerson':
            row[columnMapping.contactPerson] = project.Contact_person || 'לא זמין';
            break;
          case 'budgetUsage':
            row[columnMapping.budgetUsage] = stats.budgetUsed;
            break;
          case 'budgetPercentage':
            row[columnMapping.budgetPercentage] = stats.budgetPercentage + '%';
            break;
          case 'projectStatus':
            row[columnMapping.projectStatus] = stats.projectStatus;
            break;
          case 'supplierName':
            row[columnMapping.supplierName] = project.supplierName || 'לא זמין';
            break;
          case 'paymentStatus':
            row[columnMapping.paymentStatus] = project.paymentStatus || 'לא זמין';
            break;
          case 'missingDocument':
            row[columnMapping.missingDocument] = project.missingDocument || 'לא זמין';
            break;
          default:
            break;
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(projectsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח פרויקטים");

    const fileName = `דוח_פרויקטים_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${projectsData.length} פרויקטים`, { className: "sonner-toast success rtl" });
  };

  const toggleColumn = (columnKey) => {
    setExportColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const selectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach(key => {
      newState[key] = true;
    });
    setExportColumns(newState);
  };

  const deselectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach(key => {
      newState[key] = false;
    });
    setExportColumns(newState);
  };

  const exportToExcel = () => {
    const projectsWithHebrewHeaders = sortedProjects.map(project => ({
      "שם הפרוייקט": project.name,
      "שם המזמין": project.invitingName,
      "תאריך יצירה": formatDate(project.createdAt),
      "תקציב": project.budget || 'אין תקציב',
      "תקציב שנותר": project.remainingBudget !== undefined ? project.remainingBudget : 'לא זמין',
      "איש קשר": project.Contact_person || 'לא זמין',
      "שם ספק": project.supplierName || 'לא זמין',
      "מצב תשלום": project.paymentStatus || 'לא זמין',
      "חוסר מסמך": project.missingDocument || 'לא זמין',
    }));

    const worksheet = XLSX.utils.json_to_sheet(projectsWithHebrewHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "פרוייקטים");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "סיכום פרוייקטים.xlsx");
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/projects');
        setProjects(response.data);
        setAllProjects(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error('שגיאה בשליפת פרויקטים', {
          className: "sonner-toast error rtl"
        });
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleDelete = async () => {
    try {
      if (projectToDelete) {
        await api.delete(`/projects/${projectToDelete}`);
        const updatedProjects = projects.filter(project => project._id !== projectToDelete);
        setProjects(updatedProjects);
        setAllProjects(updatedProjects);
        setShowModal(false);
        toast.success("הפרוייקט נמחק בהצלחה", {
          className: "sonner-toast success rtl"
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error('שגיאה במחיקת הפרויקט', {
        className: "sonner-toast error rtl"
      });
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-project/${id}`);
  };

  const handleView = (id) => {
    navigate(`/projects/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען רשימת פרויקטים...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    רשימת פרויקטים
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      ניהול וניתוח פרויקטים
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חיפוש לפי שם פרויקט, מזמין או איש קשר..."
                    className="w-full pr-12 pl-4 py-4 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Controls Bar */}
        <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Sort Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">מיין לפי:</span>
              </div>
              <select
                onChange={(e) => setSortBy(e.target.value)}
                value={sortBy}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="name">שם פרויקט</option>
                <option value="budget">תקציב</option>
                <option value="remainingBudget">תקציב שנותר</option>
                <option value="createdAt">תאריך יצירה</option>
              </select>
              <select
                onChange={(e) => setSortOrder(e.target.value)}
                value={sortOrder}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="asc">עולה</option>
                <option value="desc">יורד</option>
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>מחולל דוחות</span>
              </button>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>ייצוא מהיר</span>
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-slate-600 font-medium">
            מציג {sortedProjects.length} פרויקטים מתוך {allProjects.length}
          </div>
        </div>

        {/* Projects Table */}
        {sortedProjects.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <th className="px-4 py-4 text-sm font-bold text-white">שם הפרויקט</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">תקציב</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">תקציב שנותר</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">שם המזמין</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">תאריך יצירה</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">איש קשר</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((project) => (
                    <tr
                      key={project._id}
                      onClick={() => handleView(project._id)}
                      className="cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                        {project.name}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                        {project.budget ? formatNumber(project.budget) + " ₪" : "אין תקציב"}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-center">
                        {project.remainingBudget !== undefined ? (
                          project.remainingBudget < 0 ? (
                            <span className="text-red-600 flex items-center justify-center gap-1">
                              {formatNumber(project.remainingBudget)} ₪
                              <AlertCircle className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="text-emerald-600">{formatNumber(project.remainingBudget)} ₪</span>
                          )
                        ) : (
                          "אין תקציב"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                        {project.invitingName}
                      </td>
                      <td className="px-4 py-4 text-sm text-center text-slate-600">
                        {formatDate(project.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm text-center text-slate-600">
                        {project.Contact_person || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(project._id);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project._id);
                              setShowModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">
              {searchTerm ? "לא נמצאו תוצאות" : "עדיין אין פרויקטים"}
            </h2>
          </div>
        )}

        {/* Delete Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את הפרויקט לצמיתות.
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
                    onClick={() => setShowModal(false)}
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
};

export default ProjectsPage;