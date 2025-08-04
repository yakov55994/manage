import  { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './pages/NavBar';
import CreateProject from './pages/Project/Create_Project';
import CreateInvoice from './pages/Invoice/Create_Invoice';
import CreateOrder from './pages/Order/Create_Order.jsx';
import Projects from './pages/Project/View_Projects';
import Invoices from './pages/Invoice/View_Invoices';
import Orders from './pages/Order/View_Orders';
import ProjectDetailsPage from './pages/Project/ProjectDetailsPage';
import InvoiceDetailsPage from './pages/Invoice/InvoiceDetailsPage';
import Order_Detail_Page from './pages/Order/Orders_Details_Page.jsx';
import UpdateProject from './pages/Project/UpdateProject.jsx';
import UpdateInvoice from './pages/Invoice/UpdateInvoice.jsx';
import UpdateOrder from './pages/Order/Update_Orders.jsx';
import SearchResults from './pages/Search/SearchResults.jsx';
import Home from './pages/Home.jsx';
import SummaryPage from './pages/Summary_Page.jsx';
import Notes from './pages/Notes.jsx';
import Login from './Auth/Login.jsx';
import ProtectedRoute from './Components/ProtectedRoute.jsx';
import './App.css';
import { Toaster } from 'sonner';
import { ArrowRightCircle, KeyRound } from 'lucide-react';
import api from './api/api.jsx'; // האינסטנס של axios עם withCredentials
import { toast } from 'sonner';
import CreateSupplier from './pages/Supplier/create_supplier.jsx';
import SuppliersPage from './pages/Supplier/Supplier_view.jsx';
import SupplierDetailsPage from './pages/Supplier/Supplier_details.jsx';
import SupplierEditPage from './pages/Supplier/Supplier_update.jsx';

// קומפוננט פנימי שמשתמש ב-hooks
const AppContent = () => {
  const [isLogin, setIsLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // useEffect שמוודא אם המשתמש מחובר
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get('/auth-status');
        if (response.data.authenticated) {
          setIsLogin(true);
        } else {
          setIsLogin(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLogin(false);
      }
    };

    checkAuthStatus();
  }, [location]);

  // פונקציה להתנתקות – שולחת קריאה לשרת למחיקת הקוקי
  const handleLogout = async () => {
    try {
      await api.post('/logout');
      setIsLogin(false);
      toast.success("ההתנתקות בוצעה בהצלחה, להתראות 👋", {
        duration: 5000, // 5 שניות
        className: "sonner-toast success rtl"
      });
      localStorage.removeItem("auth_token");
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message);
      toast.error("שגיאה בהתנתקות");
    }
  };

  return (
    <>
      <div className="flex ">
        <Sidebar />
        <div className="flex-1 p-6  ">
          {/* מציג כפתור התחברות או התנתקות */}
          <div className="flex items-center justify-center gap-4 mb-14">
  <h1 className="text-xl font-bold">✨ סטטוס מצב חיבור: </h1>
  <b className={`text-lg border-b-4 px-1 
    ${isLogin ? 'text-green-800 border-green-500' : 'text-red-700 border-red-800'} 
    inline-block w-fit`}>
    {isLogin ? 'מחובר/ת' : 'מנותק/ת'}
  </b>
  
  <button
    className={`flex items-center gap-3 rounded-2xl 
    ${isLogin ? 'mr-2 bg-red-500 text-white ' : 'bg-slate-500 text-yellow-300 '} 
    p-3 w-36 font-bold `}
    onClick={isLogin ? handleLogout : () => navigate('/login')}
  >
    {isLogin ? <ArrowRightCircle /> : <KeyRound />}
    <p>{isLogin ? 'התנתק' : 'התחברות'}</p>
  </button>
</div>



          <Routes>
            <Route path="*" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<SearchResults />} />

            {/* נתיבים מוגנים */}
            <Route path="/create-project" element={
              <ProtectedRoute>
                <CreateProject />
              </ProtectedRoute>
            }/>
            <Route path="/create-invoice" element={
              <ProtectedRoute>
                <CreateInvoice />
              </ProtectedRoute>
            }/>
            <Route path="/create-order" element={
              <ProtectedRoute>
                <CreateOrder />
              </ProtectedRoute>
            }/>
            <Route path="/projects" element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }/>
            <Route path="/invoices" element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            }/>
            <Route path="/orders" element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }/>
            <Route path="/project/:id" element={
              <ProtectedRoute>
                <ProjectDetailsPage />
              </ProtectedRoute>
            }/>
            <Route path="/invoice/:id" element={
              <ProtectedRoute>
                <InvoiceDetailsPage />
              </ProtectedRoute>
            }/>
            <Route path="/order/:id" element={
              <ProtectedRoute>
                <Order_Detail_Page />
              </ProtectedRoute>
            }/>
            <Route path="/update-project/:id" element={
              <ProtectedRoute>
                <UpdateProject />
              </ProtectedRoute>
            }/>
            <Route path="/update-invoice/:id" element={
              <ProtectedRoute>
                <UpdateInvoice />
              </ProtectedRoute>
            }/>
            <Route path="/update-order/:id" element={
              <ProtectedRoute>
                <UpdateOrder />
              </ProtectedRoute>
            }/>
            <Route path="/summary-page" element={
              <ProtectedRoute>
                <SummaryPage />
              </ProtectedRoute>
            }/>
            <Route path="/Notes" element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }/>

            <Route path="/create-supplier" element={
              <ProtectedRoute> 
                   <CreateSupplier />
                </ProtectedRoute>
                  } />

<Route path="/suppliers" element={
  <ProtectedRoute>
    <SuppliersPage />
  </ProtectedRoute>
  } />
  
<Route path="/supplier/:id" element={
  <ProtectedRoute>

    <SupplierDetailsPage />
  </ProtectedRoute>
  } />
<Route path="/update-supplier/:id" element={
  <ProtectedRoute>

    <SupplierEditPage />
  </ProtectedRoute>
  } />


          </Routes>
        </div>
      </div>
      <p className='text-center font-bold text-slate-600 mr-80'>© כל הזכויות שמורות ליעקב כהן</p>
      <Toaster />
    </>
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