# מדריך ולידציה למערכת ניהולון

## סיכום

יצרתי מערכת ולידציה מרכזית שתעזור לך להציג הודעות שגיאה ברורות למשתמשים.

## הקובץ החדש

`fronted/src/utils/validation.js` - מכיל פונקציות עזר לולידציה

## איך להשתמש

### דוגמה 1: יצירת פרויקט (כבר עודכן ✓)

```javascript
import { validateForm, showValidationErrors } from "../../utils/validation.js";

const handleSubmit = async (e) => {
  e.preventDefault();

  // ולידציה
  const validation = validateForm([
    { value: name, label: 'שם הפרויקט', rules: ['required'] },
    { value: invitingName, label: 'שם המזמין', rules: ['required'] },
    { value: Contact_person, label: 'איש קשר', rules: ['required'] },
  ]);

  if (!validation.isValid) {
    showValidationErrors(validation.errors, toast);
    return;
  }

  // המשך הקוד...
};
```

### דוגמה 2: עריכת פרויקט

```javascript
const validation = validateForm([
  { value: newProjectName, label: 'שם הפרויקט', rules: ['required'] },
  { value: budget, label: 'תקציב', rules: ['required', 'number', 'positive'] },
  { value: remainingBudget, label: 'תקציב נותר', rules: ['required', 'number'] },
  { value: invitingName, label: 'שם המזמין', rules: ['required'] },
  { value: Contact_person, label: 'איש קשר', rules: ['required'] },
]);

if (!validation.isValid) {
  showValidationErrors(validation.errors, toast);
  return;
}
```

### דוגמה 3: יצירת ספק

```javascript
const validation = validateForm([
  { value: formData.name, label: 'שם הספק', rules: ['required'] },
  { value: formData.email, label: 'אימייל', rules: ['email'] },
  { value: formData.phone, label: 'טלפון', rules: ['phone'] },
  { value: formData.business_tax, label: 'מספר עוסק מורשה', rules: ['israeliId'] },
  {
    value: formData.bankDetails?.bankName,
    label: 'שם הבנק',
    rules: hasBankDetails ? ['required'] : []
  },
  {
    value: formData.bankDetails?.branchNumber,
    label: 'מספר סניף',
    rules: hasBankDetails ? ['required', 'number'] : []
  },
  {
    value: formData.bankDetails?.accountNumber,
    label: 'מספר חשבון',
    rules: hasBankDetails ? ['required', 'bankAccount'] : []
  },
]);
```

### דוגמה 4: יצירת חשבונית

```javascript
const validation = validateForm([
  { value: form.invoiceNumber, label: 'מספר חשבונית', rules: ['required'] },
  {
    value: form.supplierId,
    label: 'ספק',
    rules: isSalary ? [] : ['required']
  },
  {
    value: rows,
    label: 'פרויקטים',
    rules: isSalary ? [] : [(val) => val.length === 0 ? 'יש לבחור לפחות פרויקט אחד' : null]
  },
  {
    value: form.checkNumber,
    label: 'מספר צ\'ק',
    rules: (form.paid === "כן" && form.paymentMethod === "check") ? ['required'] : []
  },
  {
    value: form.submittedToProjectId,
    label: 'פרויקט להגשה',
    rules: form.status === "הוגש" ? ['required'] : []
  },
]);

if (!validation.isValid) {
  showValidationErrors(validation.errors, toast);
  return;
}
```

## כללי הולידציה הזמינים

| כלל | תיאור | דוגמה |
|-----|--------|-------|
| `required` | שדה חובה | `['required']` |
| `email` | כתובת אימייל תקינה | `['email']` |
| `number` | מספר תקין | `['number']` |
| `positive` | מספר חיובי | `['positive']` |
| `phone` | טלפון ישראלי | `['phone']` |
| `israeliId` | תעודת זהות/עוסק מורשה | `['israeliId']` |
| `bankAccount` | מספר חשבון בנק | `['bankAccount']` |
| `{type: 'minLength', value: 3}` | אורך מינימלי | `[{type: 'minLength', value: 3}]` |
| `{type: 'maxLength', value: 50}` | אורך מקסימלי | `[{type: 'maxLength', value: 50}]` |
| `(val) => ...` | פונקציה מותאמת אישית | `[(val) => val < 100 ? 'חייב להיות מעל 100' : null]` |

## מה הולידציה זו תעשה

1. **הודעת שגיאה בודדת** - אם יש שגיאה אחת, תוצג הודעת שגיאה פשוטה
2. **רשימת שגיאות** - אם יש מספר שגיאות, תוצג רשימה מסודרת של כל השגיאות
3. **הודעות ברורות** - כל שגיאה מציינת בדיוק איזה שדה חסר או לא תקין

## דוגמאות להודעות שיראה המשתמש

### לפני (לא ברור):
```
❌ לצורך עדכון פרוייקט נדרש למלא את כל השדות עם ערכים תקינים
```

### אחרי (ברור):
```
❌ יש לתקן את השגיאות הבאות:
   • שם הפרויקט הוא שדה חובה
   • תקציב חייב להיות מספר תקין
   • תקציב חייב להיות גדול מ-0
```

## קבצים שצריך לעדכן

### ✅ כבר עודכנו:
1. `fronted/src/pages/Project/Create_Project.jsx` - יצירת פרויקט

### 📝 צריך לעדכן:
1. `fronted/src/pages/Project/UpdateProject.jsx` - עריכת פרויקט
2. `fronted/src/pages/Invoice/Create_Invoice.jsx` - יצירת חשבונית
3. `fronted/src/pages/Invoice/UpdateInvoice.jsx` - עריכת חשבונית
4. `fronted/src/pages/Supplier/create_supplier.jsx` - יצירת ספק (כבר יש בו ולידציה טובה)
5. `fronted/src/pages/Supplier/Supplier_update.jsx` - עריכת ספק
6. `fronted/src/pages/Income/**/*.jsx` - דפי הכנסות
7. `fronted/src/pages/Order/**/*.jsx` - דפי הזמנות

## המלצות נוספות

1. **הוסף אינדיקציה ויזואלית** - הדגש שדות עם שגיאה עם border אדום
2. **אפשר הגשת טופס רק לאחר תיקון** - disable את כפתור השמירה אם יש שגיאות
3. **הצג הודעות עזרה** - tooltip או placeholder שמסביר מה צריך למלא
4. **ולידציה בזמן אמת** - בדוק שדות בזמן הקלדה (לא רק בשליחה)

## איך להמשיך

אם תרצה, אני יכול לעדכן גם את שאר הדפים. רק תגיד לי באיזה קובץ להתמקד הבא.
