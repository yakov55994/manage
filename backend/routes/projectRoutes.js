// import express from 'express';
// import projectControllers from '../controller/projectControllers.js'
// import { protect, checkProjectPermission } from '../middleware/auth.js';
// import { withScope, requireOp, applyProjectListFilter, ensureProjectAccess } from '../middleware/scope.js';



// const router = express.Router();

// router.use(protect);

// router.get('/search', projectControllers.search);

// router.post("/", projectControllers.createProject);

// router.post('/:id/invoices', checkProjectPermission, projectControllers.addInvoiceToProject);

// router.get('/', projectControllers.getAllProjects);

// router.get('/:id', projectControllers.getProjectById); 

// router.put('/:id', checkProjectPermission,  projectControllers.updateProject);

// router.delete('/:id', checkProjectPermission, projectControllers.deleteProject);


// export default router;


import express from 'express';
import projectControllers from '../controller/projectControllers.js';
import { protect } from '../middleware/auth.js';
import {
  withScope,
  requireOp,
  applyProjectListFilter,
  ensureProjectAccess
} from '../middleware/scope.js';

const router = express.Router();

// כל המסלול בפרויקטים מוגן ונטען לו scope של המשתמש
router.use(protect, withScope);

// 🔎 חיפוש פרויקטים (קריאה) — חשוב להחיל סינון לפי הרשאות
router.get(
  '/search',
  requireOp('projects', 'read'),
  applyProjectListFilter(),            // ימלא req.queryFilter
  projectControllers.search
);

// ➕ יצירת פרויקט (כתיבה)
router.post(
  '/',
  requireOp('projects', 'write'),
  projectControllers.createProject
);

// 🧾 הוספת חשבונית לפרויקט קיים (כתיבה על פרויקט מסוים)
router.post(
  '/:id/invoices',
  requireOp('projects', 'write'),
  ensureProjectAccess,                 // בודק שלמשתמש מותר לגשת ל-:id
  projectControllers.addInvoiceToProject
);

// 📃 רשימת פרויקטים (קריאה) — סינון לפי הרשאות
router.get(
  '/',
  requireOp('projects', 'read'),
  applyProjectListFilter(),            // ימלא req.queryFilter לרשימה
  projectControllers.getAllProjects
);

// 📄 פרויקט לפי ID (קריאה) — בדיקת גישה
router.get(
  '/:id',
  requireOp('projects', 'read'),
  ensureProjectAccess,
  projectControllers.getProjectById
);

// ✏️ עדכון פרויקט (כתיבה) — בדיקת גישה
router.put(
  '/:id',
  requireOp('projects', 'write'),
  ensureProjectAccess,
  projectControllers.updateProject
);

// 🗑️ מחיקת פרויקט (מחיקה) — בדיקת גישה
router.delete(
  '/:id',
  requireOp('projects', 'del'),
  ensureProjectAccess,
  projectControllers.deleteProject
);

export default router;
