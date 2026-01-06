import React from "react";

/**
 * PageContainer - קונטיינר כללי לדפים
 * מטפל ב-padding, spacing ו-responsive layout
 *
 * Props:
 * - title: כותרת הדף (אופציונלי)
 * - subtitle: כתובית משנה (אופציונלי)
 * - actions: כפתורים/פעולות בכותרת (אופציונלי)
 * - children: תוכן הדף
 * - maxWidth: רוחב מקסימלי (ברירת מחדל: "7xl")
 */
const PageContainer = ({
  title,
  subtitle,
  actions,
  children,
  maxWidth = "7xl",
  className = "",
}) => {
  const maxWidthClass = {
    "sm": "max-w-sm",
    "md": "max-w-md",
    "lg": "max-w-lg",
    "xl": "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    "full": "max-w-full",
  }[maxWidth];

  return (
    <div className={`page-with-navbar min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 ${className}`}>
      <div className={`container mx-auto responsive-container ${maxWidthClass}`}>
        {/* Header */}
        {(title || subtitle || actions) && (
          <div className="mb-6 sm:mb-8 md:mb-10">
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
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default PageContainer;
