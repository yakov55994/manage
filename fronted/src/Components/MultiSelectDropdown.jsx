import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

/**
 * MultiSelectDropdown - קומפוננטה לבחירה מרובה מתוך רשימת אפשרויות
 *
 * @param {string} label - תווית לתצוגה כשלא נבחר כלום
 * @param {Array} options - מערך של אפשרויות [{value: string, label: string}]
 * @param {Array} selected - מערך של ערכים שנבחרו
 * @param {Function} onChange - פונקציה שמקבלת את מערך הנבחרים החדש
 * @param {string} className - מחלקות CSS נוספות
 */
export default function MultiSelectDropdown({
  label = "בחר...",
  options = [],
  selected = [],
  onChange,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // סגור את הדרופדאון בלחיצה בחוץ
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return label;
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} נבחרו`;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all flex items-center justify-between gap-2 min-w-[140px]"
      >
        <span className="truncate text-sm">{getDisplayText()}</span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <button
              onClick={clearAll}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
              title="נקה בחירה"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border-2 border-orange-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={`w-full px-4 py-2 text-right flex items-center gap-2 hover:bg-orange-50 transition-colors ${
                  selected.includes(option.value)
                    ? "bg-orange-100 text-orange-700"
                    : "text-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selected.includes(option.value)
                      ? "bg-orange-500 border-orange-500"
                      : "border-slate-300"
                  }`}
                >
                  {selected.includes(option.value) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="font-medium text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
