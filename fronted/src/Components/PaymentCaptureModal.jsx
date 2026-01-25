import { useEffect, useRef, useState } from "react";
import { Hash, Calendar, CreditCard, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { value: "check", label: "צ׳ק", icon: CreditCard },
  { value: "bank_transfer", label: "העברה בנקאית", icon: Building2 },
];

export default function PaymentCaptureModal({
  open,
  onClose,
  onSave, // (payload) => void   payload = { paymentDate, paymentMethod, checkNumber?, checkDate? }
  defaultDate, // optional 'YYYY-MM-DD'
  defaultMethod, // optional 'check' | 'bank_transfer'
  title = "פרטי תשלום",
}) {
  const [date, setDate] = useState(
    defaultDate || new Date().toISOString().slice(0, 10)
  );
  const [method, setMethod] = useState(defaultMethod || "");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [errors, setErrors] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef(null);

  // Animation on open
  useEffect(() => {
    if (open) {
      setDate(defaultDate || new Date().toISOString().slice(0, 10));
      setMethod(defaultMethod || "");
      setCheckNumber("");
      setCheckDate("");
      setErrors({});
      // Delay for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
    }
  }, [open, defaultDate, defaultMethod]);

  // Clear check fields when method changes
  useEffect(() => {
    if (method !== "check") {
      setCheckNumber("");
      setCheckDate("");
    }
    // Clear errors when method changes
    setErrors((prev) => ({ ...prev, method: null }));
  }, [method]);

  // Escape key handler
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const validateField = (name, value) => {
    let error = null;

    switch (name) {
      case "method":
        if (!value) error = "יש לבחור אמצעי תשלום";
        break;
      case "date":
        if (!value) error = "יש לבחור תאריך תשלום";
        break;
      case "checkNumber":
        if (method === "check" && !value?.trim()) error = "יש להזין מספר צ'ק";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const submit = () => {
    // Validate all fields
    const methodValid = validateField("method", method);
    const dateValid = validateField("date", date);
    const checkValid =
      method === "check" ? validateField("checkNumber", checkNumber) : true;

    if (!methodValid || !dateValid || !checkValid) {
      toast.error("יש לתקן את השגיאות בטופס", {
        className: "rtl text-right",
      });
      return;
    }

    onSave?.({
      paymentDate: date,
      paymentMethod: method,
      checkNumber: method === "check" ? checkNumber : undefined,
      checkDate: method === "check" ? checkDate : undefined,
    });
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with animation */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal with animation */}
      <div
        ref={dialogRef}
        className={`relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
          <h3
            id="payment-modal-title"
            className="text-2xl font-bold text-white text-center"
          >
            {title}
          </h3>
        </div>

        <div className="p-6 space-y-5">
          {/* Payment Method */}
          <div>
            <label className="form-label">
              <CreditCard className="w-4 h-4 text-orange-500" />
              אמצעי תשלום
              <span className="form-required">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 hover:border-orange-300 text-slate-600"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isSelected ? "text-orange-500" : "text-slate-400"
                      }`}
                    />
                    <span className="font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.method && (
              <div className="error-message">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.method}</span>
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="form-label">
              <Calendar className="w-4 h-4 text-orange-500" />
              תאריך תשלום
              <span className="form-required">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: null }));
              }}
              onBlur={() => validateField("date", date)}
              className={`form-input mt-2 ${errors.date ? "input-error" : ""}`}
              onFocus={(e) => e.target.showPicker?.()}
            />
            {errors.date && (
              <div className="error-message">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.date}</span>
              </div>
            )}
          </div>

          {/* Check Fields - shown only when check is selected */}
          {method === "check" && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4 space-y-4 animate-slideUp">
              {/* Check Number */}
              <div>
                <label className="form-label">
                  <Hash className="w-4 h-4 text-orange-500" />
                  מספר צ'ק
                  <span className="form-required">*</span>
                </label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => {
                    setCheckNumber(e.target.value);
                    setErrors((prev) => ({ ...prev, checkNumber: null }));
                  }}
                  onBlur={() => validateField("checkNumber", checkNumber)}
                  placeholder="הזן מספר צ'ק"
                  className={`form-input mt-2 ${
                    errors.checkNumber ? "input-error" : ""
                  }`}
                />
                {errors.checkNumber && (
                  <div className="error-message">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.checkNumber}</span>
                  </div>
                )}
              </div>

              {/* Check Due Date */}
              <div>
                <label className="form-label">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  תאריך פירעון צ'ק
                </label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="form-input mt-2"
                  onFocus={(e) => e.target.showPicker?.()}
                />
                <p className="text-xs text-slate-500 mt-2">
                  אופציונלי - תאריך פירעון הצ'ק
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 p-6 pt-0">
          <button onClick={submit} className="btn-primary flex-1 max-w-[150px]">
            שמור
          </button>
          <button
            onClick={handleClose}
            className="btn-secondary flex-1 max-w-[150px]"
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

  const config = {
    check: {
      label: checkNumber ? `צ׳ק ${checkNumber}` : "צ׳ק",
      className: "bg-amber-100 text-amber-700 border-amber-200",
      icon: CreditCard,
    },
    bank_transfer: {
      label: "העברה",
      className: "bg-blue-100 text-blue-700 border-blue-200",
      icon: Building2,
    },
  };

  const { label, className, icon: Icon } = config[method] || {
    label: method,
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CreditCard,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
