// middleware/permissions.js

export const checkProjectPermission = (moduleName, required) => {
  return async (req, res, next) => {
    try {
      const user = req.user; // מגיע מה-protect
      const projectId =
        req.params.projectId ||
        req.body.project ||
        req.body.projectId ||
        req.query.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is missing",
        });
      }

      // אם מנהל – גישה מלאה
      if (user.role === "admin") return next();

      // מוצא את ההרשאה של היוזר לפרויקט הזה
      const proj = user.permissions?.projects?.find(
        (p) => String(p.project) === String(projectId)
      );

      if (!proj) {
        return res.status(403).json({
          success: false,
          message: "אין לך גישה לפרויקט זה",
        });
      }

      // רמת ההרשאה הנוכחית
      const currentLevel = proj.modules?.[moduleName] || proj.access;

      // בודק עריכה
      if (required === "edit" && currentLevel !== "edit") {
        return res.status(403).json({
          success: false,
          message: "אין הרשאת עריכה",
        });
      }

      return next();
    } catch (err) {
      console.error("Permission error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
};
