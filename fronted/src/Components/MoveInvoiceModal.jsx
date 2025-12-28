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
  const [selectedProjectIds, setSelectedProjectIds] = useState([]); // שינוי ל-array
  const [step, setStep] = useState(1); // שלב 1: בחירת פרויקטים, שלב 2: קביעת סכומים
  const [projectAmounts, setProjectAmounts] = useState({}); // {projectId: amount}
  const [fundedFromProjectId, setFundedFromProjectId] = useState(null); // פרויקט ממומן למילגות

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
    // איפוס בחירה בעת פתיחה חדשה
    if (open && invoice) {
      // כלול את כל הפרויקטים הנוכחיים כברירת מחדל
      const currentProjectIds = invoice.projects?.map(p => {
        const pid = p.projectId?._id || p.projectId;
        return String(pid);
      }) || [];

      setSelectedProjectIds(currentProjectIds);
      setProjectAmounts({});
      setFundedFromProjectId(invoice.fundedFromProjectId?._id || invoice.fundedFromProjectId || null);
      setStep(1);
    }
  }, [open, invoice]);

  const filtered = useMemo(() => {
    if (!search) return projects;
    const s = search.toLowerCase();
    return projects.filter((p) => p.name?.toLowerCase().includes(s));
  }, [projects, search]);

  // בדוק אם יש פרויקט מילגה ברשימה הנבחרת
  const hasMilgaProject = useMemo(() => {
    return selectedProjectIds.some(id => {
      const project = projects.find(p => String(p._id) === String(id));
      return project?.isMilga || project?.type === "milga";
    });
  }, [selectedProjectIds, projects]);

  const handleNextStep = () => {
    if (selectedProjectIds.length === 0) {
      toast.error("יש לבחור לפחות פרויקט אחד");
      return;
    }

    // אתחול הסכומים - ניתן סכום ברירת מחדל שווה לכל הפרויקטים
    const defaultAmount = Math.floor(invoice.totalAmount / selectedProjectIds.length);
    const amounts = {};
    selectedProjectIds.forEach((id, index) => {
      // לפרויקט האחרון נותנים את השארית
      if (index === selectedProjectIds.length - 1) {
        const sumSoFar = Object.values(amounts).reduce((a, b) => a + b, 0);
        amounts[id] = invoice.totalAmount - sumSoFar;
      } else {
        amounts[id] = defaultAmount;
      }
    });
    setProjectAmounts(amounts);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!invoice?._id) return;

    // בדוק שהסכום הכולל שווה לסכום החשבונית
    const totalAllocated = Object.values(projectAmounts).reduce((sum, amt) => sum + Number(amt), 0);
    if (Math.abs(totalAllocated - invoice.totalAmount) > 0.01) {
      toast.error(`סכום הפרויקטים (${totalAllocated}) חייב להיות שווה לסכום החשבונית (${invoice.totalAmount})`);
      return;
    }

    // בדוק שכל הסכומים חיוביים
    for (const [projectId, amount] of Object.entries(projectAmounts)) {
      if (Number(amount) <= 0) {
        toast.error("כל הסכומים חייבים להיות גדולים מ-0");
        return;
      }
    }

    // בדוק אם יש פרויקט מילגה ולא נבחר פרויקט ממומן
    if (hasMilgaProject && !fundedFromProjectId) {
      toast.error("יש לבחור פרויקט ממומן עבור פרויקט המילגה");
      return;
    }

    try {
      setLoading(true);

      // הכן את מערך הפרויקטים עם הסכומים
      const targetProjects = selectedProjectIds.map(id => ({
        projectId: id,
        sum: Number(projectAmounts[id])
      }));

      const payload = {
        targetProjects, // מערך של {projectId, sum}
        fundedFromProjectId: hasMilgaProject ? fundedFromProjectId : null,
      };

      const { data } = await api.put(`/invoices/${invoice._id}/move`, payload);

      const moved = data?.data || data;

      const updatedInvoice = {
        ...moved,
        projects: moved.projects,
      };

      onMoved?.(updatedInvoice);

      toast.success(`החשבונית פוצלה ל-${selectedProjectIds.length} פרויקטים`);
      onClose();
    } catch (err) {
      console.error("Move invoice error:", err);
      const errorMsg = err.response?.data?.error || err.message || "שגיאה בהעברת חשבונית";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = () => {
    // אם בשלב 2 ויש בחירות - בקש אישור
    if (step === 2 && selectedProjectIds.length > 0) {
      const confirmClose = window.confirm("האם לבטל? כל השינויים שביצעת יאבדו");
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
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
            <div className="font-bold text-orange-600 mt-1">
              סה"כ: ₪{invoice?.totalAmount?.toLocaleString()}
            </div>
          </div>

          {/* שלב 1: בחירת פרויקטים */}
          {step === 1 && (
            <>
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

              {/* רשימת פרויקטים עם checkbox */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    לא נמצאו פרויקטים
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filtered.map((p) => {
                      const isCurrentProject = invoice?.projects?.some(proj => {
                        const pid = proj.projectId?._id || proj.projectId;
                        return String(pid) === String(p._id);
                      });

                      return (
                        <li key={p._id}>
                          <label className={`flex items-center gap-2 p-2.5 cursor-pointer hover:bg-orange-50 transition-colors ${isCurrentProject ? 'bg-orange-50' : ''}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-orange-500"
                              checked={selectedProjectIds.includes(p._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProjectIds([...selectedProjectIds, p._id]);
                                } else {
                                  setSelectedProjectIds(selectedProjectIds.filter(id => id !== p._id));
                                }
                              }}
                            />
                            <span className="font-medium text-sm flex-1">{p.name}</span>
                            {(p.isMilga || p.type === "milga") && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                מילגה
                              </span>
                            )}
                            {isCurrentProject && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                נוכחי
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {selectedProjectIds.length > 0 && (
                <div className="mt-3 text-sm text-slate-600 bg-blue-50 p-2 rounded">
                  נבחרו {selectedProjectIds.length} פרויקטים
                </div>
              )}
            </>
          )}

          {/* שלב 2: קביעת סכומים */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 mb-2">
                קבע כמה כל פרויקט ישלם:
              </div>
              {selectedProjectIds.map((projectId) => {
                const project = projects.find(p => String(p._id) === String(projectId));
                return (
                  <div key={projectId} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{project?.name}</span>
                      {(project?.isMilga || project?.type === "milga") && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          מילגה
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₪</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={projectAmounts[projectId] || 0}
                        onChange={(e) => setProjectAmounts({
                          ...projectAmounts,
                          [projectId]: Number(e.target.value)
                        })}
                        className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                );
              })}

              {/* בחירת פרויקט ממומן - רק אם יש פרויקט מילגה */}
              {hasMilgaProject && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    פרויקט ממומן (עבור פרויקטי מילגה):
                  </div>
                  <select
                    value={fundedFromProjectId || ""}
                    onChange={(e) => setFundedFromProjectId(e.target.value || null)}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">בחר פרויקט ממומן</option>
                    {projects
                      .filter(p => !p.isMilga && p.type !== "milga")
                      .map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))
                    }
                  </select>
                  <div className="text-xs text-blue-700 mt-1">
                    הפרויקט שממנו יורד התקציב עבור המילגה
                  </div>
                </div>
              )}

              {/* סיכום */}
              <div className="border-t-2 border-slate-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">סה"כ מחולק:</span>
                  <span className={`font-bold text-lg ${
                    Math.abs(Object.values(projectAmounts).reduce((sum, amt) => sum + Number(amt), 0) - invoice.totalAmount) < 0.01
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    ₪{Object.values(projectAmounts).reduce((sum, amt) => sum + Number(amt), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="text-slate-600">נדרש:</span>
                  <span className="font-medium">₪{invoice?.totalAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex justify-end gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
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
            {step === 1 ? (
              <button
                onClick={handleNextStep}
                disabled={selectedProjectIds.length === 0}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-sm"
              >
                המשך
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-sm"
              >
                {loading ? "מעביר..." : "אישור העברה"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
