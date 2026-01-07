import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import Sidebar from "./pages/NavBar";
import CreateProject from "./pages/Project/Create_Project";
import CreateInvoice from "./pages/Invoice/Create_Invoice";
import CreateSalary from "./pages/Salary/Create_Salary.jsx";
import ViewSalaries from "./pages/Salary/View_Salaries.jsx";
import SalaryDetailsPage from "./pages/Salary/Salery_DetailsPage.jsx";
import UpdateSalary from "./pages/Salary/Update_Salery.jsx";
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
import CreateSupplier from "./pages/Supplier/create_supplier.jsx";
import SuppliersPage from "./pages/Supplier/Supplier_view.jsx";
import SupplierDetailsPage from "./pages/Supplier/Supplier_details.jsx";
import SupplierEditPage from "./pages/Supplier/Supplier_update.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import CreateIncome from "./pages/Income/Create_Income.jsx";
import ViewIncomes from "./pages/Income/View_Incomes.jsx";
import IncomeDetailsPage from "./pages/Income/IncomeDetailsPage.jsx";
import UpdateIncome from "./pages/Income/UpdateIncome.jsx";
import NoAccess from "./pages/NoAccess.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { ArrowRightCircle, KeyRound } from "lucide-react";
import "./App.css";

const AppContent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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
        <div className="flex-1 p-6 mt-20 ml-10">
          <div className="mb-0 mr-auto max-w-60 top-1 z-50 flex items-center gap-4 text-white p-2">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold text-sm tracking-wide shadow-lg ${
                isAuthenticated
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
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
              onClick={
                isAuthenticated ? handleLogout : () => navigate("/login")
              }
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
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/no-access" element={<NoAccess />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            <Route
              path="/create-project"
              element={
                <ProtectedRoute adminOnly>
                  <CreateProject />
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
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-project/:id"
              element={
                <ProtectedRoute adminOnly>
                  <UpdateProject />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-invoice"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <CreateInvoice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-salary"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <CreateSalary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries"
              element={
                <ProtectedRoute module="invoices">
                  <ViewSalaries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries/:id"
              element={
                <ProtectedRoute module="invoices">
                  <SalaryDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries/:id/edit"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <UpdateSalary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-salary/:id"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <UpdateSalary />
                </ProtectedRoute>
              }
            />

            <Route
              path="/invoices"
              element={
                <ProtectedRoute module="invoices">
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute module="invoices">
                  <InvoiceDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-invoice/:id"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <UpdateInvoice />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-order"
              element={
                <ProtectedRoute module="orders" requireEdit={true}>
                  <CreateOrder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute module="orders">
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute module="orders">
                  <Order_Detail_Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-order/:id"
              element={
                <ProtectedRoute module="orders" requireEdit={true}>
                  <UpdateOrder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-supplier"
              element={
                <ProtectedRoute module="suppliers" requireEdit={true}>
                  <CreateSupplier />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute module="suppliers">
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers/:id"
              element={
                <ProtectedRoute module="suppliers">
                  <SupplierDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-supplier/:id"
              element={
                <ProtectedRoute module="suppliers" requireEdit={true}>
                  <SupplierEditPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-income"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <CreateIncome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes"
              element={
                <ProtectedRoute module="invoices">
                  <ViewIncomes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes/:id"
              element={
                <ProtectedRoute module="invoices">
                  <IncomeDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-income/:id"
              element={
                <ProtectedRoute module="invoices" requireEdit={true}>
                  <UpdateIncome />
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
                <ProtectedRoute adminOnly>
                  <Notes />
                </ProtectedRoute>
              }
            />
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

      <footer className="border-gray-200 py-4">
        <p className="text-center font-bold text-white">
          © כל הזכויות שמורות ל
          <a
            href="https://yc-dev.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className=""
          >
            {" "}
            יעקב כהן
          </a>
        </p>
      </footer>

      <Toaster />
    </div>
  );
};

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
