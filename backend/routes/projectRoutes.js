// routes/project.routes.js
import express from 'express';
import projectControllers from '../controller/projectControllers.js';
import { protect } from '../middleware/auth.js';
import {
  withScope,
  requireOp,
  applyProjectListFilter,
  ensureProjectAccess,
} from '../middleware/scope.js';

// אם בעתיד תחבר ראוטרי־בן (למשל /projects/:projectId/invoices/*) — כדאי mergeParams:true
const router = express.Router({ mergeParams: true });

// כל מסלולי הפרויקטים מוגנים ונטען scope של המשתמש
router.use(protect, withScope);

/**
 * 🔎 חיפוש פרויקטים (קריאה)
 * מוחל סינון לפי הרשאות דרך applyProjectListFilter -> ממלא req.queryFilter
 */
router.get(
  '/search',
  requireOp('projects', 'read'),
  applyProjectListFilter(),
  projectControllers.search
);

/**
 * ➕ יצירת פרויקט (כתיבה)
 */
router.post(
  '/',
  requireOp('projects', 'write'),
  projectControllers.createProject
);

/**
 * 🧾 הוספת חשבונית לפרויקט קיים (כתיבה)
 * שים לב: אם יש לך ראוטר ייעודי לחשבוניות (/projects/:projectId/invoices)
 * עדיף לרכז שם יצירה; זה נשאר כנתיב נוחות.
 */
router.post(
  '/:projectId/invoices',
  requireOp('projects', 'write'),
  ensureProjectAccess, // יוודא גישה לפרויקט :projectId
  projectControllers.addInvoiceToProject
);

/**
 * 📃 רשימת פרויקטים (קריאה)
 */
router.get(
  '/',
  requireOp('projects', 'read'),
  applyProjectListFilter(),
  projectControllers.getAllProjects
);

/**
 * 📄 פרויקט לפי ID (קריאה)
 */
router.get(
  '/:projectId',
  requireOp('projects', 'read'),
  ensureProjectAccess,
  projectControllers.getProjectById
);

/**
 * ✏️ עדכון פרויקט (כתיבה)
 */
router.put(
  '/:projectId',
  requireOp('projects', 'write'),
  ensureProjectAccess,
  projectControllers.updateProject
);

/**
 * 🗑️ מחיקת פרויקט (מחיקה)
 * נשאר עם 'del' כדי להיות עקבי עם שאר הראוטרים אצלך.
 */
router.delete(
  '/:projectId',
  requireOp('projects', 'del'),
  ensureProjectAccess,
  projectControllers.deleteProject
);

export default router;
