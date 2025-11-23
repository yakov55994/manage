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
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "אין הרשאה" });

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
export const checkAccess = (type, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // אדמין תמיד עובר
      if (user.role === "admin") return next();

      // ID מהנתיב
      const id =
        req.params.id ||
        req.params.invoiceId ||
        req.params.orderId ||
        req.params.supplierId ||
        req.params.projectId;

      let item;
      let moduleName = null;

      switch (type) {
        case "invoice":
          item = await Invoice.findById(id);
          moduleName = "invoices";
          break;

        case "order":
          item = await Order.findById(id);
          moduleName = "orders";
          break;

        case "supplier":
          item = await Supplier.findById(id);
          moduleName = "suppliers";
          break;

        case "project":
          item = await Project.findById(id);
          break;

        default:
          return res.status(500).json({ message: "שגיאת הרשאות" });
      }

      if (!item) return res.status(404).json({ message: "לא נמצא" });

      // זיהוי projectId
      const projectId =
        item.projectId ||
        item.project ||
        (type === "project" ? item._id : null);

      if (!projectId)
        return res.status(400).json({ message: "projectId לא נמצא" });

      // 1️⃣ המשתמש חייב להיות משויך לפרויקט
      if (!isInProject(user, projectId)) {
        return res.status(403).json({ message: "אין גישה לפרויקט" });
      }

      // 2️⃣ אם יש מודול – בדיקת מודול
      if (moduleName) {
        const ok = canAccessModule(user, projectId, moduleName, action);
        if (!ok) return res.status(403).json({ message: "אין הרשאה" });
      }

      next();
    } catch (err) {
      console.log(err);
      return res.status(403).json({ message: "אין הרשאה" });
    }
  };
};
