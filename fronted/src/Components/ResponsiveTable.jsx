import React from "react";

/**
 * ResponsiveTable - רכיב טבלה responsive
 * מציג טבלה רגילה בדסקטופ וכרטיסים במובייל
 *
 * Props:
 * - headers: מערך של כותרות [{key, label, className}]
 * - data: מערך של שורות
 * - renderRow: פונקציה לרינדור שורה (item, index) => ReactNode
 * - renderMobileCard: (אופציונלי) פונקציה מותאמת אישית לרינדור כרטיס מובייל
 * - onRowClick: (אופציונלי) פונקציה שמופעלת בלחיצה על שורה
 * - emptyMessage: הודעה כשאין data
 */
const ResponsiveTable = ({
  headers = [],
  data = [],
  renderRow,
  renderMobileCard,
  onRowClick,
  emptyMessage = "אין נתונים להצגה",
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden lg:block mobile-table-scroll">
        <table className={`w-full ${className}`}>
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={header.className || "px-6 py-4 text-sm font-bold text-center"}
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
                className={onRowClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
              >
                {renderRow(item, index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - visible only on mobile */}
      <div className="lg:hidden space-y-4">
        {data.map((item, index) => {
          if (renderMobileCard) {
            return renderMobileCard(item, index);
          }

          // Default mobile card
          return (
            <div
              key={item._id || index}
              onClick={() => onRowClick && onRowClick(item)}
              className={`mobile-card ${onRowClick ? "cursor-pointer active:scale-[0.98]" : ""}`}
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

export default ResponsiveTable;
