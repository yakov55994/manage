import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import Project from "../models/Project.js";
import Supplier from "../models/Supplier.js";
import Order from "../models/Order.js";
import Invoice from "../models/Invoice.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "אין הרשאה" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id)
      // .populate("permissions.project", "_id name")
 // זה לא משנה לשאילתא, רק לנתונים ללקוח
      .select("-password");

    if (!user) return res.status(401).json({ message: "משתמש לא קיים" });
    if (!user.isActive) return res.status(403).json({ message: "משתמש לא פעיל" });

    req.user = user; // ⬅️ הכי חשוב
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token לא תקין" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "אין הרשאה" });

  next();
};

// middleware/permissions.js

export const can = (moduleName, action) => {
  return (req, res, next) => {
    const user = req.user;

    // אם אדמין — תמיד מותר
    if (user.role === "admin") return next();

    // אם אין הרשאות בכלל
    if (!user.permissions || user.permissions.length === 0) {
      return res.status(403).json({ message: "אין הרשאה" });
    }

    // בדיקת הרשאת מודול
    const allowed = user.permissions.some((p) => {
      const mod = p.modules?.[moduleName];
      return mod && (mod === action || mod === "edit");
    });

    if (!allowed) {
      return res.status(403).json({
        message:
          moduleName === "invoices" ? "אין גישה לחשבונית" :
            moduleName === "orders" ? "אין גישה להזמנה" :
              moduleName === "suppliers" ? "אין גישה לספק" :
                "אין הרשאה"
      });
    }

    next();
  };
};

export const hasModuleAccess = (user, projectId, module, required) => {
  const perm = user.permissions.find(
    (p) => String(p.project) === String(projectId)
  );

  if (!perm) return false;

  const level = perm.modules[module]; // "view" / "edit"

  if (!level) return false;

  // אם צריך עריכה אבל יש רק צפייה → חוסם
  if (required === "edit" && level !== "edit") return false;

  return true;
};
export function canAccessModule(user, projectId, moduleName, action) {
  const perm = user.permissions.find(
    (p) => String(p.project) === String(projectId)
  );

  if (!perm) return false;

  const level = perm.modules?.[moduleName]; // "view" / "edit" / "none"

  if (!level || level === "none") return false;

  if (action === "view") return level === "view" || level === "edit";

  if (action === "edit") return level === "edit";

  return false;
}


export const checkAccess = (type, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // 🔥 Admin always wins
      if (user.role === "admin") return next();

      let item;
      const id = req.params.id || req.params.projectId;

      // Load correct item
      switch (type) {
        case "invoice": item = await Invoice.findById(id); break;
        case "order": item = await Order.findById(id); break;
        case "supplier": item = await Supplier.findById(id); break;
        case "project": item = await Project.findById(id); break;
        default:
          return res.status(500).json({ message: "שגיאה בהרשאות" });
      }

      if (!item) {
        return res.status(404).json({ message: "לא נמצא" });
      }

      // Detect projectId on item
      const projectId =
        item.projectId ||
        item.project ||
        (type === "project" ? item._id : null);

      if (!projectId) {
        return res.status(400).json({ message: "לא נמצא projectId" });
      }

      // 1️⃣ בדיקת גישה לפרויקט
      if (!canAccessProject(user, projectId)) {
        return res.status(403).json({ message: "אין הרשאה לפרויקט" });
      }

      // 2️⃣ בדיקת מודול — רק אם יש מודול כזה
      const moduleName =
        type === "invoice" ? "invoices" :
        type === "order" ? "orders" :
        type === "supplier" ? "suppliers" :
        null; // ❗ פרויקט — אין מודול projects

      // If module exists → check access
      if (moduleName) {
        if (!canAccessModule(user, projectId, moduleName, action)) {
          return res.status(403).json({ message: "אין הרשאה" });
        }
      }

      next();
    } catch (err) {
      return res.status(403).json({ message: "אין הרשאה" });
    }
  };
};


// המשתמש חייב שיהיה לו הרשאה לפרויקט
export function canAccessProject(user, projectId) {
  if (!user?.permissions) return false;

  const pid = String(projectId);

  return user.permissions.some(p => String(p.project) === pid);
}






export const requireProjectAccess = (requiredAccess = "view") => {
  return (req, res, next) => {
    const user = req.user;
    const projectId = req.params.projectId || req.params.id;

    // אדמין תמיד עובר
    if (user.role === "admin") return next();

    const perm = user.permissions.find(
      (p) => String(p.project) === String(projectId)
    );

    if (!perm) {
      return res.status(403).json({ message: "אין גישה לפרויקט זה" });
    }

    // בדיקת רמת גישה
    const levels = { none: 0, view: 1, edit: 2 };

    if (levels[perm.access] < levels[requiredAccess]) {
      return res.status(403).json({ message: "אין הרשאת גישה מתאימה" });
    }

    next();
  };
};

