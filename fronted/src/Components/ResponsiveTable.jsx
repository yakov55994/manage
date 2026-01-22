import React from "react";
import { Inbox } from "lucide-react";

/**
 * ResponsiveTable - רכיב טבלה responsive משופר
 * מציג טבלה רגילה בדסקטופ וכרטיסים במובייל
 *
 * Props:
 * - headers: מערך של כותרות [{key, label, className}]
 * - data: מערך של שורות
 * - renderRow: פונקציה לרינדור שורה (item, index) => ReactNode
 * - renderMobileCard: (אופציונלי) פונקציה מותאמת אישית לרינדור כרטיס מובייל
 * - onRowClick: (אופציונלי) פונקציה שמופעלת בלחיצה על שורה
 * - emptyMessage: הודעה כשאין data
 * - emptyIcon: אייקון להצגה כשאין data (אופציונלי)
 * - stickyHeader: האם הכותרת נשארת קבועה בגלילה (ברירת מחדל: false)
 * - striped: האם להציג שורות מפוספסות (ברירת מחדל: false)
 * - hoverable: האם להציג hover effect על שורות (ברירת מחדל: true)
 * - maxHeight: גובה מקסימלי לטבלה עם scroll (אופציונלי, למשל "70vh")
 * - loading: האם הטבלה בטעינה
 * - animate: האם להציג אנימציות (ברירת מחדל: true)
 */
const ResponsiveTable = ({
  headers = [],
  data = [],
  renderRow,
  renderMobileCard,
  onRowClick,
  emptyMessage = "אין נתונים להצגה",
  emptyIcon: EmptyIcon = Inbox,
  className = "",
  stickyHeader = false,
  striped = false,
  hoverable = true,
  maxHeight,
  loading = false,
  animate = true,
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Desktop skeleton */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-slate-50 p-4">
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-6 flex-1" />
                ))}
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 border-t border-slate-100">
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="skeleton h-5 flex-1" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="lg:hidden space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-4 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-16 ${animate ? "animate-fadeIn" : ""}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <EmptyIcon className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-lg text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  // Table wrapper classes
  const tableWrapperClasses = `
    hidden lg:block mobile-table-scroll custom-scrollbar
    ${maxHeight ? `overflow-y-auto` : ""}
  `;

  // Row classes
  const getRowClasses = (index) => {
    const classes = ["transition-colors duration-150"];

    if (onRowClick) {
      classes.push("cursor-pointer");
    }

    if (hoverable) {
      classes.push("hover:bg-orange-50/50");
    }

    if (striped && index % 2 === 1) {
      classes.push("bg-slate-50/50");
    }

    classes.push("border-b border-slate-100 last:border-b-0");

    return classes.join(" ");
  };

  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div
        className={tableWrapperClasses}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className={`w-full enhanced-table ${striped ? "striped" : ""} ${className}`}>
          <thead className={stickyHeader ? "sticky-table-header" : ""}>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={
                    header.className ||
                    "px-4 py-4 text-sm font-bold text-slate-700 text-center whitespace-nowrap"
                  }
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item._id || index}
                onClick={() => onRowClick && onRowClick(item)}
                className={getRowClasses(index)}
              >
                {renderRow(item, index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - visible only on mobile */}
      <div className={`lg:hidden space-y-4 ${animate ? "animate-stagger" : ""}`}>
        {data.map((item, index) => {
          if (renderMobileCard) {
            return (
              <div
                key={item._id || index}
                className={animate ? "" : ""}
                style={animate ? { animationDelay: `${index * 50}ms` } : undefined}
              >
                {renderMobileCard(item, index)}
              </div>
            );
          }

          // Default mobile card with enhanced styling
          return (
            <div
              key={item._id || index}
              onClick={() => onRowClick && onRowClick(item)}
              className={`mobile-card-enhanced ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              style={animate ? { animationDelay: `${index * 50}ms` } : undefined}
            >
              {headers.map((header, idx) => {
                const value = item[header.key];
                return (
                  <div key={idx} className="mobile-card-row">
                    <span className="mobile-card-label">{header.label}</span>
                    <span className="mobile-card-value">
                      {typeof value === "function" ? value(item) : value || "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};

/**
 * TableCell - תא טבלה עם styling מובנה
 */
export const TableCell = ({
  children,
  className = "",
  align = "center",
  bold = false,
  color,
}) => {
  const alignClass = {
    left: "text-right", // RTL
    center: "text-center",
    right: "text-left", // RTL
  }[align];

  const colorClass = color
    ? {
        green: "text-green-600",
        red: "text-red-600",
        orange: "text-orange-600",
        blue: "text-blue-600",
        slate: "text-slate-600",
      }[color] || ""
    : "";

  return (
    <td
      className={`px-4 py-3 text-sm ${alignClass} ${
        bold ? "font-bold" : "font-medium"
      } ${colorClass} ${className}`}
    >
      {children}
    </td>
  );
};

/**
 * StatusBadge - תג סטטוס
 */
export const StatusBadge = ({ status, children, className = "" }) => {
  const statusColors = {
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
        statusColors[status] || statusColors.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
};

export default ResponsiveTable;
