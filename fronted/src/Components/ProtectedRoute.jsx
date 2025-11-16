import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // אם השרת החזיר 403 בעמודים פנימיים – נחסום כאן
  if (user.blocked) {
    return (
      <div className="p-10 text-center text-red-600 text-3xl font-bold">
        אין הרשאה
      </div>
    );
  }

  return children;
}
