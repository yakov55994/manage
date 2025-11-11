import express from 'express';
import invoiceControllers from '../controller/invoiceControllers.js';

const router = express.Router();

router.get('/', invoiceControllers.getAllInvoices
);

// חיפוש חשבוניות (אפשר עדיין לסנן לפי פרויקט דרך applyProjectListFilter)
router.get('/search', invoiceControllers.search );

router.get(
  '/check-duplicate', invoiceControllers.check_duplicate
);

router.get(
  '/suppliers/:id',
  invoiceControllers.getSupplierInvoices
);

// שליפת חשבונית לפי מזהה (עדיין בתוך הקונטקסט של :projectId ב-base path)
router.get(
  '/:id',
   invoiceControllers.getInvoiceById
);

/* ---------------- כתיבה/עדכון/מחיקה ---------------- */

// יצירת חשבוניות חדשות לפרויקט הנוכחי
router.post(
  '/',
   invoiceControllers.createInvoices
);

// עדכון חשבונית קיימת
router.put(
  '/:id',
  invoiceControllers.updateInvoice
);

// עדכון סטטוס תשלום
router.put(
  '/:id/status',
  invoiceControllers.updateInvoicePaymentStatus
);

// עדכון תאריך תשלום
router.put(
  '/:id/date',
   invoiceControllers.updateInvoicePaymentDate
);

// העברת חשבונית לפרויקט יעד (כתיבה)
// שים לב: ב-controller יש בדיקה ליעד; כאן מוודאים שיש write על פרויקט המקור (זה שבנתיב)
router.post(
  '/:id/move',
   invoiceControllers.moveInvoice
);

// מחיקת חשבונית
router.delete(
  '/:id',
   invoiceControllers.deleteInvoice
);

// מחיקת קובץ מקלאודינרי (קשור לניהול מסמכים של חשבוניות)
// אפשר להשאיר כ-write על invoices; אם תרצה להחמיר — תעביר גם דרך ensureProjectAccess
router.delete(
  '/upload/cloudinary',
  invoiceControllers.deleteFile
);

export default router;
