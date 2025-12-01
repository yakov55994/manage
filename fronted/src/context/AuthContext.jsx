// =============================
// AuthContext.jsx – FIXED FULL VERSION
// =============================
import { createContext, useState, useContext, useEffect, useRef } from "react";
import api from "../api/api.js";

const AuthContext = createContext();

// =====================================
// NORMALIZE USER PERMISSIONS
// =====================================
const normalizeUser = (u) => {
  if (!u) return null;

  return {
    ...u,
    permissions: Array.isArray(u.permissions)
      ? u.permissions.map((p) => ({
          ...p,
          // ✅ תיקון: בדיקה ש-project לא null
          project: p.project?._id ?? p.project,
        }))
      : [],
  };
};

// =====================================
// PERMISSION LEVELS
// =====================================
const levels = { none: 0, view: 1, edit: 2 };

// context/AuthContext.jsx

const getProjectPerm = (user, projectId) => {
  if (!user || !projectId) return null;

  // ✅ נרמל את projectId שמקבלים
  const normalizedSearchId =
    typeof projectId === "object" ? projectId._id || projectId.$oid : projectId;

  return (
    user.permissions?.find((p) => {
      // ✅ נרמל את project בהרשאה
      let permProjectId = p.project;

      if (typeof permProjectId === "object") {
        permProjectId = permProjectId._id || permProjectId.$oid;
      }

      // ✅ השווה כ-strings
      return String(permProjectId) === String(normalizedSearchId);
    }) || null
  );
};

// ✅ תקן את הפונקציה להחזיר תמיד boolean
const canViewProject = (user, projectId) => {
  if (!user) return false;
  if (user?.role === "admin") return true;

  const perm = getProjectPerm(user, projectId);
  if (!perm) return false;

  const accessLevel = levels[perm.access];
  if (accessLevel === undefined) return false;

  return accessLevel >= levels.view;
};

// ✅ תקן גם את canEditProject
const canEditProject = (user, projectId) => {
  if (!user) return false;
  if (user?.role === "admin") return true;

  const perm = getProjectPerm(user, projectId);
  if (!perm) return false;

  const accessLevel = levels[perm.access];
  if (accessLevel === undefined) return false;

  return accessLevel >= levels.edit;
};

// האם המשתמש יכול לעבוד על מודול מסוים (חשבוניות / הזמנות וכו)
const canAccessModule = (user, projectId, moduleName, required = "view") => {
  if (!user) return false;
  if (!user.permissions) return false;

  if (user.role === "admin") return true;

  // אם אין projectId – נבדוק האם יש פרויקט כלשהו עם הרשאה
  if (!projectId) {
    return user.permissions.some(
      (p) => levels[p.modules?.[moduleName]] >= levels[required]
    );
  }

  const perm = getProjectPerm(user, projectId);
  if (!perm || !perm.modules) return false;

  return levels[perm.modules[moduleName]] >= levels[required];
};

// =====================================
// AUTH PROVIDER
// =====================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutInProgress = useRef(false);

  // =========================
  // LOGOUT
  // =========================
  const logout = () => {
    if (logoutInProgress.current) return { success: false };

    logoutInProgress.current = true;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);

    return { success: true };
  };

  // =========================
  // LOAD USER ON APP START
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userDataString = localStorage.getItem("user");

    if (token && userDataString) {
      try {
        const userData = JSON.parse(userDataString);

        const normalized = normalizeUser(userData);

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setUser(normalized);
      } catch (err) {
        console.error("❌ Error parsing user data:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else {
      console.log("⚠️ No token or user in localStorage");
    }

    setLoading(false);
  }, []);

  // =========================
  // LOGIN
  // =========================
  const login = async ({ token, user: userData }) => {
    logoutInProgress.current = false;

    const normalized = normalizeUser(userData);

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalized));

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(normalized);
  };

  // =========================
  // FLAGS
  // =========================
  const isAdmin = user?.role === "admin";
  const isAuthenticated = !!user;

  // EXPORT TO CONTEXT
  // =========================
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isAuthenticated,
        loading,

        // פונקציות הרשאה כלליות
        canViewProject: (projectId) => canViewProject(user, projectId),
        canEditProject: (projectId) => canEditProject(user, projectId),
        canViewModule: (projectId, module) =>
          canAccessModule(user, projectId, module, "view"),
        canEditModule: (projectId, module) =>
          canAccessModule(user, projectId, module, "edit"),
        canViewAnyProject: () => {
          if (isAdmin) return true;
          return user?.permissions?.some(
            (p) => p.access === "view" || p.access === "edit"
          );
        },

        // ✅ פונקציות נוחות למודולים ספציפיים
        canViewInvoices: (projectId) =>
          canAccessModule(user, projectId, "invoices", "view"),
        canEditInvoices: (projectId) =>
          canAccessModule(user, projectId, "invoices", "edit"),

        canViewOrders: (projectId) =>
          canAccessModule(user, projectId, "orders", "view"),
        canEditOrders: (projectId) =>
          canAccessModule(user, projectId, "orders", "edit"),

        canViewSuppliers: (projectId) =>
          canAccessModule(user, projectId, "suppliers", "view"),
        canEditSuppliers: (projectId) =>
          canAccessModule(user, projectId, "suppliers", "edit"),

        canViewFiles: (projectId) =>
          canAccessModule(user, projectId, "files", "view"),
        canEditFiles: (projectId) =>
          canAccessModule(user, projectId, "files", "edit"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
