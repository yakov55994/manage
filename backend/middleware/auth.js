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

      // מנהל עובר הכול
      if (user.role === "admin") return next();

      // ----- 1) זיהוי ID -----
      const id =
        req.params.id ||
        req.params.invoiceId ||
        req.params.orderId ||
        req.params.projectId;

      // אם הודעת create — אין עדיין ID → בודקים דרך body.projectId
      const projectIdFromBody = req.body.projectId;

      let projectId = null;

      // ----- 2) קריאת פריט -----
      let item = null;

      if (moduleName === "invoices") {
        if (id) item = await Invoice.findById(id);
        projectId = item?.projectId?.toString() || projectIdFromBody;
      }

      if (moduleName === "orders") {
        if (id) item = await Order.findById(id);
        projectId = item?.projectId?.toString() || projectIdFromBody;
      }

      if (moduleName === "projects") {
        if (id) item = await Project.findById(id);
        projectId = item?._id?.toString();

        // הרשאת פרויקט לא נבדקת דרך modules — רק דרך access!
        const perm = user.permissions.find(
          (p) => p.project.toString() === projectId
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
        // לא צריך בדיקה כלל
        return next();
      }

      // ----- 3) בדיקת הרשאת פרויקט -----
      const perm = user.permissions.find(
        (p) => p.project.toString() === String(projectId)
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
      console.log("CHECK ACCESS ERROR:", err);
      return res.status(500).json({ message: "שגיאת הרשאות" });
    }
  };
};

