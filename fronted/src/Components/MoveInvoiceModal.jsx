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

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // הביא רק שדות הכרחיים (שמור כמו שה־API שלך תומך)
        const { data } = await api.get("/projects");
        setProjects(
          Array.isArray(data.data) ? data.data : data?.projects || []
        );
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
    if (open) setSelectedProjectId("");
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

      const { data } = await api.put(`/invoices/${invoice._id}/move`, {
        fromProjectId: currentProjectId,
        toProjectId: selectedProjectId,
      });

      const moved = data?.data || data;

      const targetProject = projects.find(
        (p) => String(p._id) === String(selectedProjectId)
      );

      const updatedInvoice = {
        ...moved,
        projects: moved.projects, // מודל החדש
      };

      onMoved?.(updatedInvoice);

      toast.success(`החשבונית הועברה אל "${targetProject?.name}"`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהעברת חשבונית");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="mt-20 fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderCog className="text-slate-700" />
            <h3 className="text-2xl font-bold text-slate-800">
              העבר חשבונית לפרויקט
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-3 text-slate-600">
          חשבונית #{invoice?.invoiceNumber} •{" "}
          {invoice?.supplier?.name || invoice?.invitingName}
        </div>

        {/* חיפוש */}
        <div className="relative mb-3">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2"
            size={18}
          />
          <input
            type="text"
            placeholder="חפש פרויקט…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-lg pr-9 pl-3 py-2"
          />
        </div>

        {/* דרופדאון פרויקטים */}
        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              לא נמצאו פרויקטים
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <li key={p._id}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="targetProject"
                      className="ml-2"
                      checked={String(selectedProjectId) === String(p._id)}
                      onChange={() => setSelectedProjectId(p._id)}
                    />
                    <span className="font-medium">{p.name}</span>
                    {String(invoice?.projectId) === String(p._id) && (
                      <span className="text-xs mr-auto bg-slate-200 px-2 py-0.5 rounded">
                        נוכחי
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedProjectId}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "מעביר..." : "אישור העברה"}
          </button>
        </div>
      </div>
    </div>
  );
}
