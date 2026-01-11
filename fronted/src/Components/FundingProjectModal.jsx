import { useMemo, useState } from "react";
import { X, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

/**
 * מודל לבחירת פרויקט/ים ממומן/ים עבור פרויקטי מילגה
 * @param {Boolean} open - האם המודל פתוח
 * @param {Function} onClose - סגירת המודל
 * @param {Array} projects - רשימת כל הפרויקטים
 * @param {Function} onSelect - callback עם הפרויקט/ים שנבחר/ו
 * @param {String} milgaProjectName - שם פרויקט המילגה
 * @param {Boolean} multiSelect - האם לאפשר בחירה מרובה (ברירת מחדל: false)
 */
export default function FundingProjectModal({
  open,
  onClose,
  projects = [],
  onSelect,
  milgaProjectName = "",
  multiSelect = false,
}) {
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  // סינון רק פרויקטים שאינם מילגה
  const regularProjects = useMemo(() => {
    return projects.filter((p) => !p.isMilga && p.type !== "milga");
  }, [projects]);

  // סינון לפי חיפוש
  const filtered = useMemo(() => {
    if (!search) return regularProjects;
    const s = search.toLowerCase();
    return regularProjects.filter((p) => p.name?.toLowerCase().includes(s));
  }, [regularProjects, search]);

  const handleSubmit = () => {
    if (multiSelect) {
      if (selectedProjectIds.length === 0) {
        toast.error("יש לבחור לפחות פרויקט אחד");
        return;
      }

      const selectedProjects = projects.filter((p) =>
        selectedProjectIds.includes(p._id)
      );
      onSelect?.(selectedProjects);
    } else {
      if (!selectedProjectId) {
        toast.error("יש לבחור פרויקט ממומן");
        return;
      }

      const selectedProject = projects.find((p) => p._id === selectedProjectId);
      onSelect?.(selectedProject);
    }

    onClose();

    // איפוס
    setSelectedProjectId("");
    setSelectedProjectIds([]);
    setSearch("");
  };

  const handleClose = () => {
    setSelectedProjectId("");
    setSelectedProjectIds([]);
    setSearch("");
    onClose();
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds((prev) => {
      if (prev.includes(projectId)) {
        return prev.filter((id) => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Wallet className="text-orange-600" size={20} />
            <h3 className="text-xl font-bold text-slate-800">
              בחר פרויקט ממומן
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-800 mb-1">פרויקט מילגה: {milgaProjectName}</p>
            <p className="text-xs text-blue-700">בחר מאיזה פרויקט להוריד את התקציב</p>
          </div>

          {/* חיפוש */}
          <div className="relative mb-3">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="חפש פרויקט…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* רשימת פרויקטים */}
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                לא נמצאו פרויקטים רגילים
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <li key={p._id}>
                    <label className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-orange-50 transition-colors">
                      {multiSelect ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-orange-500"
                          checked={selectedProjectIds.includes(p._id)}
                          onChange={() => toggleProjectSelection(p._id)}
                        />
                      ) : (
                        <input
                          type="radio"
                          name="fundingProject"
                          className="w-4 h-4 accent-orange-500"
                          checked={String(selectedProjectId) === String(p._id)}
                          onChange={() => setSelectedProjectId(p._id)}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block truncate">
                          {p.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          תקציב זמין: ₪{p.remainingBudget?.toLocaleString() || 0}
                        </span>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={multiSelect ? selectedProjectIds.length === 0 : !selectedProjectId}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-sm"
            >
              אישור
              {multiSelect && selectedProjectIds.length > 0 && ` (${selectedProjectIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
