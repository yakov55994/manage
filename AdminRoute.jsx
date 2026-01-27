import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = () => {
    const { user } = useAuth(); // אנו כבר יודעים שהוא מאומת בזכות ProtectedRoute

    // אם המשתמש הוא מנהל, הצג את העמוד. אחרת, הפנה לדף הבית.
    return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;