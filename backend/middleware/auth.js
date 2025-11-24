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
// במידלוור authMiddleware.js - תקן את checkAccess:

export const checkAccess = (type, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      console.log("\n========== CHECK ACCESS ==========");
      console.log("TYPE:", type);
      console.log("ACTION:", action);
      console.log("USER ID:", user._id);
      console.log("USER PERMISSIONS:", JSON.stringify(user.permissions, null, 2));

      if (user.role === "admin") {
        console.log("ADMIN → PASS\n");
        return next();
      }

      const id =
        req.params.id ||
        req.params.invoiceId ||
        req.params.orderId ||
        req.params.supplierId ||
        req.params.projectId;

      console.log("ITEM ID FROM PARAMS:", id);

      let item = null;
      let moduleName = null;

      switch (type) {
        case "invoices":
        case "invoice":
          item = await Invoice.findById(id);
          moduleName = "invoices";
          break;

        case "orders":
        case "order":
          item = await Order.findById(id);
          moduleName = "orders";
          break;

        case "suppliers":
        case "supplier":
          item = await Supplier.findById(id);
          moduleName = "suppliers";
          break;

        case "projects":
        case "project":
          item = await Project.findById(id);
          moduleName = null;
          break;
      }

      console.log("FOUND ITEM:", item ? "YES" : "NO");

      if (!item) {
        console.log("❌ ITEM NOT FOUND → 404\n");
        return res.status(404).json({ message: "לא נמצא" });
      }

      const projectId = String(
        item.projectId ||
        item.project ||
        (type === "project" || type === "projects" ? item._id : "")
      );

      console.log("PROJECT ID DETECTED:", projectId);

      // 🔥 FIX: השתמש ב-toString() במקום String()
      const hasProject = user.permissions.some((p) => {
        const permProjectId = p.project?.toString() || String(p.project);
        console.log(`Comparing: ${permProjectId} === ${projectId}`);
        return permProjectId === projectId;
      });

      console.log("HAS PROJECT ACCESS:", hasProject);

      if (!hasProject) {
        console.log("❌ NO PROJECT ACCESS → 403\n");
        return res.status(403).json({ message: "אין גישה לפרויקט" });
      }

      // אם אין modules — אין מה לבדוק
      if (!moduleName) {
        console.log("NO MODULE CHECK NEEDED → PASS\n");
        return next();
      }

      // בדיקת מודולים
      const perm = user.permissions.find((p) => {
        const permProjectId = p.project?.toString() || String(p.project);
        return permProjectId === projectId;
      });

      const level = perm.modules?.[moduleName];

      console.log("MODULE NAME:", moduleName);
      console.log("MODULE LEVEL:", level);

      if (action === "view") {
        if (level === "none" || !level) {
          console.log("❌ VIEW DENIED\n");
          return res.status(403).json({ message: "אין הרשאה" });
        }
      }

      if (action === "edit") {
        if (level !== "edit") {
          console.log("❌ EDIT DENIED\n");
          return res.status(403).json({ message: "אין הרשאה" });
        }
      }

      console.log("✔ ACCESS GRANTED!\n");
      next();
    } catch (err) {
      console.log("❌ CHECK ACCESS ERROR:", err, "\n");
      return res.status(500).json({ message: "שגיאת הרשאות" });
    }
  };
};
