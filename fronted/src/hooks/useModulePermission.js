// hooks/useModulePermission.js
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export function useModulePermission(projectId, moduleName) {
  const { user, isAdmin } = useAuth();

  return useMemo(() => {
    // אם האדמין מחובר — יש הכל
    if (isAdmin) {
      return { canView: true, canEdit: true, level: "edit" };
    }

    // אם עוד אין user (בטעינה ראשונית של Auth)
    if (!user) {
      return { canView: false, canEdit: false, level: "none" };
    }

    // אם אין הרשאות או אין פרויקט
    if (!Array.isArray(user.permissions) || !projectId) {
      return { canView: false, canEdit: false, level: "none" };
    }

    // מוצא את ההרשאות לפרויקט הספציפי
    const projectPerm = user.permissions.find(
      (p) => String(p.project) === String(projectId)
    );

    if (!projectPerm) {
      return { canView: false, canEdit: false, level: "none" };
    }

    const level = projectPerm.modules?.[moduleName] || "none";

    return {
      canView: level === "view" || level === "edit",
      canEdit: level === "edit",
      level,
    };
  }, [user, isAdmin, projectId, moduleName]);
}
