// ============================
// הרשאות מדויקות לפי מודולים
// ============================

import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";

// בדיקה שהמשתמש נמצא בפרויקט (לא לפי access!)
function isInProject(user, projectId) {
  return user.permissions.some(
    (p) => String(p.project) === String(projectId)
  );
}

// בדיקת הרשאת מודול
function canAccessModule(user, projectId, moduleName, action) {
  const perm = user.permissions.find(
    (p) => String(p.project) === String(projectId)
  );

  if (!perm) return false;

  const level = perm.modules?.[moduleName]; // none/view/edit
  if (!level || level === "none") return false;

  if (action === "view") return level === "view" || level === "edit";
  if (action === "edit") return level === "edit";

  return false;
}

// 🔥 CheckAccess – הגרסה הנכונה
export const checkAccess = (type, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // אדמין תמיד עובר
      if (user.role === "admin") return next();

      const id = req.params.id || req.params.invoiceId || req.params.orderId || req.params.supplierId || req.params.projectId;

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

      // זיהוי פרויקט
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

      // 2️⃣ מודולים (רק להזמנה/חשבונית/ספק)
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
