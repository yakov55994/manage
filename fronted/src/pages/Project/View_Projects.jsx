import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api'; import { ClipLoader } from 'react-spinners';  // ייבוא של האנימציה החדשה
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";
import { DownloadCloud, Edit2, Trash2, Eye, ChevronDown, Filter } from "lucide-react";
import { toast } from 'sonner';


const ProjectsPage = ({ initialProjects = [], }) => {

  const [projects, setProjects] = useState(initialProjects);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("sum");
  const [sortproject, setSortproject] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString('he-IL');

  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };



  const sortedprojects = [...projects].sort((a, b) => {
    if (sortBy === "sum") {
      return sortproject === "asc" ? a.sum - b.sum : b.sum - a.sum;
    }
    if (sortBy === "createdAt") {
      return sortproject === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  const exportToExcel = () => {
    const projectsWithHebrewHeaders = sortedprojects.map(project => ({
      "שם הפרוייקט": project.projectName,
      "שם המזמין": project.invitingName,
      "תאריך יצירה ": formatDate(project.createdAt),
      "תקציב": project.budget,
      "תקציב שנותר": project.remainingBudget,
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
        setProjects(projects.filter(project => project._id !== projectToDelete)); // עדכון הרשימה לאחר המחיקה
        setShowModal(false); // סגירת המודאל לאחר המחיקה
        toast.success("הפרוייקט נמחק בהצלחה", {
          className: "sonner-toast success rtl"
        }) // הצגת הודעת הצלחה
        setTimeout(() => 3000); // מחיקת הודעת הצלחה אחרי 3 שניות
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
  }

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
                  <div className="space-y-2">
                    <select
                      onChange={(e) => setSortBy(e.target.value)}
                      value={sortBy}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 ml-3"
                    >
                      <option value="sum" className='font-bold'>סכום</option>
                      <option value="createdAt" className='font-bold'>תאריך יצירה</option>
                    </select>
                    <select
                      onChange={(e) => setSortproject(e.target.value)}
                      value={sortproject}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="asc" className='font-bold'>עולה</option>
                      <option value="desc" className='font-bold'>יורד</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium"
              >
                <DownloadCloud size={20} />
                <span>ייצוא לאקסל</span>
              </button>
            </div>

            {projects.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-l ">
                      <th className="px-6 py-4 text-right ">שם הפרויקט</th>
                      <th className="px-6 py-4 text-right">תקציב</th>
                      <th className="px-6 py-4 text-right">תקציב שנותר</th>
                      <th className="px-6 py-4 text-right">שם המזמין</th>
                      <th className="px-6 py-4 text-right">תאריך יצירה</th>
                      <th className="px-6 py-4 text-right">איש קשר</th>
                      <th className="px-6 py-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedprojects.map((project) => (
                      <tr
                        key={project._id}
                        onClick={() => handleView(project._id)}  // השורה כולה לחיצה
                        className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium">{project.name}</td>
                        <td className="px-6 py-4 font-medium">
                          {project.budget ? formatNumber(project.budget) + " ₪" : "אין עדיין תקציב"}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {
                            project.remainingBudget !== undefined ? (
                              project.remainingBudget < 0 ? (
                                // אם התקציב הנותר שלילי, הצג את התקציב באדום
                                <span className="text-red-800 font-bold">{formatNumber(project.remainingBudget) + " ₪ ❗" }</span>
                              ) : (
                                // אם התקציב הנותר חיובי או אפס, הצג את התקציב בצבע רגיל
                                <span>{formatNumber(project.remainingBudget) + " ₪ "}</span>
                              )
                            ) : (
                              // אם אין תקציב נותר, הצג "אין עדיין תקציב"
                              "אין עדיין תקציב"
                            )
                          }
                        </td>
                        <td className="px-6 py-4 font-medium text-center">{project.invitingName}</td>
                        <td className="px-6 py-4 font-medium text-center">{formatDate(project.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-center">{project.Contact_person}</td>
                        <td className="px-6 py-4 font-medium text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // מונע פתיחת הדף בעת לחיצה על כפתור העריכה
                                handleEdit(project._id);
                              }}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors duration-150"
                            >
                              <Edit2 size={25} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // מונע פתיחת הדף בעת לחיצה על כפתור המחיקה
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

        {/* Simple Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="mb-6">
                <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
                  <h3 className="text-3xl font-bold text-center mb-3">האם אתה בטוח?</h3>
                  <p className="mt-1 text-l text-center ">שים לב! פעולה זו תמחק את הפרויקט לצמיתות.</p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDelete} // שים לב כאן אנחנו קוראים לפונקציה בלי פרמטרים
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