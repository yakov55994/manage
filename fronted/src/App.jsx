import { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import Sidebar from "./pages/NavBar";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Toaster } from "sonner";
import { toast } from "sonner";
import "./App.css";

// Lazy loaded pages - נטענים רק כשצריך
const CreateProject = lazy(() => import("./pages/Project/Create_Project"));
const CreateInvoice = lazy(() => import("./pages/Invoice/Create_Invoice"));
const CreateSalary = lazy(() => import("./pages/Salary/Create_Salary.jsx"));
const ViewSalaries = lazy(() => import("./pages/Salary/View_Salaries.jsx"));
const SalaryDetailsPage = lazy(() => import("./pages/Salary/Salery_DetailsPage.jsx"));
const UpdateSalary = lazy(() => import("./pages/Salary/Update_Salery.jsx"));
const CreateOrder = lazy(() => import("./pages/Order/Create_Order.jsx"));
const Projects = lazy(() => import("./pages/Project/View_Projects"));
const Invoices = lazy(() => import("./pages/Invoice/View_Invoices"));
const Orders = lazy(() => import("./pages/Order/View_Orders"));
const ProjectDetailsPage = lazy(() => import("./pages/Project/ProjectDetailsPage"));
const InvoiceDetailsPage = lazy(() => import("./pages/Invoice/InvoiceDetailsPage"));
const Order_Detail_Page = lazy(() => import("./pages/Order/Orders_Details_Page.jsx"));
const UpdateProject = lazy(() => import("./pages/Project/UpdateProject.jsx"));
const UpdateInvoice = lazy(() => import("./pages/Invoice/UpdateInvoice.jsx"));
const AllSubmittedInvoices = lazy(() => import("./pages/Invoice/AllSubmittedInvoices.jsx"));
const UpdateOrder = lazy(() => import("./pages/Order/Update_Orders.jsx"));
const SearchResults = lazy(() => import("./pages/Search/SearchResults.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const SummaryPage = lazy(() => import("./pages/Summary_Page.jsx"));
const Notes = lazy(() => import("./pages/Notes.jsx"));
const Login = lazy(() => import("./Auth/Login.jsx"));
const CreateSupplier = lazy(() => import("./pages/Supplier/create_supplier.jsx"));
const SuppliersPage = lazy(() => import("./pages/Supplier/Supplier_view.jsx"));
const SupplierDetailsPage = lazy(() => import("./pages/Supplier/Supplier_details.jsx"));
const SupplierEditPage = lazy(() => import("./pages/Supplier/Supplier_update.jsx"));
const UserManagement = lazy(() => import("./pages/UserManagement.jsx"));
const CreateIncome = lazy(() => import("./pages/Income/Create_Income.jsx"));
const ViewIncomes = lazy(() => import("./pages/Income/View_Incomes.jsx"));
const IncomeDetailsPage = lazy(() => import("./pages/Income/IncomeDetailsPage.jsx"));
const UpdateIncome = lazy(() => import("./pages/Income/UpdateIncome.jsx"));
const CreateExpense = lazy(() => import("./pages/Expense/Create_Expense.jsx"));
const ViewExpenses = lazy(() => import("./pages/Expense/View_Expenses.jsx"));
const ExpenseDetailsPage = lazy(() => import("./pages/Expense/ExpenseDetailsPage.jsx"));
const UpdateExpense = lazy(() => import("./pages/Expense/Update_Expense.jsx"));
const ExcelUpload = lazy(() => import("./pages/ExcelUpload/ExcelUpload.jsx"));
const NoAccess = lazy(() => import("./pages/NoAccess.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const ExportDataPage = lazy(() => import("./pages/ExportDataPage.jsx"));
const MasavBroadcast = lazy(() => import("./pages/MasavBroadcast/MasavBroadcast.jsx"));
const SystemLogs = lazy(() => import("./pages/SystemLogs.jsx"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
  </div>
);

const AppContent = () => {
  const { inactivityLogout, clearInactivityFlag } = useAuth();
  const navigate = useNavigate();

  // מצב שינה - התנתקות אוטומטית אחרי 7 שעות ללא פעילות
  useEffect(() => {
    if (inactivityLogout) {
      clearInactivityFlag();
      toast.info("ההפעלה הסתיימה עקב חוסר פעילות, יש להתחבר מחדש", {
        duration: 8000,
        className: "sonner-toast info rtl",
      });
      navigate("/login");
    }
  }, [inactivityLogout, clearInactivityFlag, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-6 mt-20 ml-10">
          <Suspense fallback={<PageLoader />}>
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
                <ProtectedRoute adminOnly>
                  <CreateSalary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries"
              element={
                <ProtectedRoute adminOnly>
                  <ViewSalaries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries/:id"
              element={
                <ProtectedRoute adminOnly>
                  <SalaryDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salaries/:id/edit"
              element={
                <ProtectedRoute adminOnly>
                  <UpdateSalary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-salary/:id"
              element={
                <ProtectedRoute adminOnly>
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
              path="/submitted-invoices"
              element={
                <ProtectedRoute module="invoices">
                  <AllSubmittedInvoices />
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
                <ProtectedRoute adminOnly>
                  <CreateIncome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes"
              element={
                <ProtectedRoute adminOnly allowAccountant>
                  <ViewIncomes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes/:id"
              element={
                <ProtectedRoute adminOnly allowAccountant>
                  <IncomeDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-income/:id"
              element={
                <ProtectedRoute adminOnly>
                  <UpdateIncome />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-expense"
              element={
                <ProtectedRoute adminOnly>
                  <CreateExpense />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute adminOnly allowAccountant>
                  <ViewExpenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/:id"
              element={
                <ProtectedRoute adminOnly allowAccountant>
                  <ExpenseDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/update-expense/:id"
              element={
                <ProtectedRoute adminOnly>
                  <UpdateExpense />
                </ProtectedRoute>
              }
            />

            <Route
              path="/excel-upload"
              element={
                <ProtectedRoute adminOnly>
                  <ExcelUpload />
                </ProtectedRoute>
              }
            />

            <Route
              path="/summary-page"
              element={
                <ProtectedRoute adminOnly>
                  <SummaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Notes"
              element={
                <ProtectedRoute adminOnly allowAccountant>
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
            <Route
              path="/export-data"
              element={
                <ProtectedRoute adminOnly>
                  <ExportDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/masav-broadcast"
              element={
                <ProtectedRoute adminOnly allowAccountant>
                  <MasavBroadcast />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-logs"
              element={
                <ProtectedRoute adminOnly>
                  <SystemLogs />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
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
