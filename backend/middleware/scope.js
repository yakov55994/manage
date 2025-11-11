// middleware/scope.js
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Order from '../models/Order.js';
import { canUser } from '../services/userservice.js';

// עוזר: לבדוק אם יש התאמה של הרשאה נדרשת מול 'view'/'edit'
function allowByOp(moduleLevel, op) {
  if (!moduleLevel) return false;                // אין כלל הרשאה
  if (op === 'read') return moduleLevel === 'view' || moduleLevel === 'edit';
  // write / del מחייבים edit
  return moduleLevel === 'edit';
}

// מחלץ עבור משתמש את:
// - רשימת projectIds שמופיעים לו בהרשאות (אם אין הגבלה – נחזיר null = אין פילטר)
// - מיפוי ברמה מערכתית האם בכלל יש לו הרשאת מודול כלשהו (suppliers/orders וכו').
function extractScope(user) {
  if (!user) return { projectIds: null, modules: {} };
  if (user.role === 'admin') return { projectIds: null, modules: { all: 'edit' } };

  const list = user.permissions?.projects || [];

  // אם אין בכלל רשומה => ברירת מחדל "הכל" (כמו שהוגדר קודם)
  if (!Array.isArray(list) || list.length === 0) {
    return { projectIds: null, modules: { all: 'edit' } };
  }

  // איסוף projectIds
  const projectIds = [];
  // אגירת מודולים ברמת-על (אם באחד הפרויקטים יש edit במודול מסוים – נסמן edit)
  const modulesAgg = { invoices: 'view', orders: 'view', suppliers: 'view', files: 'view' };

  for (const p of list) {
    const pid = p?.project?._id || p?.project || p?._id;
    if (pid) projectIds.push(String(pid));

    const acc = p?.access || 'view';
    const mods = p?.modules || {};
    for (const key of ['invoices','orders','suppliers','files']) {
      const lvl = mods[key] || acc || 'view';
      // אם כבר יש edit מצטבר, אל תוריד אותו ל-view
      if (modulesAgg[key] === 'edit') continue;
      modulesAgg[key] = lvl === 'edit' ? 'edit' : modulesAgg[key];
    }
  }

  return { projectIds, modules: modulesAgg };
}

// מצמיד את ה-scope ל-request לשימוש בהמשך
export const withScope = (req, _res, next) => {
  const scope = extractScope(req.user);
  req.scope = scope; // { projectIds: string[] | null, modules: {...} }
  next();
};

// דרישת פעולה על משאב (ללא קשר ל-ID ספציפי)
// דוגמה: requireOp('orders','read') לפני חיפוש/רשימה
export const requireOp = (resource, op) => {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const scope = req.scope || extractScope(req.user);

    // אם אין הגבלה (projectIds === null) – מותר
    if (!scope.projectIds) return next();

    // בדיקה ברמת מודול “מערכתית”: האם יש למשתמש בכלל הרשאה למודול הזה באיזה פרויקט שהוא
    const lvl = scope.modules?.[resource] || 'view';
    if (!allowByOp(lvl, op)) {
      return res.status(403).json({ message: 'אין הרשאה לפעולה זו' });
    }
    return next();
  };
};

// מסנן רשימות פרויקטים לפי הרשאות
export const applyProjectListFilter = () => {
  return (req, _res, next) => {
    const scope = req.scope || extractScope(req.user);
    // null => אין פילטר (הכל)
    if (!scope.projectIds) {
      req.queryFilter = {}; 
      return next();
    }
    req.queryFilter = { _id: { $in: scope.projectIds.map(id => new mongoose.Types.ObjectId(id)) } };
    next();
  };
};

// מסנן רשימות הזמנות לפי projectId
export const applyOrderListFilter = () => {
  return (req, _res, next) => {
    const scope = req.scope || extractScope(req.user);
    if (!scope.projectIds) {
      req.queryFilter = {};
      return next();
    }
    req.queryFilter = {
      projectId: { $in: scope.projectIds.map(id => new mongoose.Types.ObjectId(id)) }
    };
    next();
  };
};

// לספקים אין קישור ישיר לפרויקט אצלך כרגע.
// לכן: אם למשתמש אין כלל מודול suppliers ברמה כלשהי → 403.
// אחרת – לא נוסיף פילטר, כי אין על מה לסנן.
export const applySupplierListFilter = () => {
  return (req, res, next) => {
    const scope = req.scope || extractScope(req.user);
    if (!scope.projectIds) {
      req.queryFilter = {};
      return next();
    }
    const lvl = scope.modules?.suppliers || 'view';
    if (!allowByOp(lvl, 'read')) {
      return res.status(403).json({ message: 'אין לך הרשאה לצפות בספקים' });
    }
    req.queryFilter = {};
    next();
  };
};

// בדיקת גישה לפרויקט ספציפי לפי :id
export const ensureProjectAccess = async (req, res, next) => {
  try {
    const id = req.params.id;
    const project = await Project.findById(id).select('_id');
    if (!project) return res.status(404).json({ message: 'פרויקט לא נמצא' });

    const ok = canUser({
      user: req.user,
      projectId: project._id,
      resource: 'projects',
      action: req.method === 'GET' ? 'read' : (req.method === 'DELETE' ? 'del' : 'write')
    });

    if (!ok) return res.status(403).json({ message: 'אין הרשאה לפרויקט זה' });
    next();
  } catch (e) {
    next(e);
  }
};

// בדיקת גישה להזמנה לפי :id (מחלצים projectId מההזמנה עצמה)
export const ensureOrderAccess = async (req, res, next) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id).select('projectId');
    if (!order) return res.status(404).json({ message: 'הזמנה לא נמצאה' });

    const ok = canUser({
      user: req.user,
      projectId: order.projectId,
      resource: 'orders',
      action: req.method === 'GET' ? 'read' : (req.method === 'DELETE' ? 'del' : 'write')
    });

    if (!ok) return res.status(403).json({ message: 'אין הרשאה להזמנה זו' });
    next();
  } catch (e) {
    next(e);
  }
};

// לספק ב-ID ספציפי אין שיוך לפרויקט במסד, אז נסתפק בבדיקה:
// האם למשתמש יש ANY פרויקט שבו מודול suppliers מאפשר את הפעולה.
export const ensureSupplierAccess = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  const scope = req.scope || extractScope(req.user);

  if (!scope.projectIds) return next(); // אין הגבלה → מותר

  const op = req.method === 'GET' ? 'read' : (req.method === 'DELETE' ? 'del' : 'write');
  const lvl = scope.modules?.suppliers || 'view';
  if (!allowByOp(lvl, op)) {
    return res.status(403).json({ message: 'אין לך הרשאות לספקים' });
  }
  next();
};
