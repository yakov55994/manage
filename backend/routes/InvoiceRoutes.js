// routes/invoice.routes.js
import express from 'express';
import invoiceControllers from '../controller/invoiceControllers.js';

// אימות
import { protect } from '../middleware/auth.js';

// סקופ/הרשאות
import {
  withScope,
  requireOp,
  applyProjectListFilter, // נשתמש בו לרשימות לפי פרויקט
  ensureProjectAccess,   // יוודא גישה לפרויקט מ-:projectId
} from '../middleware/scope.js';

// חשוב כדי שה-:projectId מה-base path יעבור לכאן
// מומלץ לחבר כך את הראוטר:
// app.use('/api/projects/:projectId/invoices', router);
const router = express.Router({ mergeParams: true });

// כל המסלולים מוגנים + נטען scope של המשתמש
router.use(protect, withScope);

/* -------------------- קריאה (READ) -------------------- */

// רשימת חשבוניות לפי פרויקט (:projectId מה-base path)
router.get(
  '/',
  requireOp('invoices', 'read'),
  applyProjectListFilter(),      // ימלא req.queryFilter לפי הסקופ וה-projectId
  invoiceControllers.fetchInvoices
);

// חיפוש חשבוניות (אפשר עדיין לסנן לפי פרויקט דרך applyProjectListFilter)
router.get(
  '/search',
  requireOp('invoices', 'read'),
  applyProjectListFilter(),
  invoiceControllers.search
);

// בדיקת כפילות (לא בהכרח תלוי בפרויקט, משאירים כ-read)
router.get(
  '/check-duplicate',
  requireOp('invoices', 'read'),
  invoiceControllers.check_duplicate
);

// חשבוניות של ספק מסוים (קריאה)
// אם תרצה להגביל לפי פרויקט, אפשר להוסיף applyProjectListFilter() כאן גם
router.get(
  '/suppliers/:id',
  requireOp('invoices', 'read'),
  invoiceControllers.getSupplierInvoices
);

// שליפת חשבונית לפי מזהה (עדיין בתוך הקונטקסט של :projectId ב-base path)
router.get(
  '/:id',
  requireOp('invoices', 'read'),
  ensureProjectAccess,          // בודק שהמשתמש מורשה לגשת ל-projectId שבנתיב
  invoiceControllers.getInvoiceById
);

/* ---------------- כתיבה/עדכון/מחיקה ---------------- */

// יצירת חשבוניות חדשות לפרויקט הנוכחי
router.post(
  '/',
  requireOp('invoices', 'write'),
  ensureProjectAccess,          // מאשר שיש write לפרויקט שבנתיב
  invoiceControllers.createInvoices
);

// עדכון חשבונית קיימת
router.put(
  '/:id',
  requireOp('invoices', 'write'),
  ensureProjectAccess,
  invoiceControllers.updateInvoice
);

// עדכון סטטוס תשלום
router.put(
  '/:id/status',
  requireOp('invoices', 'write'),
  ensureProjectAccess,
  invoiceControllers.updateInvoicePaymentStatus
);

// עדכון תאריך תשלום
router.put(
  '/:id/date',
  requireOp('invoices', 'write'),
  ensureProjectAccess,
  invoiceControllers.updateInvoicePaymentDate
);

// העברת חשבונית לפרויקט יעד (כתיבה)
// שים לב: ב-controller יש בדיקה ליעד; כאן מוודאים שיש write על פרויקט המקור (זה שבנתיב)
router.post(
  '/:id/move',
  requireOp('invoices', 'write'),
  ensureProjectAccess,
  invoiceControllers.moveInvoice
);

// מחיקת חשבונית
router.delete(
  '/:id',
  requireOp('invoices', 'del'),
  ensureProjectAccess,
  invoiceControllers.deleteInvoice
);

// מחיקת קובץ מקלאודינרי (קשור לניהול מסמכים של חשבוניות)
// אפשר להשאיר כ-write על invoices; אם תרצה להחמיר — תעביר גם דרך ensureProjectAccess
router.delete(
  '/upload/cloudinary',
  requireOp('invoices', 'write'),
  invoiceControllers.deleteFile
);

export default router;
