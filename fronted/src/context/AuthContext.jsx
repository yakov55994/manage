// =============================
// AuthContext.jsx – FIXED FULL VERSION
// =============================
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import api from "../api/api.js";

const AuthContext = createContext();

// =====================================
// NORMALIZE USER PERMISSIONS
// =====================================
const normalizeUser = (u) => {
  if (!u) return null;

  return {
    ...u,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
  };
};

// =====================================
// PERMISSION LEVELS
// =====================================
const levels = { none: 0, view: 1, edit: 2 };

// מביא הרשאת פרויקט לפי ID
const getProjectPerm = (user, projectId) => {
  if (!user || !projectId) return null;

  return (
    user.permissions?.find(
      (p) => String(p.project) === String(projectId)
    ) || null
  );
};

// האם המשתמש יכול לראות פרויקט?
const canViewProject = (user, projectId) => {
  if (user?.role === "admin") return true;

  const perm = getProjectPerm(user, projectId);
  return perm && levels[perm.access] >= levels.view;
};

// האם המשתמש יכול לערוך פרויקט?
const canEditProject = (user, projectId) => {
  if (user?.role === "admin") return true;

  const perm = getProjectPerm(user, projectId);
  return perm && levels[perm.access] >= levels.edit;
};

// האם המשתמש יכול לעבוד על מודול מסוים (חשבוניות / הזמנות וכו)
const canAccessModule = (
  user,
  projectId,
  moduleName,
  required = "view"
) => {
  if (user?.role === "admin") return true;

  const perm = getProjectPerm(user, projectId);
  if (!perm || !perm.modules) return false;

  return levels[perm.modules[moduleName]] >= levels[required];
};

// =====================================
// AUTH PROVIDER
// =====================================
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // יוזר מחובר
  const [loading, setLoading] = useState(true); // טעינת מצב התחברות
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
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        const normalized = normalizeUser(parsed);

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setUser(normalized);
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
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

  // =========================
  // DEBUGGER
  // =========================
  useEffect(() => {
    console.log("==== USER DEBUG ====");
    console.log("USER:", user);
    console.log("IS ADMIN:", isAdmin);
    console.log("USER PERMISSIONS:", user?.permissions);
    console.log("TOKEN:", localStorage.getItem("token"));
  }, [user]);

  // =========================
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

        // פונקציות הרשאה
        canViewProject: (projectId) =>
          canViewProject(user, projectId),

        canEditProject: (projectId) =>
          canEditProject(user, projectId),

        canViewModule: (projectId, module) =>
          canAccessModule(user, projectId, module, "view"),

        canEditModule: (projectId, module) =>
          canAccessModule(user, projectId, module, "edit"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
