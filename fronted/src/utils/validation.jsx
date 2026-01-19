/**
 * פונקציית עזר לולידציה של שדות טופס
 * מחזירה אובייקט עם isValid (boolean) ו-errors (מערך של הודעות שגיאה)
 */

export const validateForm = (fields, rules) => {
  const errors = [];

  for (const field of fields) {
    const { name, value, label, rules: fieldRules = [] } = field;

    // בדיקת required
    if (fieldRules.includes('required')) {
      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        errors.push(`${label} הוא שדה חובה`);
        continue;
      }
    }

    // בדיקת email
    if (fieldRules.includes('email') && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${label} אינו תקין`);
      }
    }

    // בדיקת number
    if (fieldRules.includes('number') && value !== '' && value !== null && value !== undefined) {
      if (isNaN(value) || Number(value) < 0) {
        errors.push(`${label} חייב להיות מספר תקין`);
      }
    }

    // בדיקת positive
    if (fieldRules.includes('positive') && value) {
      if (Number(value) <= 0) {
        errors.push(`${label} חייב להיות גדול מ-0`);
      }
    }

    // בדיקת minLength
    const minLengthRule = fieldRules.find(r => typeof r === 'object' && r.type === 'minLength');
    if (minLengthRule && value) {
      if (String(value).length < minLengthRule.value) {
        errors.push(`${label} חייב להכיל לפחות ${minLengthRule.value} תווים`);
      }
    }

    // בדיקת maxLength
    const maxLengthRule = fieldRules.find(r => typeof r === 'object' && r.type === 'maxLength');
    if (maxLengthRule && value) {
      if (String(value).length > maxLengthRule.value) {
        errors.push(`${label} לא יכול להכיל יותר מ-${maxLengthRule.value} תווים`);
      }
    }

    // בדיקת phone (ישראלי)
    if (fieldRules.includes('phone') && value) {
      const phoneRegex = /^0\d{1,2}-?\d{7}$/;
      if (!phoneRegex.test(String(value).replace(/\s/g, ''))) {
        errors.push(`${label} אינו תקין (פורמט: 0X-XXXXXXX או 0XX-XXXXXXX)`);
      }
    }

    // בדיקת israeliId (תעודת זהות/עוסק מורשה)
    if (fieldRules.includes('israeliId') && value) {
      const cleanId = String(value).replace(/\D/g, '');
      if (cleanId.length !== 9 || /^0+$/.test(cleanId)) {
        errors.push(`${label} חייב להיות 9 ספרות (לא אפסים)`);
      }
    }

    // בדיקת bankAccount
    if (fieldRules.includes('bankAccount') && value) {
      const cleanAccount = String(value).replace(/\D/g, '');
      if (cleanAccount.length < 5 || cleanAccount.length > 13) {
        errors.push(`${label} חייב להיות בין 5 ל-13 ספרות`);
      }
    }

    // בדיקת custom function
    const customRule = fieldRules.find(r => typeof r === 'function');
    if (customRule) {
      const customError = customRule(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * פונקציה להצגת שגיאות ולידציה ב-toast
 */
export const showValidationErrors = (errors, toast) => {
  if (errors.length === 0) return;

  if (errors.length === 1) {
    toast.error(errors[0], { className: 'sonner-toast error rtl' });
  } else {
    toast.error(
      <div className="text-right">
        <div className="font-bold mb-2">יש לתקן את השגיאות הבאות:</div>
        <ul className="list-disc pr-5 space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>,
      { className: 'sonner-toast error rtl', duration: 6000 }
    );
  }
};

/**
 * ולידציה מהירה לשדה בודד
 */
export const validateField = (value, label, rules = []) => {
  const result = validateForm([{ value, label, rules }]);
  return result.errors[0] || null;
};
