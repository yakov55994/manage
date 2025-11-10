// src/Components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  // בזמן טעינה – הצג ספינר קצר/תצוגה מינימלית
  if (loading) {
    return (
      <div className="h-[50vh] grid place-items-center text-slate-600">
        <div className="animate-pulse text-center">
          <div className="mb-2 font-bold">טוען הרשאות...</div>
          <div className="w-12 h-12 rounded-full border-4 border-gray-300 border-t-transparent animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // לא מחובר
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // דרוש Admin
  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}
