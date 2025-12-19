import { useEffect, useMemo, useState } from "react";
import { X, Search, FolderCog } from "lucide-react";
import api from "../api/api.js";
import { toast } from "sonner";

export default function MoveInvoiceModal({
  open,
  onClose,
  invoice, // אובייקט חשבונית מלאה
  onMoved, // callback לקבלת החשבונית המעודכנת מהשרת
}) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [fundingProjectId, setFundingProjectId] = useState("");
  const [showFundingSelection, setShowFundingSelection] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // הביא רק שדות הכרחיים (שמור כמו שה־API שלך תומך)
        const { data } = await api.get("/projects");
        const projectsList = Array.isArray(data.data) ? data.data : data?.projects || [];
        console.log("📌 Projects loaded:", projectsList.length);
        console.log("📌 Projects with isMilga:", projectsList.filter(p => p.isMilga).map(p => p.name));
        console.log("📌 Projects WITHOUT isMilga:", projectsList.filter(p => !p.isMilga).length);
        setProjects(projectsList);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת פרויקטים", {
          className: "sonner-toast error rtl",
        });
      }
    })();
  }, [open]);

  useEffect(() => {
    // איפוס בחירה בעת פתיחה חדשה (אבל לא כשסוגרים ופותחים שוב)
    if (open) {
      setSelectedProjectId("");
      setFundingProjectId("");
      setShowFundingSelection(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return projects;
    const s = search.toLowerCase();
    return projects.filter((p) => p.name?.toLowerCase().includes(s));
  }, [projects, search]);

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      toast.error("יש לבחור פרויקט יעד");
      return;
    }

    // בדוק אם הפרויקט היעד הוא מילגה
    const targetProject = projects.find(
      (p) => String(p._id) === String(selectedProjectId)
    );

    const isMilgaProject = targetProject?.isMilga || targetProject?.type === "milga";

    if (isMilgaProject && !showFundingSelection) {
      // אם זה פרויקט מילגה ועוד לא בחרנו פרויקט ממומן
      setShowFundingSelection(true);
      return;
    }

    if (isMilgaProject && !fundingProjectId) {
      toast.error("יש לבחור פרויקט ממומן (מאיזה תקציב להוריד)");
      return;
    }

    if (!invoice?._id) return;

    // projectId אמיתי מתוך המבנה החדש
    const currentProjectId =
      invoice?.projects?.[0]?.projectId?._id ||
      invoice?.projects?.[0]?.projectId;

    if (!currentProjectId) {
      toast.error("לא נמצא projectId לחשבונית");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        fromProjectId: currentProjectId,
        toProjectId: selectedProjectId,
      };

      // אם זה פרויקט מילגה, הוסף את fundedFromProjectId
      if (isMilgaProject) {
        payload.fundedFromProjectId = fundingProjectId;
      }

      const { data } = await api.put(`/invoices/${invoice._id}/move`, payload);

      const moved = data?.data || data;

      const updatedInvoice = {
        ...moved,
        projects: moved.projects, // מודל החדש
      };

      onMoved?.(updatedInvoice);

      toast.success(`החשבונית הועברה אל "${targetProject?.name}"`);
      onClose();
      // איפוס מצב
      setShowFundingSelection(false);
      setFundingProjectId("");
    } catch (err) {
      console.error("Move invoice error:", err);
      const errorMsg = err.response?.data?.error || err.message || "שגיאה בהעברת חשבונית";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FolderCog className="text-orange-600" size={20} />
            <h3 className="text-xl font-bold text-slate-800">
              העבר חשבונית
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            חשבונית #{invoice?.invoiceNumber} • {invoice?.supplier?.name || invoice?.invitingName}
          </div>

          {/* חיפוש */}
          {!showFundingSelection && (
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
          )}

          {/* דרופדאון פרויקטים */}
          {!showFundingSelection ? (
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  לא נמצאו פרויקטים
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <li key={p._id}>
                      <label className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-orange-50 transition-colors">
                        <input
                          type="radio"
                          name="targetProject"
                          className="w-4 h-4 accent-orange-500"
                          checked={String(selectedProjectId) === String(p._id)}
                          onChange={() => setSelectedProjectId(p._id)}
                        />
                        <span className="font-medium text-sm flex-1">{p.name}</span>
                        {(p.isMilga || p.type === "milga") && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            מילגה
                          </span>
                        )}
                        {invoice?.projects?.some(proj => {
                          const pid = proj.projectId?._id || proj.projectId;
                          return String(pid) === String(p._id);
                        }) && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            נוכחי
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              {/* בחירת פרויקט ממומן */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">
                  פרויקט מילגה נבחר - בחר מאיזה פרויקט להוריד את התקציב:
                </p>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                {projects.filter(p => !p.isMilga && p.type !== "milga").length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    לא נמצאו פרויקטים רגילים
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {projects.filter(p => !p.isMilga && p.type !== "milga").map((p) => (
                      <li key={p._id}>
                        <label className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-orange-50 transition-colors">
                          <input
                            type="radio"
                            name="fundingProject"
                            className="w-4 h-4 accent-orange-500"
                            checked={String(fundingProjectId) === String(p._id)}
                            onChange={() => setFundingProjectId(p._id)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block truncate">{p.name}</span>
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
            </>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex justify-end gap-2">
            {showFundingSelection && (
              <button
                onClick={() => {
                  setShowFundingSelection(false);
                  setFundingProjectId("");
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                חזור
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedProjectId || (showFundingSelection && !fundingProjectId)}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-sm"
            >
              {loading ? "מעביר..." : showFundingSelection ? "אישור העברה" : "המשך"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
