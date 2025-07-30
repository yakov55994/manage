import { useEffect, useState } from 'react';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { DownloadCloud, Edit2, Trash2, Filter, FileSpreadsheet, X } from "lucide-react";
import { toast } from 'sonner';

const ProjectsPage = ({ initialProjects = [] }) => {
  const [projects, setProjects] = useState(initialProjects);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // פילטרים מתקדמים
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
    budgetStatus: "all", // all, positive, negative, zero, noBudget
  });

  // עמודות לייצוא
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

  // רשימת עמודות זמינות
  const availableColumns = [
    { key: 'name', label: 'שם הפרויקט', selected: exportColumns.name },
    { key: 'invitingName', label: 'שם המזמין', selected: exportColumns.invitingName },
    { key: 'budget', label: 'תקציב', selected: exportColumns.budget },
    { key: 'remainingBudget', label: 'תקציב שנותר', selected: exportColumns.remainingBudget },
    { key: 'createdAt', label: 'תאריך יצירה', selected: exportColumns.createdAt },
    { key: 'contactPerson', label: 'איש קשר', selected: exportColumns.contactPerson },
    { key: 'budgetUsage', label: 'תקציב שנוצל', selected: exportColumns.budgetUsage },
    { key: 'budgetPercentage', label: 'אחוז ניצול תקציב', selected: exportColumns.budgetPercentage },
    { key: 'projectStatus', label: 'סטטוס פרויקט', selected: exportColumns.projectStatus },
  ];

  // פילטור פרויקטים עם פילטרים מתקדמים
  const getFilteredProjects = () => {
    let filtered = [...allProjects];

    // פילטרים מתקדמים (רק עבור מחולל הדוחות)
    if (showReportModal) {
      // תאריכי יצירה
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

      // טווח תקציב
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

      // טווח תקציב נותר
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

      // שם פרויקט
      if (advancedFilters.projectName) {
        filtered = filtered.filter(project => 
          project.name?.toLowerCase().includes(advancedFilters.projectName.toLowerCase())
        );
      }

      // שם מזמין
      if (advancedFilters.invitingName) {
        filtered = filtered.filter(project => 
          project.invitingName?.toLowerCase().includes(advancedFilters.invitingName.toLowerCase())
        );
      }

      // איש קשר
      if (advancedFilters.contactPerson) {
        filtered = filtered.filter(project => 
          project.Contact_person?.toLowerCase().includes(advancedFilters.contactPerson.toLowerCase())
        );
      }

      // סטטוס תקציב
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
    });
  };

  const sortedProjects = [...projects].sort((a, b) => {
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

  // חישוב נתונים נוספים לפרויקט
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

  // ייצוא מותאם אישית
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
        switch(col) {
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

  // ייצוא פשוט (הקיים)
  const exportToExcel = () => {
    const projectsWithHebrewHeaders = sortedProjects.map(project => ({
      "שם הפרוייקט": project.name,
      "שם המזמין": project.invitingName,
      "תאריך יצירה": formatDate(project.createdAt),
      "תקציב": project.budget || 'אין תקציב',
      "תקציב שנותר": project.remainingBudget !== undefined ? project.remainingBudget : 'לא זמין',
      "איש קשר": project.Contact_person || 'לא זמין'
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
    navigate(`/project/${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען רשימת פרוייקטים . . .</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b py-8">
      <div className="container mx-auto px-4">
        <div className="bg-slate-100 rounded-lg shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800">רשימת פרויקטים</h1>
              <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 mx-auto"></div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="text-slate-600" size={20} />
                  <label className="mr-4 font-bold">מיין לפי:</label>
                  <select
                    onChange={(e) => setSortBy(e.target.value)}
                    value={sortBy}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 ml-3"
                  >
                    <option value="name" className="font-bold">שם פרויקט</option>
                    <option value="budget" className="font-bold">תקציב</option>
                    <option value="remainingBudget" className="font-bold">תקציב שנותר</option>
                    <option value="createdAt" className="font-bold">תאריך יצירה</option>
                  </select>
                  <select
                    onChange={(e) => setSortOrder(e.target.value)}
                    value={sortOrder}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="asc" className="font-bold">עולה</option>
                    <option value="desc" className="font-bold">יורד</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium"
                >
                  <FileSpreadsheet size={20} />
                  <span>מחולל דוחות</span>
                </button>

                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium"
                >
                  <DownloadCloud size={20} />
                  <span>ייצוא מהיר</span>
                </button>
              </div>
            </div>

            {/* הצגת תוצאות */}
            <div className="mb-4 text-sm text-slate-600">
              מציג {sortedProjects.length} פרויקטים מתוך {allProjects.length}
            </div>

            {projects.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-l">
                      <th className="px-6 py-4 text-right">שם הפרויקט</th>
                      <th className="px-6 py-4 text-right">תקציב</th>
                      <th className="px-6 py-4 text-right">תקציב שנותר</th>
                      <th className="px-6 py-4 text-right">שם המזמין</th>
                      <th className="px-6 py-4 text-right">תאריך יצירה</th>
                      <th className="px-6 py-4 text-right">איש קשר</th>
                      <th className="px-6 py-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((project) => (
                      <tr
                        key={project._id}
                        onClick={() => handleView(project._id)}
                        className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium">{project.name}</td>
                        <td className="px-6 py-4 font-medium">
                          {project.budget ? formatNumber(project.budget) + " ₪" : "אין עדיין תקציב"}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {project.remainingBudget !== undefined ? (
                            project.remainingBudget < 0 ? (
                              <span className="text-red-800 font-bold">{formatNumber(project.remainingBudget) + " ₪ ❗"}</span>
                            ) : (
                              <span>{formatNumber(project.remainingBudget) + " ₪"}</span>
                            )
                          ) : (
                            "אין עדיין תקציב"
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-center">{project.invitingName}</td>
                        <td className="px-6 py-4 font-medium text-center">{formatDate(project.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-center">{project.Contact_person}</td>
                        <td className="px-6 py-4 font-medium text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(project._id);
                              }}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors duration-150"
                            >
                              <Edit2 size={25} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project._id);
                                setShowModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
                            >
                              <Trash2 size={25} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-medium text-slate-600">
                  עדיין אין פרויקטים...
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* מודל מחולל דוחות */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">מחולל דוחות פרויקטים</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              {/* פילטרים מתקדמים */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Filter size={20} />
                  פילטרים מתקדמים
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">תאריך יצירה מ:</label>
                    <input
                      type="date"
                      value={advancedFilters.dateFrom}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, dateFrom: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">תאריך יצירה עד:</label>
                    <input
                      type="date"
                      value={advancedFilters.dateTo}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, dateTo: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">תקציב מינימלי:</label>
                    <input
                      type="number"
                      value={advancedFilters.budgetMin}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, budgetMin: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">תקציב מקסימלי:</label>
                    <input
                      type="number"
                      value={advancedFilters.budgetMax}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, budgetMax: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">תקציב נותר מינימלי:</label>
                    <input
                      type="number"
                      value={advancedFilters.remainingBudgetMin}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, remainingBudgetMin: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">תקציב נותר מקסימלי:</label>
                    <input
                      type="number"
                      value={advancedFilters.remainingBudgetMax}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, remainingBudgetMax: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">שם פרויקט:</label>
                    <input
                      type="text"
                      value={advancedFilters.projectName}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, projectName: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="חיפוש חלקי..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">שם מזמין:</label>
                    <input
                      type="text"
                      value={advancedFilters.invitingName}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, invitingName: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="חיפוש חלקי..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">איש קשר:</label>
                    <input
                      type="text"
                      value={advancedFilters.contactPerson}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, contactPerson: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="חיפוש חלקי..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">סטטוס תקציב:</label>
                    <select
                      value={advancedFilters.budgetStatus}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, budgetStatus: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">הכל</option>
                      <option value="positive">תקציב חיובי</option>
                      <option value="negative">חריגה מתקציב</option>
                      <option value="zero">תקציב מוצה</option>
                      <option value="noBudget">אין תקציב</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={clearAdvancedFilters}
                    className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    <X size={16} />
                    נקה פילטרים
                  </button>
                </div>
              </div>

              {/* בחירת עמודות */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-4">בחר עמודות לייצוא:</h4>
                
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={selectAllColumns}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={deselectAllColumns}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    בטל הכל
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableColumns.map(column => (
                    <label key={column.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportColumns[column.key]}
                        onChange={() => toggleColumn(column.key)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* סיכום הדוח */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold mb-2">סיכום הדוח:</h4>
                <p className="text-sm">
                  <strong>מספר פרויקטים:</strong> {filteredProjects.length} <br/>
                  <strong>עמודות נבחרות:</strong> {Object.values(exportColumns).filter(v => v).length} <br/>
                  <strong>סכום תקציבים:</strong> {filteredProjects.reduce((sum, proj) => sum + (proj.budget || 0), 0).toLocaleString('he-IL')} ₪ <br/>
                  <strong>סכום תקציב נותר:</strong> {filteredProjects.reduce((sum, proj) => sum + (proj.remainingBudget !== undefined ? proj.remainingBudget : 0), 0).toLocaleString('he-IL')} ₪ <br/>
                  <strong>פרויקטים עם חריגה:</strong> {filteredProjects.filter(proj => proj.remainingBudget !== undefined && proj.remainingBudget < 0).length} <br/>
                  <strong>פרויקטים ללא תקציב:</strong> {filteredProjects.filter(proj => !proj.budget).length}
                </p>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={exportCustomReport}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <DownloadCloud size={20} />
                  ייצא דוח
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל מחיקה */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="mb-6">
                <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
                  <h3 className="text-3xl font-bold text-center mb-3">האם אתה בטוח?</h3>
                  <p className="mt-1 text-l text-center">שים לב! פעולה זו תמחק את הפרויקט לצמיתות.</p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-l font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150"
                >
                  מחק פרויקט
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-l font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;