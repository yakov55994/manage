// context/AuthContext.jsx
import { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutInProgress = useRef(false); // 🆕 flag למניעת logout כפול

  // פונקציית logout
  const logout = () => {
    if (logoutInProgress.current) {
      console.log('⏭️ Logout already in progress, skipping...');
      return { success: false };
    }
    
    logoutInProgress.current = true;
    console.log('🚪 Logging out...');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    
    return { success: true };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('🔍 AuthContext init - token:', !!token, 'userData:', userData);
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ User loaded:', parsedUser);
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // 🆕 Debounced logout handler
  useEffect(() => {
    let logoutTimeout = null;
    
    const handleLogout = () => {
      // 🆕 אם כבר יש logout בתור - בטל את הישן
      if (logoutTimeout) {
        clearTimeout(logoutTimeout);
      }
      
      // 🆕 המתן 100ms לפני logout - אם יש עוד 401, נאחד אותם
      logoutTimeout = setTimeout(() => {
        console.log('🔔 Logout event received - clearing auth');
        const result = logout();
        
        if (result.success) {
          window.location.href = '/login';
        }
      }, 100); // 🆕 debounce של 100ms
    };

    window.addEventListener('auth:logout', handleLogout);
    
    return () => {
      if (logoutTimeout) {
        clearTimeout(logoutTimeout);
      }
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = async ({ token, user: userData }) => {
    console.log('🔐 Login - saving token and user:', userData);
    
    logoutInProgress.current = false; // 🆕 איפוס הflag
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  console.log('👤 Current user:', user, 'isAdmin:', isAdmin, 'isAuthenticated:', isAuthenticated);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin, 
      isAuthenticated,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);