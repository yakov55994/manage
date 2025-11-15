export const checkProjectOwner = (requiredAccess = "view") => {
  return (req, res, next) => {
    const user = req.user;
    const projectId = req.params.id || req.params.projectId;

    if (!projectId) {
      return res.status(400).json({ message: "projectId חסר" });
    }

    // אם מנהל — תמיד לעבור
    if (user.role === "admin") return next();

    const permissions = user.permissions?.projects || [];
    const proj = permissions.find(
      (p) => String(p.project) === String(projectId)
    );

    if (!proj) {
      return res.status(403).json({
        message: "אין לך הרשאה לפרויקט זה",
      });
    }

    if (requiredAccess === "edit" && proj.access !== "edit") {
      return res.status(403).json({
        message: "אין לך הרשאת עריכה בפרויקט זה",
      });
    }

    next();
  };
};
