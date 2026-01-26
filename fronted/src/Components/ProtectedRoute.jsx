// Components/ProtectedRoute.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/api";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  module = null,
  requireEdit = false,
}) => {
  const { projectId, id } = useParams(); // id = invoice/order/supplier ID
  const location = useLocation();
  const {
    isAdmin,
    isAuthenticated,
    loading: authLoading,
    canViewModule,
    canEditModule,
  } = useAuth();

  const [permissionCheck, setPermissionCheck] = useState({
    loading: true,
    hasPermission: true,
  });

  // בדיקת הרשאה
  useEffect(() => {
    const checkPermission = async () => {

      if (!isAuthenticated && module) {
        setPermissionCheck({ loading: false, hasPermission: false });
        return;
      }


      // אם אין module - רק בדיקת authentication
      if (!module) {
        setPermissionCheck({ loading: false, hasPermission: true });
        return;
      }

      // אם זה admin - יש הרשאה לכל
      if (isAdmin) {
        setPermissionCheck({ loading: false, hasPermission: true });
        return;
      }

      // ✅ דפי יצירה (אין id ב-URL)
      if (!id && !projectId) {
        // בדוק אם יש הרשאה לאיזשהו פרויקט
        const hasPermission = requireEdit
          ? canEditModule(null, module)
          : canViewModule(null, module);

        if (!hasPermission) {
          setPermissionCheck({ loading: false, hasPermission: false });
          return;
        }

        setPermissionCheck({ loading: false, hasPermission: true });
        return;
      }

      // ✅ דפי עריכה/פרטים - צריך לטעון את ה-projectId
      if (id && module && isAuthenticated) {

        try {
          // קבע את ה-endpoint לפי המודול
          let endpoint = "";
          if (module === "invoices") endpoint = `/invoices/${id}`;
          else if (module === "orders") endpoint = `/orders/${id}`;
          else if (module === "suppliers") endpoint = `/suppliers/${id}`;

          const response = await api.get(endpoint);
          const data = response.data.data || response.data;

          // קבל את ה-projectId מהנתונים
          const itemProjectId =
            data.project?._id || data.projectId || data.project;

          // בדוק הרשאה
          const hasPermission = requireEdit
            ? canEditModule(itemProjectId, module)
            : canViewModule(itemProjectId, module);

          setPermissionCheck({ loading: false, hasPermission });
        } catch (error) {
          console.error("Error checking permissions:", error);
          setPermissionCheck({ loading: false, hasPermission: false });
        }
        return;
      }

      // ✅ יש projectId ב-URL (דפי פרויקט)
      if (projectId) {
        const hasPermission = requireEdit
          ? canEditModule(projectId, module)
          : canViewModule(projectId, module);

        setPermissionCheck({ loading: false, hasPermission });
        return;
      }

      // ברירת מחדל - הצג את הדף
      setPermissionCheck({ loading: false, hasPermission: true });
    };

    if (!authLoading) {
      checkPermission();
    }
}, [authLoading, isAuthenticated, isAdmin, id, projectId, module, requireEdit]);

  // טוען...
  if (authLoading || permissionCheck.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  // לא מחובר
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // דרישת אדמין
  if (adminOnly && !isAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // ✅ אין הרשאה למודול
  if (!permissionCheck.hasPermission) {
    return <Navigate to="/no-access" replace />;
  }

  return children;
};

export default ProtectedRoute;
