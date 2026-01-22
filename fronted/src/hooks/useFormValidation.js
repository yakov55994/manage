import { useState, useCallback } from "react";

/**
 * useFormValidation - Hook לניהול ולידציה בזמן אמת בטפסים
 *
 * שימוש:
 * const { fieldErrors, validateField, validateAllFields, clearFieldError, clearAllErrors } = useFormValidation();
 *
 * // ולידציה של שדה בודד (למשל onBlur)
 * validateField('email', email, 'אימייל', ['required', 'email']);
 *
 * // ולידציה של כל הטופס
 * const result = validateAllFields([
 *   { name: 'email', value: email, label: 'אימייל', rules: ['required', 'email'] },
 *   { name: 'phone', value: phone, label: 'טלפון', rules: ['required', 'phone'] }
 * ]);
 *
 * if (result.isValid) {
 *   // שלח את הטופס
 * }
 */

// כללי ולידציה מובנים
const validationRules = {
  required: (value, label) => {
    if (value === null || value === undefined || value === "") {
      return `${label} הוא שדה חובה`;
    }
    if (typeof value === "string" && value.trim() === "") {
      return `${label} הוא שדה חובה`;
    }
    return null;
  },

  email: (value, label) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${label} אינו תקין`;
    }
    return null;
  },

  phone: (value, label) => {
    if (!value) return null;
    // תבנית טלפון ישראלי
    const phoneRegex = /^0\d{1,2}-?\d{7,8}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ""))) {
      return `${label} אינו תקין (לדוגמה: 050-1234567)`;
    }
    return null;
  },

  number: (value, label) => {
    if (!value && value !== 0) return null;
    if (isNaN(Number(value))) {
      return `${label} חייב להיות מספר`;
    }
    return null;
  },

  positive: (value, label) => {
    if (!value && value !== 0) return null;
    if (Number(value) <= 0) {
      return `${label} חייב להיות מספר חיובי`;
    }
    return null;
  },

  israeliId: (value, label) => {
    if (!value) return null;
    const idRegex = /^\d{9}$/;
    if (!idRegex.test(value)) {
      return `${label} חייב להכיל 9 ספרות`;
    }
    return null;
  },

  bankAccount: (value, label) => {
    if (!value) return null;
    const bankRegex = /^\d{5,13}$/;
    if (!bankRegex.test(value)) {
      return `${label} חייב להכיל 5-13 ספרות`;
    }
    return null;
  },

  url: (value, label) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return `${label} אינו כתובת תקינה`;
    }
  },

  date: (value, label) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${label} אינו תאריך תקין`;
    }
    return null;
  },

  futureDate: (value, label) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return `${label} חייב להיות תאריך עתידי`;
    }
    return null;
  },

  pastDate: (value, label) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      return `${label} חייב להיות תאריך בעבר`;
    }
    return null;
  },
};

// פונקציות ולידציה עם פרמטרים
const parameterizedRules = {
  minLength: (min) => (value, label) => {
    if (!value) return null;
    if (value.length < min) {
      return `${label} חייב להכיל לפחות ${min} תווים`;
    }
    return null;
  },

  maxLength: (max) => (value, label) => {
    if (!value) return null;
    if (value.length > max) {
      return `${label} יכול להכיל עד ${max} תווים`;
    }
    return null;
  },

  min: (minValue) => (value, label) => {
    if (!value && value !== 0) return null;
    if (Number(value) < minValue) {
      return `${label} חייב להיות לפחות ${minValue}`;
    }
    return null;
  },

  max: (maxValue) => (value, label) => {
    if (!value && value !== 0) return null;
    if (Number(value) > maxValue) {
      return `${label} יכול להיות עד ${maxValue}`;
    }
    return null;
  },

  pattern: (regex, errorMessage) => (value, label) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return errorMessage || `${label} אינו בפורמט תקין`;
    }
    return null;
  },

  match: (otherValue, otherLabel) => (value, label) => {
    if (!value) return null;
    if (value !== otherValue) {
      return `${label} חייב להתאים ל${otherLabel}`;
    }
    return null;
  },
};

/**
 * הפעלת כלל ולידציה
 */
const runRule = (rule, value, label) => {
  // כלל מחרוזת פשוט
  if (typeof rule === "string") {
    const validator = validationRules[rule];
    if (validator) {
      return validator(value, label);
    }
    console.warn(`Unknown validation rule: ${rule}`);
    return null;
  }

  // כלל עם פרמטרים { rule: 'minLength', value: 3 }
  if (typeof rule === "object" && rule.rule) {
    const ruleFactory = parameterizedRules[rule.rule];
    if (ruleFactory) {
      const validator = ruleFactory(rule.value, rule.message);
      return validator(value, label);
    }
    console.warn(`Unknown parameterized rule: ${rule.rule}`);
    return null;
  }

  // פונקציה מותאמת אישית
  if (typeof rule === "function") {
    return rule(value, label);
  }

  return null;
};

/**
 * ולידציה של ערך לפי כללים
 */
const validateValue = (value, label, rules) => {
  for (const rule of rules) {
    const error = runRule(rule, value, label);
    if (error) {
      return error;
    }
  }
  return null;
};

/**
 * Hook לניהול ולידציה
 */
export const useFormValidation = () => {
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * ולידציה של שדה בודד
   */
  const validateField = useCallback((name, value, label, rules) => {
    const error = validateValue(value, label, rules);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
    return !error;
  }, []);

  /**
   * ולידציה של כל השדות
   * @param {Array} fields - מערך של { name, value, label, rules }
   * @returns {{ isValid: boolean, errors: object }}
   */
  const validateAllFields = useCallback((fields) => {
    const errors = {};
    let isValid = true;

    for (const field of fields) {
      const error = validateValue(field.value, field.label, field.rules);
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return { isValid, errors };
  }, []);

  /**
   * ניקוי שגיאה של שדה בודד
   */
  const clearFieldError = useCallback((name) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  /**
   * ניקוי כל השגיאות
   */
  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * בדיקה אם יש שגיאות
   */
  const hasErrors = Object.keys(fieldErrors).some((key) => fieldErrors[key]);

  /**
   * קבלת שגיאה של שדה ספציפי
   */
  const getError = useCallback(
    (name) => {
      return fieldErrors[name] || null;
    },
    [fieldErrors]
  );

  return {
    fieldErrors,
    validateField,
    validateAllFields,
    clearFieldError,
    clearAllErrors,
    hasErrors,
    getError,
    setFieldErrors,
  };
};

/**
 * ולידציה פשוטה (ללא hook) - תואם ל-validateForm הקיים
 */
export const validateForm = (fields) => {
  const errors = [];
  let isValid = true;

  for (const field of fields) {
    const error = validateValue(field.value, field.label, field.rules);
    if (error) {
      errors.push(error);
      isValid = false;
    }
  }

  return { isValid, errors };
};

/**
 * הצגת שגיאות ולידציה (תואם לפונקציה הקיימת)
 */
export const showValidationErrors = (errors, toast) => {
  if (!errors || errors.length === 0) return;

  if (errors.length === 1) {
    toast.error(errors[0], {
      className: "rtl text-right",
    });
  } else {
    const errorList = errors.map((e) => `• ${e}`).join("\n");
    toast.error(`יש לתקן את השגיאות הבאות:\n${errorList}`, {
      className: "rtl text-right",
      duration: 5000,
    });
  }
};

export default useFormValidation;
