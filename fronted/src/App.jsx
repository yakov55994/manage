import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Sidebar from "./pages/NavBar";
import CreateProject from "./pages/Project/Create_Project";
import CreateInvoice from "./pages/Invoice/Create_Invoice";
import CreateOrder from "./pages/Order/Create_Order.jsx";
import Projects from "./pages/Project/View_Projects";
import Invoices from "./pages/Invoice/View_Invoices";
import Orders from "./pages/Order/View_Orders";
import ProjectDetailsPage from "./pages/Project/ProjectDetailsPage";
import InvoiceDetailsPage from "./pages/Invoice/InvoiceDetailsPage";
import Order_Detail_Page from "./pages/Order/Orders_Details_Page.jsx";
import UpdateProject from "./pages/Project/UpdateProject.jsx";
import UpdateInvoice from "./pages/Invoice/UpdateInvoice.jsx";
import UpdateOrder from "./pages/Order/Update_Orders.jsx";
import SearchResults from "./pages/Search/SearchResults.jsx";
import Home from "./pages/Home.jsx";
import SummaryPage from "./pages/Summary_Page.jsx";
import Notes from "./pages/Notes.jsx";
import Login from "./Auth/Login.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import "./App.css";
import { Toaster } from "sonner";
import { ArrowRightCircle, KeyRound } from "lucide-react";
import api from "./api/api.jsx"; // האינסטנס של axios עם withCredentials
import { toast } from "sonner";
import CreateSupplier from "./pages/Supplier/create_supplier.jsx";
import SuppliersPage from "./pages/Supplier/Supplier_view.jsx";
import SupplierDetailsPage from "./pages/Supplier/Supplier_details.jsx";
import SupplierEditPage from "./pages/Supplier/Supplier_update.jsx";
import UserManagement from "./pages/UserManagement.jsx";

// קומפוננט פנימי שמשתמש ב-hooks
const AppContent = () => {
  const [isLogin, setIsLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // useEffect שמוודא אם המשתמש מחובר
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get("/auth-status");
        if (response.data.authenticated) {
          setIsLogin(true);
        } else {
          setIsLogin(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsLogin(false);
      }
    };

    checkAuthStatus();
  }, [location]);

  // פונקציה להתנתקות – שולחת קריאה לשרת למחיקת הקוקי
  const handleLogout = async () => {
    try {
      await api.post("/logout");
      setIsLogin(false);
      toast.success("ההתנתקות בוצעה בהצלחה, להתראות 👋", {
        duration: 5000, // 5 שניות
        className: "sonner-toast success rtl",
      });
      localStorage.removeItem("auth_token");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
      toast.error("שגיאה בהתנתקות");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-6 mt-20">
          {/* מציג כפתור התחברות או התנתקות */}
          <div className="mb-0 mr-auto max-w-60 top-1 z-50 flex items-center gap-4 text-white p-2">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-sm tracking-wide shadow-lg ${
                isLogin ? "bg-green-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shadow-lg ${
                  isLogin ? "bg-green-200" : "bg-red-200"
                }`}
              ></div>
              <b>{isLogin ? "מחובר/ת" : "מנותק/ת"}</b>
            </div>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-sm tracking-wide transition-all hover:scale-105 ${
                isLogin
                  ? "bg-red-600 text-white hover:bg-red-500 shadow-red-600/30"
                  : "bg-green-600 text-white hover:bg-green-500 shadow-green-600/30"
              } shadow-lg`}
              onClick={isLogin ? handleLogout : () => navigate("/login")}
            >
              {isLogin ? (
                <ArrowRightCircle className="w-4 h-4" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{isLogin ? "התנתק" : "התחברות"}</span>
            </button>
          </div>

          <Routes>
            <Route path="*" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<SearchResults />} />

            {/* נתיבים מוגנים */}
            <Route
              path="/create-project"
              element={
                <ProtectedRoute>
                  <CreateProject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-invoice"
              element={
                <ProtectedRoute>
                  <CreateInvoice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-order"
              element={
                <ProtectedRoute>
                  <CreateOrder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoice/:id"
              element={
                <ProtectedRoute>
                  <InvoiceDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:id"
              element={
                <ProtectedRoute>
                  <Order_Detail_Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-project/:id"
              element={
                <ProtectedRoute>
                  <UpdateProject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-invoice/:id"
              element={
                <ProtectedRoute>
                  <UpdateInvoice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-order/:id"
              element={
                <ProtectedRoute>
                  <UpdateOrder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary-page"
              element={
                <ProtectedRoute>
                  <SummaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Notes"
              element={
                <ProtectedRoute>
                  <Notes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-supplier"
              element={
                <ProtectedRoute>
                  <CreateSupplier />
                </ProtectedRoute>
              }
            />

            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/supplier/:id"
              element={
                <ProtectedRoute>
                  <SupplierDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-supplier/:id"
              element={
                <ProtectedRoute>
                  <SupplierEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
      
      {/* Footer קבוע בתחתית הדף */}
      <footer className="bg-gray-50 border-t border-gray-200 py-4">
        <p className="text-center font-bold text-slate-600">
  © כל הזכויות שמורות ל
  <a 
    href="https://yc-dev.pages.dev" 
    target="_blank" 
    rel="noopener noreferrer"
  >
    יעקב כהן
  </a>
</p>      </footer>
      
      <Toaster />
    </div>
  );
};

// קומפוננט ראשי
const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;