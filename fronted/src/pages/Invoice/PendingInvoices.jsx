import { useState, useEffect, useCallback } from "react";
import api from "../../api/api.js";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Users,
  Pencil,
} from "lucide-react";

const DOCUMENT_TYPES = [
  "ח. עסקה",
  "ה. עבודה",
  "ד. תשלום",
  "חשבונית מס / קבלה",
];

const STATUS_CONFIG = {
  "ממתין לאישור": {
    label: "ממתין לאישור",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    icon: Clock,
  },
  "לא מאושר": {
    label: "לא מאושר",
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
    icon: XCircle,
  },
};

const PUBLIC_FORM_URL = `${window.location.origin}/submit-invoice`;

function FilePreview({ file }) {
  if (!file) return <p className="text-gray-500 text-sm italic">לא צורף קובץ</p>;

  const isImage = file.type?.startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-600">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50">
        <span className="text-xs text-gray-400 truncate max-w-xs">{file.name}</span>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 shrink-0"
        >
          <ExternalLink size={12} />
          פתח חדש
        </a>
      </div>
      {isImage && (
        <img src={file.url} alt={file.name} className="w-full max-h-96 object-contain bg-gray-900" />
      )}
      {isPdf && (
        <iframe
          src={file.url}
          title={file.name}
          className="w-full h-96 bg-white"
        />
      )}
      {!isImage && !isPdf && (
        <div className="flex items-center justify-center h-24 bg-gray-800">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm"
          >
            <FileText size={16} />
            הורד קובץ
          </a>
        </div>
      )}
    </div>
  );
}

function RejectModal({ onConfirm, onClose }) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-6 h-6 text-red-400" />
          <h3 className="text-lg font-bold text-white">סיבת דחייה</h3>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="הסבר מדוע החשבונית לא מאושרת..."
          className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-all resize-none mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
          >
            אשר דחייה
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-all"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplierSyncModal({ invoice, matches, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-lg w-full">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-bold text-white">נמצא ספק קיים במערכת</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          נמצא ספק קיים עם אותו מספר חשבון בנק או מספר עוסק כמו "{invoice?.supplierName}". האם לסנכרן את החשבונית עם הספק הקיים, או ליצור ספק חדש?
        </p>

        <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
          {matches.map((s) => (
            <div
              key={s._id}
              className="bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ח.פ./עוסק: {s.business_tax || "—"}
                    {s.bankDetails?.accountNumber && ` • חשבון: ${s.bankDetails.accountNumber}`}
                  </p>
                </div>
                <button
                  onClick={() => onConfirm("existing", s._id)}
                  disabled={loading}
                  className="shrink-0 px-3 py-1.5 bg-green-500/20 hover:bg-green-500 border border-green-500/40 text-green-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  סנכרן עם ספק זה
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm("new")}
            disabled={loading}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            צור ספק חדש בכל זאת
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-all"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ invoice, onSave, onClose, saving }) {
  const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  const [form, setForm] = useState({
    submitterName: invoice.submitterName || "",
    submitterPhone: invoice.submitterPhone || "",
    submitterEmail: invoice.submitterEmail || "",
    supplierName: invoice.supplierName || "",
    supplierTaxId: invoice.supplierTaxId || "",
    supplierAddress: invoice.supplierAddress || "",
    supplierPhone: invoice.supplierPhone || "",
    supplierEmail: invoice.supplierEmail || "",
    bankName: invoice.bankName || "",
    bankBranch: invoice.bankBranch || "",
    bankAccount: invoice.bankAccount || "",
    projectName: invoice.projectName || "",
    invoiceNumber: invoice.invoiceNumber || "",
    invoiceDate: toDateInput(invoice.invoiceDate),
    totalAmount: invoice.totalAmount ?? "",
    documentType: invoice.documentType || "",
    detail: invoice.detail || "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const inputClass =
    "w-full px-3 py-2 bg-gray-700/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-orange-500 transition-all";

  const handleSubmit = (e) => {
    e.preventDefault();
    const required = ["submitterName", "supplierName", "supplierTaxId", "bankName", "bankBranch", "bankAccount", "invoiceNumber", "invoiceDate", "totalAmount", "documentType"];
    for (const field of required) {
      if (!String(form[field] ?? "").trim()) {
        setError("נא למלא את כל השדות המסומנים כחובה");
        return;
      }
    }
    setError("");
    onSave({ ...form, totalAmount: parseFloat(form.totalAmount), projectId: invoice.projectId || null });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <Pencil className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-bold text-white">עריכת פרטי חשבונית</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 mb-2">ממלא הטופס</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">שם *</label>
                <input name="submitterName" value={form.submitterName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">טלפון</label>
                <input name="submitterPhone" value={form.submitterPhone} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">אימייל</label>
                <input name="submitterEmail" type="email" value={form.submitterEmail} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 mb-2">פרטי ספק</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">שם *</label>
                <input name="supplierName" value={form.supplierName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">ח.פ. / ת.ז. *</label>
                <input name="supplierTaxId" value={form.supplierTaxId} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">טלפון</label>
                <input name="supplierPhone" value={form.supplierPhone} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">אימייל</label>
                <input name="supplierEmail" type="email" value={form.supplierEmail} onChange={handleChange} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">כתובת</label>
                <input name="supplierAddress" value={form.supplierAddress} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 mb-2">פרטי בנק</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">בנק *</label>
                <input name="bankName" value={form.bankName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">סניף *</label>
                <input name="bankBranch" value={form.bankBranch} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">מספר חשבון *</label>
                <input name="bankAccount" value={form.bankAccount} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 mb-2">פרטי חשבונית</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">מספר חשבונית *</label>
                <input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">תאריך *</label>
                <input name="invoiceDate" type="date" value={form.invoiceDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">סכום (₪) *</label>
                <input name="totalAmount" type="number" min="0" step="0.01" value={form.totalAmount} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">סוג מסמך *</label>
                <select name="documentType" value={form.documentType} onChange={handleChange} className={inputClass}>
                  <option value="">בחר סוג מסמך</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">פרויקט משויך</label>
                <input name="projectName" value={form.projectName} onChange={handleChange} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">פירוט / הערות</label>
                <textarea name="detail" value={form.detail} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-all"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onApprove, onReject, onSetPending, onEdit, loading }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG["ממתין לאישור"];
  const StatusIcon = config.icon;
  const isActionLoading = loading === invoice._id;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("he-IL") : "—";
  const formatAmount = (n) => n?.toLocaleString("he-IL", { style: "currency", currency: "ILS" }) || "—";

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden transition-all`}>
      {/* שורת כותרת */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon className={`w-5 h-5 ${config.text} shrink-0`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white truncate">{invoice.supplierName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
                {invoice.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-sm text-gray-400">חשבונית #{invoice.invoiceNumber}</span>
              <span className="text-sm font-semibold text-orange-300">{formatAmount(invoice.totalAmount)}</span>
              <span className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mr-2">
          {/* כפתורי פעולה */}
          {invoice.status === "ממתין לאישור" && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(invoice); }}
                disabled={isActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500 border border-gray-500/40 text-gray-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <Pencil size={14} />
                עריכה
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(invoice._id); }}
                disabled={isActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500 border border-green-500/40 text-green-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <CheckCircle size={14} />
                מאושר
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(invoice._id); }}
                disabled={isActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <XCircle size={14} />
                לא מאושר
              </button>
            </>
          )}
          {invoice.status === "לא מאושר" && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(invoice); }}
                disabled={isActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500 border border-gray-500/40 text-gray-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <Pencil size={14} />
                עריכה
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(invoice._id); }}
                disabled={isActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500 border border-green-500/40 text-green-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <CheckCircle size={14} />
                מאושר
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSetPending(invoice._id); }}
                disabled={isActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500 border border-yellow-500/40 text-yellow-300 hover:text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <Clock size={14} />
                ממתין
              </button>
            </>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* פרטים מורחבים */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-700/50 pt-4 space-y-5">
          {/* הערות דחייה */}
          {invoice.status === "לא מאושר" && invoice.rejectionNotes && (
            <div className="flex gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400 mb-1">סיבת דחייה</p>
                <p className="text-sm text-red-300">{invoice.rejectionNotes}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* פרטי ספק */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-gray-300">פרטי ספק</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <Row label="ממלא הטופס" value={invoice.submitterName} />
                {invoice.submitterPhone && <Row label="טלפון ממלא הטופס" value={invoice.submitterPhone} />}
                {invoice.submitterEmail && <Row label="אימייל ממלא הטופס" value={invoice.submitterEmail} />}
                <Row label="שם" value={invoice.supplierName} />
                <Row label="ח.פ." value={invoice.supplierTaxId} />
                {invoice.supplierPhone && <Row label="טלפון" value={invoice.supplierPhone} />}
                {invoice.supplierEmail && <Row label="אימייל" value={invoice.supplierEmail} />}
                {invoice.supplierAddress && <Row label="כתובת" value={invoice.supplierAddress} />}
              </div>
            </div>

            {/* פרטי חשבונית */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-gray-300">פרטי חשבונית</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <Row label="מספר" value={`#${invoice.invoiceNumber}`} />
                <Row label="תאריך" value={formatDate(invoice.invoiceDate)} />
                <Row label="סכום" value={formatAmount(invoice.totalAmount)} highlight />
                <Row label="סוג מסמך" value={invoice.documentType} />
                {invoice.detail && <Row label="פירוט" value={invoice.detail} />}
                {invoice.projectName && <Row label="פרויקט" value={invoice.projectName} />}
              </div>
            </div>
          </div>

          {/* פרטי בנק */}
          {(invoice.bankName || invoice.bankBranch || invoice.bankAccount) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-gray-300">פרטי בנק</span>
              </div>
              <div className="flex gap-6 text-sm">
                {invoice.bankName && <Row label="בנק" value={invoice.bankName} />}
                {invoice.bankBranch && <Row label="סניף" value={invoice.bankBranch} />}
                {invoice.bankAccount && <Row label="חשבון" value={invoice.bankAccount} />}
              </div>
            </div>
          )}

          {/* קבצים */}
          <div>
            <p className="text-sm font-bold text-gray-300 mb-2">קבצים מצורפים</p>
            {invoice.files?.length ? (
              <div className="space-y-3">
                {invoice.files.map((f, i) => (
                  <FilePreview key={f.publicId || i} file={f} />
                ))}
              </div>
            ) : (
              <FilePreview file={null} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 shrink-0 min-w-[60px]">{label}:</span>
      <span className={highlight ? "text-orange-300 font-bold" : "text-gray-200"}>{value || "—"}</span>
    </div>
  );
}

export default function PendingInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState("הכל");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [copied, setCopied] = useState(false);
  const [supplierSync, setSupplierSync] = useState(null); // { invoiceId, invoice, matches }
  const [editTarget, setEditTarget] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "הכל" ? { status: filter } : {};
      const { data } = await api.get("/pending-invoices", { params });
      setInvoices(data);
    } catch {
      toast.error("שגיאה בטעינת החשבוניות");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleApprove = async (id, decision) => {
    setActionLoading(id);
    try {
      const body = decision
        ? { supplierDecision: decision.supplierDecision, supplierId: decision.supplierId }
        : {};
      await api.post(`/pending-invoices/${id}/approve`, body);
      toast.success("החשבונית אושרה ונוספה למערכת");
      setSupplierSync(null);
      fetchInvoices();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requiresSupplierDecision) {
        const invoice = invoices.find((i) => i._id === id);
        setSupplierSync({ invoiceId: id, invoice, matches: err.response.data.matchedSuppliers || [] });
        return;
      }
      toast.error(err.response?.data?.message || "שגיאה באישור החשבונית");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSupplierSyncConfirm = (supplierDecision, supplierId) => {
    if (!supplierSync) return;
    handleApprove(supplierSync.invoiceId, { supplierDecision, supplierId });
  };

  const handleRejectConfirm = async (notes) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget);
    setRejectTarget(null);
    try {
      await api.post(`/pending-invoices/${rejectTarget}/reject`, { notes });
      toast.success("החשבונית סומנה כלא מאושרת");
      fetchInvoices();
    } catch {
      toast.error("שגיאה בדחיית החשבונית");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (form) => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      await api.put(`/pending-invoices/${editTarget._id}`, form);
      toast.success("פרטי החשבונית עודכנו");
      setEditTarget(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || "שגיאה בעדכון החשבונית");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSetPending = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/pending-invoices/${id}/set-pending`);
      toast.success("החשבונית הוחזרה לממתין לאישור");
      fetchInvoices();
    } catch {
      toast.error("שגיאה בשינוי סטטוס");
    } finally {
      setActionLoading(null);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(PUBLIC_FORM_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const FILTERS = ["הכל", "ממתין לאישור", "לא מאושר"];
  const filterColors = {
    "הכל": "bg-gray-700 text-gray-300",
    "ממתין לאישור": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    "לא מאושר": "bg-red-500/20 text-red-300 border-red-500/40",
  };

  const counts = {
    "הכל": invoices.length,
    "ממתין לאישור": invoices.filter((i) => i.status === "ממתין לאישור").length,
    "לא מאושר": invoices.filter((i) => i.status === "לא מאושר").length,
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* כותרת */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">חשבוניות ממתינות לאישור</h1>
            <p className="text-gray-400 text-sm">בדוק, אשר או דחה חשבוניות שהוגשו דרך הקישור הציבורי</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInvoices}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-xl transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              רענן
            </button>
          </div>
        </div>

        {/* קישור לטופס */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-1">קישור ציבורי להגשת חשבוניות</p>
            <p className="text-sm text-orange-300 font-mono truncate">{PUBLIC_FORM_URL}</p>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500 border border-orange-500/40 text-orange-300 hover:text-white text-sm font-medium rounded-xl transition-all shrink-0"
          >
            <Copy size={14} />
            {copied ? "הועתק!" : "העתק קישור"}
          </button>
        </div>

        {/* סינון */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                filter === f
                  ? `${filterColors[f]} border-current font-bold`
                  : "bg-transparent border-gray-700 text-gray-500 hover:text-gray-300"
              }`}
            >
              {f}
              <span className="mr-1.5 text-xs opacity-70">({counts[f] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* רשימה */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">אין חשבוניות {filter !== "הכל" ? `בסטטוס "${filter}"` : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <InvoiceRow
                key={inv._id}
                invoice={inv}
                onApprove={handleApprove}
                onReject={(id) => setRejectTarget(id)}
                onSetPending={handleSetPending}
                onEdit={(inv) => setEditTarget(inv)}
                loading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {editTarget && (
        <EditModal
          invoice={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
          saving={savingEdit}
        />
      )}

      {supplierSync && (
        <SupplierSyncModal
          invoice={supplierSync.invoice}
          matches={supplierSync.matches}
          onConfirm={handleSupplierSyncConfirm}
          onClose={() => setSupplierSync(null)}
          loading={actionLoading === supplierSync.invoiceId}
        />
      )}
    </div>
  );
}
