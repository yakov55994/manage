export const checkProjectPermission = (moduleName, required, wantProjectId = true) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      // אם לא נדרש projectId — תן לעבור
      if (!wantProjectId) return next();

      // משיכות projectId מתוך הבקשה
      const projectId =
        req.params.projectId ||
        req.body.project ||
        req.body.projectId ||
        req.query.projectId;

      // אין projectId? תחזיר שגיאה
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is missing",
        });
      }

      // אם אדמין — גישה לכל פרויקט
      if (user.role === "admin") return next();

      // לא אדמין — בודק הרשאות
      const proj = user.permissions?.projects?.find(
        (p) => String(p.project) === String(projectId)
      );

      if (!proj) {
        return res.status(403).json({
          success: false,
          message: "אין לך גישה לפרויקט זה",
        });
      }

      const currentLevel = proj.modules?.[moduleName] || proj.access;

      if (required === "edit" && currentLevel !== "edit") {
        return res.status(403).json({
          success: false,
          message: "אין הרשאת עריכה",
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  };
};
