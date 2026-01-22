import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

/**
 * FormField - רכיב שדה טופס עם תמיכה בשגיאות inline
 *
 * Props:
 * - label: תווית השדה
 * - name: שם השדה
 * - value: ערך השדה
 * - onChange: פונקציית עדכון
 * - onBlur: פונקציה שמופעלת כשיוצאים מהשדה (אופציונלי)
 * - error: הודעת שגיאה (אם יש)
 * - success: האם השדה תקין (מציג אייקון ירוק)
 * - required: האם שדה חובה
 * - type: סוג השדה (text, email, number, tel, password, date)
 * - icon: אייקון (אופציונלי) - Lucide React icon component
 * - placeholder: placeholder
 * - disabled: האם השדה מנוטרל
 * - rows: מספר שורות (עבור textarea)
 * - options: אפשרויות (עבור select)
 * - className: classes נוספים
 * - inputClassName: classes נוספים ל-input עצמו
 * - hint: טקסט עזרה מתחת לשדה
 */
const FormField = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  success = false,
  required = false,
  type = "text",
  icon: Icon,
  placeholder,
  disabled = false,
  rows,
  options,
  className = "",
  inputClassName = "",
  hint,
  min,
  max,
  step,
  autoComplete,
  ...props
}) => {
  const hasError = Boolean(error);
  const showSuccess = success && !hasError && value;

  // Base classes for inputs
  const baseInputClasses = `
    w-full rounded-xl border-2 px-4 py-3 text-base font-medium
    transition-all duration-200
    focus:outline-none focus:ring-4
    disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60
  `;

  // State-based classes
  const stateClasses = hasError
    ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
    : showSuccess
    ? "border-green-400 bg-green-50 focus:border-green-500 focus:ring-green-500/20"
    : "border-slate-200 bg-white focus:border-orange-500 focus:ring-orange-500/20 hover:border-orange-300";

  const inputClasses = `${baseInputClasses} ${stateClasses} ${inputClassName}`;

  // Handle change with name
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  // Render the appropriate input type
  const renderInput = () => {
    // Textarea
    if (type === "textarea" || rows) {
      return (
        <textarea
          id={name}
          name={name}
          value={value || ""}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows || 4}
          className={`${inputClasses} resize-none custom-scrollbar`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : hint ? `${name}-hint` : undefined}
          {...props}
        />
      );
    }

    // Select
    if (type === "select" && options) {
      return (
        <select
          id={name}
          name={name}
          value={value || ""}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`${inputClasses} cursor-pointer`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : hint ? `${name}-hint` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    // Regular input
    return (
      <input
        id={name}
        type={type}
        name={name}
        value={value || ""}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        className={inputClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : hint ? `${name}-hint` : undefined}
        {...props}
      />
    );
  };

  return (
    <div className={`group ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className="form-label"
        >
          {Icon && <Icon className="w-4 h-4 text-orange-500" />}
          <span>{label}</span>
          {required && <span className="form-required">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {renderInput()}

        {/* Success/Error Icon inside input */}
        {(hasError || showSuccess) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div
          id={`${name}-error`}
          className="error-message"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hint Text */}
      {hint && !hasError && (
        <p
          id={`${name}-hint`}
          className="mt-2 text-sm text-slate-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
};

/**
 * FormFieldGroup - קבוצת שדות בשורה אחת
 */
export const FormFieldGroup = ({ children, className = "" }) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {React.Children.map(children, (child) => (
        <div className="flex-1">{child}</div>
      ))}
    </div>
  );
};

/**
 * FormSection - סקציה בטופס עם כותרת
 */
export const FormSection = ({ title, children, className = "" }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
          {title}
        </h3>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export default FormField;
