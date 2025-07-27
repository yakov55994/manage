import React, { useEffect, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DownloadCloud } from 'lucide-react';
import api from '../api/api.jsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SummaryPage = () => {
  const [projects, setProjects] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]); // ✅ הוסף state לספקים
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sortBy, setSortBy] = useState('name');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ הוסף קריאה לספקים
        const [projectResponse, orderResponse, invoiceResponse, suppliersResponse] = await Promise.all([
          api.get('/projects'),
          api.get('/orders'),
          api.get('/invoices'),
          api.get('/suppliers/getAllSuppliers') // ✅ קריאה לספקים
        ]);
        
        setProjects(projectResponse.data);
        setOrders(orderResponse.data);
        setInvoices(invoiceResponse.data);
        
        // ✅ טיפול בתגובת הספקים
        if (suppliersResponse.data && suppliersResponse.data.success && Array.isArray(suppliersResponse.data.data)) {
          setSuppliers(suppliersResponse.data.data);
        } else {
          setSuppliers([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatNumber = (num) => num?.toLocaleString('he-IL');
  
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString("he-IL", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }) : "תאריך לא זמין";

  const sortData = (data, key, order) => {
    return [...data].sort((a, b) => {
      if (!a[key] || !b[key]) return 0;
      if (typeof a[key] === 'string') {
        return order === 'desc' ? b[key].localeCompare(a[key]) : a[key].localeCompare(b[key]);
      }
      return order === 'desc' ? b[key] - a[key] : a[key] - b[key];
    });
  };

  const sortedProjects = sortData(projects, sortBy === 'budget' ? 'budget' : 'name', sortOrder);
  const sortedOrders = sortData(orders.filter(o => !statusFilter || o.status === statusFilter), sortBy === 'budget' ? 'sum' : 'projectName', sortOrder);
  const sortedInvoices = sortData(invoices.filter(i => !statusFilter || i.status === statusFilter), sortBy === 'budget' ? 'sum' : 'projectName', sortOrder);
  // ✅ הוסף מיון לספקים
  const sortedSuppliers = sortData(suppliers, sortBy === 'budget' ? 'business_tax' : 'name', sortOrder);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const createSheet = (data, sheetName) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    createSheet(sortedProjects.map(p => ({
      "שם פרויקט": p.name, 
      "תקציב": p.budget, 
      "תקציב שנותר": p.remainingBudget, 
      "שם המזמין": p.invitingName, 
      "תאריך": formatDate(p.createdAt)
    })), "פרויקטים");
    
    createSheet(sortedOrders.map(o => ({
      "מספר הזמנה": o.orderNumber, 
      "פרויקט": o.projectName, 
      "סכום": o.sum, 
      "שם המזמין": o.invitingName, 
      "תאריך": formatDate(o.createdAt), 
      "סטטוס": o.status, 
      "פירוט": o.detail
    })), "הזמנות");
    
    createSheet(sortedInvoices.map(i => ({
      "מספר חשבונית": i.invoiceNumber, 
      "פרויקט": i.projectName, 
      "סכום": i.sum, 
      "שם המזמין": i.invitingName, 
      "תאריך": formatDate(i.createdAt), 
      "סטטוס": i.status, 
      "פירוט": i.detail
    })), "חשבוניות");
    
    // ✅ הוסף גיליון ספקים
    createSheet(sortedSuppliers.map(s => ({
      "שם הספק": s.name,
      "מספר עוסק": s.business_tax,
      "כתובת": s.address,
      "טלפון": s.phone,
      "אימייל": s.email,
      "שם הבנק": s.bankDetails?.bankName || '',
      "מספר סניף": s.bankDetails?.branchNumber || '',
      "מספר חשבון": s.bankDetails?.accountNumber || '',
      "תאריך יצירה": formatDate(s.createdAt)
    })), "ספקים");
    
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), "סיכום כללי.xlsx");
  };

  const moveToProjectDetails = (project) => {
    navigate(`/project/${project._id}`);
  };

  const moveToInvoiceDetails = (invoice) => {
    navigate(`/invoice/${invoice._id}`);
  };

  const moveToOrderDetails = (order) => {
    navigate(`/orders/${order._id}`);
  };

  // ✅ הוסף פונקציה לספקים
  const moveToSupplierDetails = (supplier) => {
    navigate(`/supplier/${supplier._id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען נתונים...</h1>
      </div>
    );
  }

  const formatCurrency = (num) => {
    return (
      <span dir="ltr">
        {num < 0 ? `₪ - ${Math.abs(num).toLocaleString('he-IL')}` : `₪ ${num.toLocaleString('he-IL')}`}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b py-8">
      <div className="container mx-auto px-4">
        <div className="bg-slate-100 rounded-lg shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800">סיכום כללי</h1>
              <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 mx-auto"></div>
            </div>
          </div>

          <div className="p-6">
            {/* ✅ הוסף נתונים סטטיסטיים */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-100 p-4 rounded-lg text-center">
                <h3 className="text-lg font-bold text-blue-800">פרויקטים</h3>
                <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <h3 className="text-lg font-bold text-green-800">הזמנות</h3>
                <p className="text-2xl font-bold text-green-600">{orders.length}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center">
                <h3 className="text-lg font-bold text-yellow-800">חשבוניות</h3>
                <p className="text-2xl font-bold text-yellow-600">{invoices.length}</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg text-center">
                <h3 className="text-lg font-bold text-purple-800">ספקים</h3>
                <p className="text-2xl font-bold text-purple-600">{suppliers.length}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="flex flex-wrap items-end gap-4">
                <select
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="" className="font-bold">כל הסטטוסים</option>
                  <option value="הוגש" className="font-bold">הוגש</option>
                  <option value="בעיבוד" className="font-bold">בעיבוד</option>
                  <option value="לא הוגש" className="font-bold">לא הוגש</option>
                </select>
                <select
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="name" className="font-bold">מיין לפי שם</option>
                  <option value="budget" className="font-bold">מיין לפי תקציב/סכום</option>
                </select>
                <select
                  onChange={(e) => setSortOrder(e.target.value)}
                  value={sortOrder}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="desc" className="font-bold">יורד</option>
                  <option value="asc" className="font-bold">עולה</option>
                </select>
              </div>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium"
              >
                <DownloadCloud size={20} />
                <span>ייצוא הכל לאקסל</span>
              </button>
            </div>

            {/* Projects Table */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">פרויקטים</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-xl">
                      <th className="px-6 py-4 text-right">שם פרויקט</th>
                      <th className="px-6 py-4 text-right">תקציב</th>
                      <th className="px-6 py-4 text-right">תקציב שנותר</th>
                      <th className="px-6 py-4 text-right">שם המזמין</th>
                      <th className="px-6 py-4 text-right">נוצר בתאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.length > 0 ? (
                      sortedProjects.map((project) => (
                        <tr
                          key={project._id}
                          onClick={() => moveToProjectDetails(project)}
                          className="cursor-pointer text-lg border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                        >
                          <td className="px-6 py-4 font-bold">{project.name}</td>
                          <td className="px-6 py-4 font-bold">{project.budget ? formatCurrency(project.budget) : <span className="text-green-800">אין עדיין תקציב</span>}</td>
                          <td className="px-6 py-4 font-bold">{project.remainingBudget ? formatCurrency(project.remainingBudget) : <span className="text-green-800">אין עדיין תקציב</span>}</td>
                          <td className="px-6 py-4 font-bold">{project.invitingName}</td>
                          <td className="px-6 py-4 font-bold">{formatDate(project.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center font-bold text-xl text-red-500 py-4">לא נמצאו פרוייקטים</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Orders Table */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">הזמנות</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-xl">
                      <th className="px-6 py-4 text-right">מספר הזמנה</th>
                      <th className="px-6 py-4 text-right">פרויקט</th>
                      <th className="px-6 py-4 text-right">סכום</th>
                      <th className="px-6 py-4 text-right">שם המזמין</th>
                      <th className="px-6 py-4 text-right">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.length > 0 ? (
                      sortedOrders.map((order) => (
                        <tr
                          key={order._id}
                          onClick={() => moveToOrderDetails(order)}
                          className="cursor-pointer text-lg border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                        >
                          <td className="px-6 py-4 font-bold">{order.orderNumber}</td>
                          <td className="px-6 py-4 font-bold">{order.projectName}</td>
                          <td className="px-6 py-4 font-bold">{formatCurrency(order.sum)}</td>
                          <td className="px-6 py-4 font-bold">{order.invitingName}</td>
                          <td className="px-6 py-4 font-bold">{order.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center font-bold text-xl text-red-500 py-4">לא נמצאו הזמנות</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">חשבוניות</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-xl">
                      <th className="px-6 py-4 text-right">מספר חשבונית</th>
                      <th className="px-6 py-4 text-right">פרויקט</th>
                      <th className="px-6 py-4 text-right">סכום</th>
                      <th className="px-6 py-4 text-right">שם המזמין</th>
                      <th className="px-6 py-4 text-right">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInvoices.length > 0 ? (
                      sortedInvoices.map((invoice) => (
                        <tr
                          key={invoice._id}
                          onClick={() => moveToInvoiceDetails(invoice)}
                          className="cursor-pointer text-lg border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                        >
                          <td className="px-6 py-4 font-bold text-center">{invoice.invoiceNumber}</td>
                          <td className="px-6 py-4 font-bold">{invoice.projectName}</td>
                          <td className="px-6 py-4 font-bold">{formatCurrency(invoice.sum)}</td>
                          <td className="px-6 py-4 font-bold">{invoice.invitingName}</td>
                          <td className="px-6 py-4 font-bold text-center">{invoice.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center font-bold text-xl text-red-500 py-4">לא נמצאו חשבוניות</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ✅ Suppliers Table - הוסף טבלת ספקים */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">ספקים</h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-xl">
                      <th className="px-6 py-4 text-right">שם הספק</th>
                      <th className="px-6 py-4 text-right">מספר עוסק</th>
                      <th className="px-6 py-4 text-right">טלפון</th>
                      <th className="px-6 py-4 text-right">אימייל</th>
                      <th className="px-6 py-4 text-right">שם בנק</th>
                      <th className="px-6 py-4 text-right">תאריך יצירה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSuppliers.length > 0 ? (
                      sortedSuppliers.map((supplier) => (
                        <tr
                          key={supplier._id}
                          onClick={() => moveToSupplierDetails(supplier)}
                          className="cursor-pointer text-lg border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                        >
                          <td className="px-6 py-4 font-bold">{supplier.name}</td>
                          <td className="px-6 py-4 font-bold">{formatNumber(supplier.business_tax)}</td>
                          <td className="px-6 py-4 font-bold">{supplier.phone}</td>
                          <td className="px-6 py-4 font-bold">{supplier.email || 'לא זמין'}</td>
                          <td className="px-6 py-4 font-bold">{supplier.bankDetails?.bankName || 'לא זמין'}</td>
                          <td className="px-6 py-4 font-bold">{formatDate(supplier.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center font-bold text-xl text-red-500 py-4">לא נמצאו ספקים</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;