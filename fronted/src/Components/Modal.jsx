import { X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Modal - רכיב מודל משופר עם אנימציות ונגישות
 *
 * Props:
 * - show: האם להציג את המודל
 * - onClose: פונקציה לסגירת המודל
 * - children: תוכן המודל
 * - size: גודל המודל (sm, md, lg, xl, full) - ברירת מחדל: lg
 */
export default function Modal({ show, onClose, children, size = "lg" }) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // גדלים אפשריים למודל
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw]"
  };

  // אנימציית כניסה
  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // delay קצר לאפשר את האנימציה
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      // המתנה לסיום האנימציה לפני הסרה מה-DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  // סגירה עם Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && show) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* רקע עם אנימציה */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex min-h-full items-start justify-center p-4 overflow-y-auto">
        <div
          className={`relative w-full ${sizeClasses[size] || sizeClasses.lg} mt-20 mb-8 transition-all duration-300 ease-out ${
            isVisible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* גרדיאנט דקורטיבי - צבעים מותאמים לברנד */}
          <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-xl"></div>

          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* כפתור סגירה עם נגישות */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 left-3 p-2 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-colors duration-200 z-10"
              aria-label="סגור"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>

            <div className="max-h-[88vh] overflow-y-auto p-6 custom-scrollbar">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
