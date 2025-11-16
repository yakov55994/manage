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
      .populate("permissions.project", "name") // זה לא משנה לשאילתא, רק לנתונים ללקוח
      .select("-password");

    if (!user) return res.status(401).json({ message: "משתמש לא קיים" });
    if (!user.isActive) return res.status(403).json({ message: "משתמש לא פעיל" });

    req.user = user; // ⬅️ הכי חשוב
    next();
  } catch (err) {
    console.log("❌ protect error:", err.message);
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

export const checkAccess = (type, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // 🔥 אדמין תמיד עובר — דילוג על כל הבדיקות
      if (user.role === "admin") {
        console.log(`🟢 ADMIN bypass for ${type}:${action}`);
        return next();
      }

      // -----------------------------
      // שלב 1 — משיכת האובייקט לפי ID
      // -----------------------------
      const id = req.params.id || req.params.projectId;
      let item = null;

      if (type === "invoice") item = await Invoice.findById(id);
      if (type === "order") item = await Order.findById(id);
      if (type === "supplier") item = await Supplier.findById(id);
      if (type === "project") item = await Project.findById(id);

      if (!item) {
        console.log(`❌ ${type} (${id}) not found`);
        return res.status(404).json({ message: `${type} לא נמצא` });
      }

      // -----------------------------
      // שלב 2 — חילוץ projectId
      // -----------------------------
      const projectId =
        item.projectId ||
        item.project ||
        (type === "project" ? item._id : null);

      if (!projectId) {
        console.log(`❌ No projectId found for ${type} ${id}`);
        return res.status(403).json({ message: "אין הרשאה לפרויקט זה" });
      }

      // -----------------------------
      // שלב 3 — בדיקת גישה לפרויקט
      // -----------------------------
      if (!canAccessProject(user, projectId)) {
        console.log(
          `❌ User ${user.username} cannot access project ${projectId}`
        );
        return res.status(403).json({ message: "אין גישה לפרויקט זה" });
      }

      // -----------------------------
      // שלב 4 — בדיקת גישה למודול (חשבוניות/הזמנות/ספקים)
      // -----------------------------
      const moduleName = type + "s";

      if (!canAccessModule(user, projectId, moduleName, action)) {
        console.log(
          `❌ User ${user.username} cannot ${action} in module ${moduleName} of project ${projectId}`
        );
        return res.status(403).json({ message: "אין הרשאה לביצוע פעולה זו" });
      }

      // -----------------------------
      // אם עבר — הכל תקין
      // -----------------------------
      console.log(
        `🟢 Access granted: user=${user.username}, module=${moduleName}, action=${action}, project=${projectId}`
      );

      next();
    } catch (err) {
      console.error("❌ checkAccess error:", err);
      return res.status(403).json({ message: "אין הרשאה" });
    }
  };
};


