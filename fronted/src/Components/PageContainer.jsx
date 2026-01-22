import React from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * PageContainer - קונטיינר כללי לדפים עם אנימציות
 * מטפל ב-padding, spacing ו-responsive layout
 *
 * Props:
 * - title: כותרת הדף (אופציונלי)
 * - subtitle: כתובית משנה (אופציונלי)
 * - actions: כפתורים/פעולות בכותרת (אופציונלי)
 * - children: תוכן הדף
 * - maxWidth: רוחב מקסימלי (ברירת מחדל: "7xl")
 * - animate: האם להציג אנימציות (ברירת מחדל: true)
 * - showBackButton: האם להציג כפתור חזרה (אופציונלי)
 * - backPath: נתיב לחזרה (אופציונלי, ברירת מחדל: חזרה אחורה)
 * - loading: האם הדף בטעינה
 */
const PageContainer = ({
  title,
  subtitle,
  actions,
  children,
  maxWidth = "7xl",
  className = "",
  animate = true,
  showBackButton = false,
  backPath,
  loading = false,
}) => {
  const navigate = useNavigate();

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  }[maxWidth];

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`page-with-navbar min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 ${className}`}
      >
        <div className={`container mx-auto responsive-container ${maxWidthClass}`}>
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-3">
                <div className="skeleton h-10 w-64" />
                <div className="skeleton h-5 w-48" />
              </div>
              <div className="flex gap-3">
                <div className="skeleton-button" />
                <div className="skeleton-button" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="skeleton h-64 w-full rounded-xl" />
            <div className="skeleton h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`page-with-navbar min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 ${className}`}
    >
      <div className={`container mx-auto responsive-container ${maxWidthClass}`}>
        {/* Header */}
        {(title || subtitle || actions || showBackButton) && (
          <div className={`mb-6 sm:mb-8 md:mb-10 ${animate ? "animate-slideDown" : ""}`}>
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="mb-4 flex items-center gap-2 text-slate-600 hover:text-orange-600 transition-colors duration-200 group"
              >
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                <span className="font-medium">חזרה</span>
              </button>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="responsive-heading font-bold text-slate-900">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex flex-wrap gap-2 sm:gap-3">{actions}</div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={animate ? "animate-slideUp" : ""}>{children}</div>
      </div>
    </div>
  );
};

/**
 * PageSection - סקציה בתוך דף
 */
export const PageSection = ({
  title,
  subtitle,
  actions,
  children,
  className = "",
  noPadding = false,
}) => {
  return (
    <section
      className={`bg-white rounded-2xl shadow-lg ${
        noPadding ? "" : "p-4 sm:p-6 md:p-8"
      } ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            {title && (
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * PageCard - כרטיס בתוך דף
 */
export const PageCard = ({
  children,
  className = "",
  hover = false,
  glow = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-lg p-4 sm:p-6
        ${hover ? "card-hover" : ""}
        ${glow ? "card-glow" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * PageGrid - Grid responsive לכרטיסים
 */
export const PageGrid = ({ children, cols = 3, className = "" }) => {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={`grid ${colsClass} gap-4 md:gap-6 ${className}`}>
      {children}
    </div>
  );
};

export default PageContainer;
