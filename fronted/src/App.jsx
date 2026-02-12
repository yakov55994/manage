import { useEffect } from "react";
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
import AllSubmittedInvoices from "./pages/Invoice/AllSubmittedInvoices.jsx";
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
import CreateExpense from "./pages/Expense/Create_Expense.jsx";
import ViewExpenses from "./pages/Expense/View_Expenses.jsx";
import ExpenseDetailsPage from "./pages/Expense/ExpenseDetailsPage.jsx";
import UpdateExpense from "./pages/Expense/Update_Expense.jsx";
import ExcelUpload from "./pages/ExcelUpload/ExcelUpload.jsx";
import NoAccess from "./pages/NoAccess.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ExportDataPage from "./pages/ExportDataPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Toaster } from "sonner";
import { toast } from "sonner";
import "./App.css";

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
                <ProtectedRoute adminOnly>
                  <ViewIncomes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes/:id"
              element={
                <ProtectedRoute adminOnly>
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
                <ProtectedRoute adminOnly>
                  <ViewExpenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/:id"
              element={
                <ProtectedRoute adminOnly>
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
            <Route
              path="/export-data"
              element={
                <ProtectedRoute adminOnly>
                  <ExportDataPage />
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
