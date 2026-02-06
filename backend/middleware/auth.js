// ============================
// AUTH + PERMISSIONS
// ============================

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// ---------------------------------------------
// ✔ protect – אימות משתמש
// ---------------------------------------------
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "אין הרשאה" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ message: "משתמש לא קיים" });
    if (!user.isActive) return res.status(403).json({ message: "משתמש לא פעיל" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Token לא תקין" });
  }
};

// ---------------------------------------------
// ✔ only admin (למשל יצירת פרויקט)
// ---------------------------------------------
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "אין הרשאה למחיקה (Admin בלבד)" });
  }
  next();
};


// =====================================================
//               הרשאות לפי מודולים ופרויקט
// =====================================================

// בדיקה שהמשתמש משויך לפרויקט
function isInProject(user, projectId) {
  return user.permissions.some(
    (p) => String(p.project) === String(projectId)
  );
}

// בדיקת גישה למודול לפי action
function canAccessModule(user, projectId, moduleName, action) {
  const perm = user.permissions.find(
    (p) => String(p.project) === String(projectId)
  );

  if (!perm) return false;

  const level = perm.modules?.[moduleName]; // none / view / edit
  if (!level || level === "none") return false;

  if (action === "view") return level === "view" || level === "edit";
  if (action === "edit") return level === "edit";

  return false;
}

// ---------------------------------------------
// 🔥 checkAccess – הרשאות חזקות לפי מודול
// ---------------------------------------------
// במידלוור authMiddleware.js - תקן את checkAccess:

export const checkAccess = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // ==========================================
      // 0) רואת חשבון – גישת קריאה בלבד בכל המערכת
      // ==========================================
      // ==========================================
      // 0) רואת חשבון – הרשאות מיוחדות
      // ==========================================
      if (user.role === "accountant") {

        // --- accountant יכול לראות כל החשבוניות ---
        if (moduleName === "invoices") {

          if (action === "view") return next(); // צפייה בלבד מותרת
          return res.status(403).json({ message: "רואת חשבון לא יכולה לבצע שינוי בחשבוניות" });
        }

        // --- accountant יכול לצפות רק בפרויקט מילגה ---
        if (moduleName === "projects") {

          const projectId = req.params.id || req.params.projectId;

          const project = await Project.findById(projectId);
          if (!project) {
            return res.status(404).json({ message: "פרויקט לא נמצא" });
          }

          // ❌ אם זה לא פרויקט מילגה — אין גישה
          const isMilgaProject = project.isMilga === true || project.type === "milga";
          if (!isMilgaProject) {
            return res.status(403).json({ message: "גישה מותרת רק לפרויקט מילגה" });
          }

          // ✔ רק צפייה מותרת
          if (action === "view") return next();
          return res.status(403).json({ message: "אין הרשאה לערוך פרויקט" });
        }

        // --- accountant לא יכול להיכנס לשום מודול אחר ---
        return res.status(403).json({ message: "אין הרשאה למודול זה" });
      }


      // מנהל עובר הכול
      if (user.role === "admin") return next();

      // ----- 1) זיהוי ID -----
      const id =
        req.params.id ||
        req.params.invoiceId ||
        req.params.orderId ||
        req.params.projectId;

      const projectIdFromBody = req.body.projectId;
      let projectId = null;

      // ----- 2) קריאת פריט -----
      let item = null;

      if (moduleName === "invoices") {
        if (!id) return next();

        const invoice = await Invoice.findById(id);
        if (!invoice) {
          return res.status(404).json({ message: "חשבונית לא נמצאה" });
        }

        // ────────────────────────────────────────────────
        // אסוף את כל מזהי הפרויקטים הרלוונטיים
        // ────────────────────────────────────────────────
        const relevantProjectIds = [];

        // 1. כל הפרויקטים במערך projects
        if (invoice.projects && Array.isArray(invoice.projects)) {
          invoice.projects.forEach(p => {
            const pid = String(p.projectId?._id || p.projectId);
            if (pid) relevantProjectIds.push(pid);
          });
        }

        // 2. fundedFromProjectId (חשוב!)
        if (invoice.fundedFromProjectId) {
          relevantProjectIds.push(String(invoice.fundedFromProjectId));
        }

        // 3. (אופציונלי) גם submittedToProjectId אם רלוונטי
        if (invoice.submittedToProjectId) {
          relevantProjectIds.push(String(invoice.submittedToProjectId));
        }

        // עכשיו בדוק אם יש לפחות פרויקט אחד שהמשתמש מורשה עליו
        const hasAccess = relevantProjectIds.some(pid => {
          return user.permissions.some(perm => {
            const permPid = String(perm.project?._id || perm.project);
            if (permPid !== pid) return false;

            const level = perm.modules?.invoices || "none";
            return action === "view"
              ? (level === "view" || level === "edit")
              : level === "edit";
          });
        });

        if (!hasAccess) {
          return res.status(403).json({ message: "אין גישה לפרויקט של החשבונית" });
        }

        return next();
      }

      if (moduleName === "orders") {
        if (id) item = await Order.findById(id);
        projectId = item?.projectId?.toString() || projectIdFromBody;

      }

      if (moduleName === "projects") {
        if (id) item = await Project.findById(id);
        projectId = item?._id?.toString();

        // 🔧 FIX: השתמש בפונקציה normalizе
        const perm = user.permissions.find(
          (p) => {
            const permProjectId = String(p.project?._id || p.project);
            return permProjectId === String(projectId);
          }
        );


        if (!perm) {
          return res.status(403).json({ message: "אין גישה לפרויקט" });
        }

        if (action === "view" && perm.access === "none") {
          return res.status(403).json({ message: "אין הרשאה לצפות" });
        }

        if (action === "edit" && perm.access !== "edit") {
          return res.status(403).json({ message: "אין הרשאה לערוך" });
        }

        return next();
      }

      // ----- supplier: אין הרשאת פרויקט -----
      if (moduleName === "suppliers") {
        return next();
      }

      // ----- 3) בדיקת הרשאת פרויקט -----
      // 🔧 FIX: השתמש בפונקציה normalize
      const perm = user.permissions.find(
        (p) => String(p.project?._id || p.project) === String(projectId)
      );

      if (!perm) {
        return res.status(403).json({ message: "אין גישה לפרויקט" });
      }

      // ----- 4) בדיקת רמת מודול -----
      const level = perm.modules?.[moduleName] || "none";

      if (action === "view" && level === "none") {
        return res.status(403).json({ message: "אין הרשאה לצפות" });
      }

      if (action === "edit" && level !== "edit") {
        return res.status(403).json({ message: "אין הרשאה לערוך" });
      }

      return next();

    } catch (err) {
      return res.status(500).json({ message: "שגיאת הרשאות" });
    }
  };
};


export function isAccountant(req, res, next) {
  if (req.user?.role === "accountant") return next();
  return res.status(403).json({ error: "אין הרשאה" });
}
