// =============================
// AuthContext.jsx – FIXED FULL VERSION
// =============================
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import api from "../api/api.js";
import useInactivityTimeout from "../hooks/useInactivityTimeout.js";

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

  // רואת חשבון יכולה רק לצפות בחשבוניות, לא לערוך
  if (user.role === "accountant") {
    if (moduleName === "invoices" && required === "view") return true;
    return false; // אין הרשאת עריכה או גישה למודולים אחרים
  }

  // משתמש מוגבל - יכול לעבוד על חשבוניות לפי ההרשאות שהוגדרו לו
  if (user.role === "limited") {
    if (moduleName === "invoices") {
      // אם אין projectId - בדוק אם יש לו הרשאה לאיזשהו פרויקט
      if (!projectId) {
        return user.permissions?.some(
          (p) => levels[p.modules?.invoices] >= levels[required]
        ) || false;
      }

      // בדוק הרשאה לפרויקט ספציפי
      const perm = getProjectPerm(user, projectId);
      if (!perm || !perm.modules) return false;

      // בדוק את רמת ההרשאה בפועל
      return levels[perm.modules?.invoices] >= levels[required];
    }
    return false; // אין גישה למודולים אחרים
  }

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
  const [inactivityLogout, setInactivityLogout] = useState(false);
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

        // רענון נתוני משתמש מהשרת (תפקיד, הרשאות וכו')
        api.get("/auth/me").then((res) => {
          if (res.data?.success && res.data.user) {
            const fresh = normalizeUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(fresh));
            setUser(fresh);
          }
        }).catch(() => {
          // token פג תוקף - נקה ותנתק
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          delete api.defaults.headers.common["Authorization"];
          setUser(null);
        });
      } catch (err) {
        console.error("❌ Error parsing user data:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else {
      console.error("⚠️ No token or user in localStorage");
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
  const isLimited = user?.role === "limited";
  const isAuthenticated = !!user;

  // =========================
  // INACTIVITY TIMEOUT (7 שעות)
  // =========================
  const handleInactivityTimeout = useCallback(() => {
    if (!user) return;
    logoutInProgress.current = true;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setInactivityLogout(true);
  }, [user]);

  useInactivityTimeout(handleInactivityTimeout, isAuthenticated);

  const clearInactivityFlag = useCallback(() => {
    setInactivityLogout(false);
  }, []);

  // EXPORT TO CONTEXT
  // =========================
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isLimited,
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

        // מצב שינה
        inactivityLogout,
        clearInactivityFlag,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
