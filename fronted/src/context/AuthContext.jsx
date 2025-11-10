// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/api"; // axios instance

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);        // ⬅️ חשוב
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // לקרוא טוקן מה־localStorage
  const token = (() => {
    try { return localStorage.getItem("auth_token") || null; }
    catch { return null; }
  })();

  // לצרף טוקן לכל בקשה
  useEffect(() => {
    api.interceptors.request.use((config) => {
      const t = localStorage.getItem("auth_token");
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    // 401 -> התנתקות
    const resp = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) doLogout(false);
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(resp);
    // eslint-disable-next-line
  }, []);

  // אימות ראשוני של המשתמש
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      try {
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          return;
        }
        const { data } = await api.get("/auth/me");   // ⬅️ ודא שהנתיב קיים ומוחרג ממידלוורים לא רלוונטיים
        if (!cancelled) {
          setUser(data?.user || data || null);
          setIsAuthenticated(!!data);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setLoading(false);            // ⬅️ תמיד לסגור loading
      }
    };
    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [token]);

  const doLogin = async ({ token, user }) => {
    localStorage.setItem("auth_token", token);
    if (user) localStorage.setItem("auth_user", JSON.stringify(user));
    setUser(user || null);
    setIsAuthenticated(true);
  };

  const doLogout = (clearServerSession = true) => {
    try {
      if (clearServerSession) api.post("/auth/logout").catch(() => {});
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setUser(null);
      setIsAuthenticated(false);
    }
    return { success: true };
  };

  const value = useMemo(() => ({
    loading,
    isAuthenticated,
    user,
    login: doLogin,
    logout: doLogout,
    isAdmin: user?.role === "admin"
  }), [loading, isAuthenticated, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
