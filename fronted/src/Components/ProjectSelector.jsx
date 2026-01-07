import { useState, useEffect } from "react";
import { Search, Check, X } from "lucide-react";
import api from "../api/api";

/**
 * קומפוננטה אחידה לבחירת פרויקטים
 * @param {Array} projects - רשימת כל הפרויקטים (אופציונלי - אם לא מועבר, הקומפוננטה תטען בעצמה)
 * @param {Array} selectedProjects - פרויקטים נבחרים (עבור בחירה מרובה)
 * @param {String} selectedProjectId - ID פרויקט נבחר (עבור בחירה יחידה)
 * @param {String} value - ID פרויקט נבחר (alias ל-selectedProjectId)
 * @param {Function} onProjectsChange - callback לעדכון בחירה מרובה
 * @param {Function} onProjectChange - callback לעדכון בחירה יחידה
 * @param {Function} onSelect - callback לעדכון (מקבל את כל אובייקט הפרויקט או null)
 * @param {Boolean} multiSelect - האם לאפשר בחירה מרובה (default: false)
 * @param {Boolean} allowClear - האם לאפשר ניקוי בחירה (default: false)
 * @param {String} label - כותרת השדה
 * @param {String} placeholder - placeholder לחיפוש
 * @param {Boolean} showSelectAll - האם להציג כפתור "בחר הכל" (רק בבחירה מרובה)
 */
export default function ProjectSelector({
  projects: projectsProp,
  selectedProjects = [],
  selectedProjectId = "",
  value,
  onProjectsChange,
  onProjectChange,
  onSelect,
  multiSelect = false,
  allowClear = false,
  label = "בחר פרויקט",
  placeholder = "חפש פרויקט...",
  showSelectAll = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState(projectsProp || []);
  const [loading, setLoading] = useState(!projectsProp);

  // טען פרויקטים אם לא הועברו
  useEffect(() => {
    if (!projectsProp) {
      fetchProjects();
    }
  }, [projectsProp]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get("/projects");
      setProjects(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // עדכן projects אם הועברו כ-prop
  useEffect(() => {
    if (projectsProp) {
      setProjects(projectsProp);
    }
  }, [projectsProp]);

  // תמיכה ב-value prop
  const currentSelectedId = value !== undefined ? value : selectedProjectId;

  // סינון פרויקטים לפי חיפוש
  const filteredProjects = projects.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p._id?.toLowerCase().includes(q)
    );
  });

  // בדיקה אם פרויקט נבחר (תומך בשני מצבים)
  const isSelected = (projectId) => {
    if (multiSelect) {
      return selectedProjects.some((p) => p._id === projectId || p === projectId);
    } else {
      return currentSelectedId === projectId;
    }
  };

  // טיפול בלחיצה על פרויקט
  const handleToggle = (project) => {
    if (multiSelect) {
      // בחירה מרובה
      const isCurrentlySelected = isSelected(project._id);
      let updated;

      if (isCurrentlySelected) {
        // הסר מהרשימה
        updated = selectedProjects.filter(
          (p) => (p._id || p) !== project._id
        );
      } else {
        // הוסף לרשימה
        updated = [...selectedProjects, project];
      }

      onProjectsChange?.(updated);
    } else {
      // בחירה יחידה
      const newId = project._id === currentSelectedId ? "" : project._id;
      const newProject = newId ? project : null;

      // תמיכה בכל סוגי הcallbacks
      onProjectChange?.(newId);
      onSelect?.(newProject);
    }
  };

  // ניקוי בחירה
  const handleClear = () => {
    if (multiSelect) {
      onProjectsChange?.([]);
    } else {
      onProjectChange?.("");
      onSelect?.(null);
    }
  };

  // בחר הכל / בטל הכל
  const handleSelectAll = () => {
    if (!multiSelect) return;

    if (selectedProjects.length === filteredProjects.length && filteredProjects.length > 0) {
      // בטל הכל
      onProjectsChange?.([]);
    } else {
      // בחר הכל
      onProjectsChange?.(filteredProjects);
    }
  };

  const isAllSelected =
    multiSelect &&
    filteredProjects.length > 0 &&
    selectedProjects.length === filteredProjects.length;

  // מציאת הפרויקט הנבחר
  const selectedProject = !multiSelect && currentSelectedId
    ? projects.find(p => p._id === currentSelectedId)
    : null;

  return (
    <div className="w-full">
      {/* כותרת */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
        {allowClear && !multiSelect && currentSelectedId && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <X className="w-3 h-3" />
            נקה
          </button>
        )}
      </div>

      {/* הצגת פרויקט נבחר */}
      {!multiSelect && selectedProject && (
        <div className="mb-2 p-3 bg-orange-100 border-2 border-orange-300 rounded-xl flex items-center justify-between">
          <span className="text-sm font-bold text-orange-900">
            {selectedProject.name}
          </span>
          {allowClear && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-orange-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-orange-700" />
            </button>
          )}
        </div>
      )}

      {/* מיכל הבחירה */}
      <div className="relative bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl shadow-lg overflow-hidden">
        {/* אזור עליון - חיפוש + בחר הכל */}
        <div className="p-4 border-b-2 border-orange-100 bg-white/50 space-y-3">
          {/* בחר הכל - רק אם multiSelect */}
          {multiSelect && showSelectAll && (
            <label className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border-2 border-orange-200 cursor-pointer hover:bg-orange-100 transition-all">
              <div className="relative w-5 h-5">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
                {isAllSelected && (
                  <Check className="absolute inset-0 w-5 h-5 text-orange-600 pointer-events-none" />
                )}
              </div>
              <span className="font-bold text-orange-900">
                בחר הכל ({filteredProjects.length})
              </span>
            </label>
          )}

          {/* שדה חיפוש */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-right"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-5 h-5" />
          </div>
        </div>

        {/* רשימת פרויקטים */}
        <div className="p-5 max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p>טוען פרויקטים...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-gray-400 p-6">
              {searchTerm ? "לא נמצאו פרויקטים התואמים לחיפוש" : "אין פרויקטים זמינים"}
            </div>
          ) : (
            filteredProjects.map((project) => {
              const selected = isSelected(project._id);

              return (
                <label
                  key={project._id}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2
                    ${
                      selected
                        ? "bg-orange-100 border-orange-300 shadow-md"
                        : "bg-white border-orange-100 hover:bg-orange-50 hover:border-orange-200"
                    }
                  `}
                >
                  {/* Checkbox או Radio */}
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <input
                      type={multiSelect ? "checkbox" : "radio"}
                      checked={selected}
                      onChange={() => handleToggle(project)}
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />
                    {selected && (
                      <Check className="absolute inset-0 w-5 h-5 text-orange-600 pointer-events-none" />
                    )}
                  </div>

                  {/* פרטי הפרויקט */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-sm ${
                          selected ? "text-orange-900" : "text-slate-700"
                        }`}
                      >
                        {project.name}
                      </span>

                      {/* תגיות מיוחדות */}
                      {project.type === "milga" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-sm">
                          מילגה
                        </span>
                      )}
                      {project.type === "salary" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm">
                          משכורת
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <div className="text-xs text-slate-500 mt-1">
                        {project.description}
                      </div>
                    )}
                  </div>

                  {/* תקציב */}
                  {project.budget && (
                    <div className="text-left">
                      <span className="font-bold text-orange-700 text-sm">
                        ₪{project.budget?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* סיכום בחירה (רק בבחירה מרובה) */}
      {multiSelect && selectedProjects.length > 0 && (
        <div className="mt-3 text-center">
          <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
            נבחרו {selectedProjects.length} פרויקטים
          </span>
        </div>
      )}
    </div>
  );
}
