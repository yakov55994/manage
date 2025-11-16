// context/AuthContext.jsx
import { createContext, useState, useContext, useEffect, useRef } from "react";
import api from "../api/api";

const AuthContext = createContext();

// =========================
// NORMALIZE USER PERMISSIONS
// =========================
const normalizeUser = (u) => {
  if (!u) return null;

  return {
    ...u,
    permissions: Array.isArray(u.permissions) ? u.permissions : [], // ← חשוב!
  };
};

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
  // LOAD USER ON START
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
  // DEBOUNCED LOGOUT HANDLER
  // =========================
  useEffect(() => {
    let logoutTimeout = null;

    const handleLogout = () => {
      if (logoutTimeout) clearTimeout(logoutTimeout);

      logoutTimeout = setTimeout(() => {
        const res = logout();
        if (res.success) {
          window.location.href = "/login";
        }
      }, 100);
    };

    window.addEventListener("auth:logout", handleLogout);

    return () => {
      if (logoutTimeout) clearTimeout(logoutTimeout);
      window.removeEventListener("auth:logout", handleLogout);
    };
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

  const isAdmin = user?.role === "admin";
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
