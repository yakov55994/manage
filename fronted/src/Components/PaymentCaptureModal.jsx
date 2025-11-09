import React, { useEffect, useRef, useState } from "react";

const METHODS = [
  { value: "check", label: "צ׳ק" },
  { value: "bank_transfer", label: "העברה בנקאית" },
];

export default function PaymentCaptureModal({
  open,
  onClose,
  onSave,            // (payload) => void   payload = { paymentDate: 'YYYY-MM-DD', paymentMethod: 'check'|'bank_transfer' }
  defaultDate,       // optional 'YYYY-MM-DD'
  defaultMethod,     // optional 'check' | 'bank_transfer'
  title = "פרטי תשלום",
}) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0,10));
  const [method, setMethod] = useState(defaultMethod || "");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDate(defaultDate || new Date().toISOString().slice(0,10));
      setMethod(defaultMethod || "");
    }
  }, [open, defaultDate, defaultMethod]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape" && open) onClose?.(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!method) return alert("בחר אמצעי תשלום");
    if (!date) return alert("בחר תאריך תשלום");
    onSave?.({ paymentDate: date, paymentMethod: method });
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

export function PaymentMethodBadge({ method }) {
  if (!method) return null;
  const label = method === "check" ? "צ׳ק" : method === "bank_transfer" ? "העברה" : method;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
      {label}
    </span>
  );
}
