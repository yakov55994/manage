import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
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
import { toast } from "sonner";
import CreateSupplier from "./pages/Supplier/create_supplier.jsx";
import SuppliersPage from "./pages/Supplier/Supplier_view.jsx";
import SupplierDetailsPage from "./pages/Supplier/Supplier_details.jsx";
import SupplierEditPage from "./pages/Supplier/Supplier_update.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"; // ✅ הוסף import

// קומפוננט פנימי שמשתמש ב-hooks
const AppContent = () => {
  const { user, isAuthenticated, logout } = useAuth(); // ✅ השתמש ב-context
  const navigate = useNavigate();

  // פונקציה להתנתקות
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast.success("ההתנתקות בוצעה בהצלחה, להתראות 👋", {
        duration: 5000,
        className: "sonner-toast success rtl",
      });
      navigate("/login");
    } else {
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
                isAuthenticated ? "bg-green-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shadow-lg ${
                  isAuthenticated ? "bg-green-200" : "bg-red-200"
                }`}
              ></div>
              <b>{isAuthenticated ? "מחובר/ת" : "מנותק/ת"}</b>
              {user && <span className="mr-2">({user.username})</span>}
            </div>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-sm tracking-wide transition-all hover:scale-105 ${
                isAuthenticated
                  ? "bg-red-600 text-white hover:bg-red-500 shadow-red-600/30"
                  : "bg-green-600 text-white hover:bg-green-500 shadow-green-600/30"
              } shadow-lg`}
              onClick={isAuthenticated ? handleLogout : () => navigate("/login")}
            >
              {isAuthenticated ? (
                <ArrowRightCircle className="w-4 h-4" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{isAuthenticated ? "התנתק" : "התחברות"}</span>
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
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute>
                  <InvoiceDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
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
              path="/suppliers/:id"
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
            
            {/* ✅ ניהול משתמשים - רק לAdmin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
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
            {" "}יעקב כהן
          </a>
        </p>
      </footer>
      
      <Toaster />
    </div>
  );
};

// ✅ קומפוננט ראשי - עטוף ב-AuthProvider
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;