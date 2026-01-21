import { useEffect, useRef, useState } from "react";
import { Hash, Calendar } from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { value: "check", label: "צ׳ק" },
  { value: "bank_transfer", label: "העברה בנקאית" },
];

export default function PaymentCaptureModal({
  open,
  onClose,
  onSave,            // (payload) => void   payload = { paymentDate, paymentMethod, checkNumber?, checkDate? }
  defaultDate,       // optional 'YYYY-MM-DD'
  defaultMethod,     // optional 'check' | 'bank_transfer'
  title = "פרטי תשלום",
}) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0,10));
  const [method, setMethod] = useState(defaultMethod || "");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDate(defaultDate || new Date().toISOString().slice(0,10));
      setMethod(defaultMethod || "");
      setCheckNumber("");
      setCheckDate("");
    }
  }, [open, defaultDate, defaultMethod]);

  // 🔥 נקה שדות צ'ק כשמשנים את אמצעי התשלום
  useEffect(() => {
    if (method !== "check") {
      setCheckNumber("");
      setCheckDate("");
    }
  }, [method]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape" && open) onClose?.(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!method) {
      toast.error("יש לבחור אמצעי תשלום");
      return;
    }
    if (!date) {
      toast.error("יש לבחור תאריך תשלום");
      return;
    }

    // ✅ ולידציה - אם צ'ק חייב מספר צ'ק
    if (method === "check" && !checkNumber.trim()) {
      toast.error("יש להזין מספר צ'ק");
      return;
    }

    onSave?.({
      paymentDate: date,
      paymentMethod: method,
      checkNumber: method === "check" ? checkNumber : undefined,
      checkDate: method === "check" ? checkDate : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        className="relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <h3 id="payment-modal-title" className="text-2xl font-bold text-slate-800 text-center mb-4">
          {title}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">אמצעי תשלום</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">בחר…</option>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תאריך תשלום</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              onFocus={(e) => e.target.showPicker?.()}
            />
          </div>

          {/* 🆕 שדות צ'ק - מוצגים רק אם בחרו "צ'ק" */}
          {method === "check" && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 space-y-4">
              {/* מספר צ'ק */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Hash className="w-4 h-4 text-blue-600" />
                  מספר צ'ק <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="הזן מספר צ'ק"
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* תאריך פירעון צ'ק */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  תאריך פירעון צ'ק
                </label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  onFocus={(e) => e.target.showPicker?.()}
                />
                <p className="text-xs text-slate-500 mt-1">
                  אופציונלי - תאריך פירעון הצ'ק
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={submit}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition"
          >
            שמור
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentMethodBadge({ method, checkNumber }) {
  if (!method) return null;
  
  let label = method === "check" 
    ? checkNumber ? `צ׳ק ${checkNumber}` : "צ׳ק"
    : method === "bank_transfer" 
    ? "העברה" 
    : method;
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
      {label}
    </span>
  );
}