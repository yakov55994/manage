// hooks/useModulePermission.js

import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export function useModulePermission(projectId, moduleName) {
  const { user, isAdmin } = useAuth();

  const permission = useMemo(() => {
    if (isAdmin) {
      return { canView: true, canEdit: true, level: "edit" };
    }

    if (!user || !user.permissions || !projectId) {
      return { canView: false, canEdit: false, level: "none" };
    }

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

  return permission;
}