import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  DownloadCloud,
  FolderKanban,
  ShoppingCart,
  FileText,
  Users,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
} from "lucide-react";
import api from "../api/api.js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SummaryPage = () => {
  const [projects, setProjects] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [sortBy, setSortBy] = useState("name");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, ordersRes, invoicesRes, suppliersRes] =
          await Promise.all([
            api.get("/projects"),
            api.get("/orders"),
            api.get("/invoices"),
            api.get("/suppliers"),
          ]);

        // פרויקטים — החלק הקריטי!!!
        const projectsArr = Array.isArray(projectsRes.data?.data)
          ? projectsRes.data.data
          : Array.isArray(projectsRes.data)
          ? projectsRes.data
          : [];

        setProjects(projectsArr);

        // הזמנות
        const ordersArr = Array.isArray(ordersRes.data?.data)
          ? ordersRes.data.data
          : ordersRes.data;
        setOrders(ordersArr);

        // חשבוניות
        const invoicesArr = Array.isArray(invoicesRes.data?.data)
          ? invoicesRes.data.data
          : invoicesRes.data;
        setInvoices(invoicesArr);

        // ספקים
        setSuppliers(
          suppliersRes.data?.success && Array.isArray(suppliersRes.data?.data)
            ? suppliersRes.data.data
            : []
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("שגיאה בטעינת הנתונים", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatNumber = (num) => num?.toLocaleString("he-IL");

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "תאריך לא זמין";

  const sortData = (data, key, order) => {
    return [...data].sort((a, b) => {
      if (!a[key] || !b[key]) return 0;
      if (typeof a[key] === "string") {
        return order === "desc"
          ? b[key].localeCompare(a[key])
          : a[key].localeCompare(b[key]);
      }
      return order === "desc" ? b[key] - a[key] : a[key] - b[key];
    });
  };

  const sortedProjects = sortData(
    projects,
    sortBy === "budget" ? "budget" : "name",
    sortOrder
  );
  const sortedOrders = sortData(
    orders.filter((o) => !statusFilter || o.status === statusFilter),
    sortBy === "budget" ? "sum" : "projectName",
    sortOrder
  );
  const sortedInvoices = sortData(
    invoices.filter((i) => !statusFilter || i.status === statusFilter),
    sortBy === "budget" ? "sum" : "projectName",
    sortOrder
  );
  const sortedSuppliers = sortData(
    suppliers,
    sortBy === "budget" ? "business_tax" : "name",
    sortOrder
  );

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const createSheet = (data, sheetName) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    createSheet(
      sortedProjects.map((p) => ({
        "שם פרויקט": p.name,
        תקציב: p.budget,
        "תקציב שנותר": p.remainingBudget,
        "שם המזמין": p.invitingName,
        תאריך: formatDate(p.createdAt),
      })),
      "פרויקטים"
    );

    createSheet(
      sortedOrders.map((o) => ({
        "מספר הזמנה": o.orderNumber,
        פרויקט: o.projectName,
        סכום: o.sum,
        "שם המזמין": o.invitingName,
        תאריך: formatDate(o.createdAt),
        סטטוס: o.status,
        פירוט: o.detail,
      })),
      "הזמנות"
    );

    createSheet(
      sortedInvoices.map((i) => ({
        "מספר חשבונית": i.invoiceNumber,
        פרויקט: i.projectName,
        סכום: i.sum,
        "שם המזמין": i.invitingName,
        תאריך: formatDate(i.createdAt),
        סטטוס: i.status,
        פירוט: i.detail,
      })),
      "חשבוניות"
    );

    createSheet(
      sortedSuppliers.map((s) => ({
        "שם הספק": s.name,
        "מספר עוסק": s.business_tax,
        כתובת: s.address,
        טלפון: s.phone,
        אימייל: s.email,
        "שם הבנק": s.bankDetails?.bankName || "",
        "מספר סניף": s.bankDetails?.branchNumber || "",
        "מספר חשבון": s.bankDetails?.accountNumber || "",
        "תאריך יצירה": formatDate(s.createdAt),
      })),
      "ספקים"
    );

    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
        type: "application/octet-stream",
      }),
      "סיכום כללי.xlsx"
    );

    toast.success("הקובץ יוצא בהצלחה!", {
      className: "sonner-toast success rtl",
    });
  };

  const moveToProjectDetails = (project) =>
    navigate(`/projects/${project._id}`);
  const moveToInvoiceDetails = (invoice) =>
    navigate(`/invoices/${invoice._id}`);
  const moveToOrderDetails = (order) => navigate(`/orders/${order._id}`);
  const moveToSupplierDetails = (supplier) =>
    navigate(`/suppliers/${supplier._id}`);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full"></div>
          <ClipLoader size={80} color="#fb923c" loading={loading} />
        </div>
        <h1 className="mt-6 font-bold text-2xl text-orange-800">
          טוען נתונים...
        </h1>
      </div>
    );
  }

  const formatCurrency = (num) => {
    return (
      <span dir="ltr" className={num < 0 ? "text-red-600" : "text-green-600"}>
        {typeof num === "number"
          ? num < 0
            ? `₪ - ${Math.abs(num).toLocaleString("he-IL")}`
            : `₪ ${num.toLocaleString("he-IL")}`
          : "₪ 0"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 mb-8 border border-orange-100">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-orange-400 to-amber-400 p-3 rounded-xl shadow-lg">
              <BarChart3 className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
            </div>
            <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-bold text-gray-900">סיכום כללי</h1>
          </div>
          <div className="h-1 w-32 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full mx-auto"></div>
        </div>

        {/* כרטיסים סטטיסטיים */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 sm:p-5 md:p-6 mb-8">
          {/* פרויקטים */}
          <div
            onClick={() => navigate("/projects")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 md:p-6 cursor-pointer border-2 border-transparent hover:border-orange-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-orange-400 to-amber-400 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <FolderKanban className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
              </div>
              <Eye className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">פרויקטים</h3>
            <p className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              {projects.length}
            </p>
          </div>

          {/* הזמנות */}
          <div
            onClick={() => navigate("/orders")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 md:p-6 cursor-pointer border-2 border-transparent hover:border-orange-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-orange-400 to-amber-400 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <ShoppingCart className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
              </div>
              <Eye className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">הזמנות</h3>
            <p className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              {orders.length}
            </p>
          </div>

          {/* חשבוניות */}
          <div
            onClick={() => navigate("/invoices")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 md:p-6 cursor-pointer border-2 border-transparent hover:border-orange-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-orange-400 to-amber-400 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <FileText className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
              </div>
              <Eye className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">חשבוניות</h3>
            <p className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              {invoices.length}
            </p>
          </div>

          {/* ספקים */}
          <div
            onClick={() => navigate("/suppliers")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 md:p-6 cursor-pointer border-2 border-transparent hover:border-orange-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-orange-400 to-amber-400 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <Users className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
              </div>
              <Eye className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">ספקים</h3>
            <p className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              {suppliers.length}
            </p>
          </div>
        </div>

        {/* סרגל כלים */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 mb-8 border border-orange-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 sm:p-5 md:p-6">
            {/* פילטרים ומיונים */}
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Filter className="w-4 h-4 text-orange-500" />
                  סטטוס
                </label>
                <select
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all font-medium cursor-pointer min-w-[150px]"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="הוגש">הוגש</option>
                  <option value="בעיבוד">בעיבוד</option>
                  <option value="לא הוגש">לא הוגש</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  מיין לפי
                </label>
                <select
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all font-medium cursor-pointer min-w-[180px]"
                >
                  <option value="name">שם</option>
                  <option value="budget">תקציב/סכום</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  {sortOrder === "desc" ? (
                    <TrendingDown className="w-4 h-4 text-orange-500" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  )}
                  סדר
                </label>
                <select
                  onChange={(e) => setSortOrder(e.target.value)}
                  value={sortOrder}
                  className="px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all font-medium cursor-pointer min-w-[120px]"
                >
                  <option value="desc">יורד</option>
                  <option value="asc">עולה</option>
                </select>
              </div>
            </div>

            {/* כפתור ייצוא */}
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300 shadow-lg hover:shadow-xl font-medium w-full lg:w-auto"
            >
              <DownloadCloud className="w-5 h-5" />
              <span>ייצוא הכל לאקסל</span>
            </button>
          </div>
        </div>

        {/* טבלת פרויקטים */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-orange-100">
          <div className="bg-gradient-to-r from-orange-300 to-amber-300 p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <FolderKanban className="text-white w-7 h-7" />
              <h2 className="text-2xl font-bold text-white">פרויקטים</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-900">
                  <th className="px-6 py-4 text-right font-bold">שם פרויקט</th>
                  <th className="px-6 py-4 text-right font-bold">תקציב</th>
                  <th className="px-6 py-4 text-right font-bold">
                    תקציב שנותר
                  </th>
                  <th className="px-6 py-4 text-right font-bold">שם המזמין</th>
                  <th className="px-6 py-4 text-right font-bold">
                    תאריך יצירה
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.length > 0 ? (
                  sortedProjects.map((project, index) => (
                    <tr
                      key={project._id}
                      onClick={() => moveToProjectDetails(project)}
                      className={`cursor-pointer border-b border-gray-200 transition-all duration-200 ${
                        index % 2 === 0
                          ? "bg-gradient-to-r from-orange-50/30 to-amber-50/30 hover:from-orange-100 hover:to-amber-100"
                          : "bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50"
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {project.name}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {project.budget ? (
                          formatCurrency(project.budget)
                        ) : (
                          <span className="text-gray-500 italic">
                            אין תקציב
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {project.remainingBudget ? (
                          formatCurrency(project.remainingBudget)
                        ) : (
                          <span className="text-gray-500 italic">
                            אין תקציב
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {project.invitingName}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {formatDate(project.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center font-bold text-lg text-red-500 py-8"
                    >
                      לא נמצאו פרויקטים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* טבלת הזמנות */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-orange-100">
          <div className="bg-gradient-to-r from-orange-300 to-amber-300 p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="text-white w-7 h-7" />
              <h2 className="text-2xl font-bold text-white">הזמנות</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-900">
                  <th className="px-6 py-4 text-right font-bold">מספר הזמנה</th>
                  <th className="px-6 py-4 text-right font-bold">פרויקט</th>
                  <th className="px-6 py-4 text-right font-bold">סכום</th>
                  <th className="px-6 py-4 text-right font-bold">שם המזמין</th>
                  <th className="px-6 py-4 text-right font-bold">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.length > 0 ? (
                  sortedOrders.map((order, index) => (
                    <tr
                      key={order._id}
                      onClick={() => moveToOrderDetails(order)}
                      className={`cursor-pointer border-b border-gray-200 transition-all duration-200 ${
                        index % 2 === 0
                          ? "bg-gradient-to-r from-orange-50/30 to-amber-50/30 hover:from-orange-100 hover:to-amber-100"
                          : "bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50"
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {order.projectName}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(order.sum)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {order.invitingName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === "הוגש"
                              ? "bg-green-100 text-green-700"
                              : order.status === "בעיבוד"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center font-bold text-lg text-red-500 py-8"
                    >
                      לא נמצאו הזמנות
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* טבלת חשבוניות */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-orange-100">
          <div className="bg-gradient-to-r from-orange-300 to-amber-300 p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <FileText className="text-white w-7 h-7" />
              <h2 className="text-2xl font-bold text-white">חשבוניות</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-900">
                  <th className="px-6 py-4 text-right font-bold">
                    מספר חשבונית
                  </th>
                  <th className="px-6 py-4 text-right font-bold">פרויקט</th>
                  <th className="px-6 py-4 text-right font-bold">סכום</th>
                  <th className="px-6 py-4 text-right font-bold">שם המזמין</th>
                  <th className="px-6 py-4 text-right font-bold">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.length > 0 ? (
                  sortedInvoices.map((invoice, index) => (
                    <tr
                      key={invoice._id}
                      onClick={() => moveToInvoiceDetails(invoice)}
                      className={`cursor-pointer border-b border-gray-200 transition-all duration-200 ${
                        index % 2 === 0
                          ? "bg-gradient-to-r from-orange-50/30 to-amber-50/30 hover:from-orange-100 hover:to-amber-100"
                          : "bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50"
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {invoice.projectName}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {invoice.invitingName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            invoice.status === "הוגש"
                              ? "bg-green-100 text-green-700"
                              : invoice.status === "בעיבוד"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center font-bold text-lg text-red-500 py-8"
                    >
                      לא נמצאו חשבוניות
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* טבלת ספקים */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-orange-100">
          <div className="bg-gradient-to-r from-orange-300 to-amber-300 p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <Users className="text-white w-7 h-7" />
              <h2 className="text-2xl font-bold text-white">ספקים</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-900">
                  <th className="px-6 py-4 text-right font-bold">שם הספק</th>
                  <th className="px-6 py-4 text-right font-bold">מספר עוסק</th>
                  <th className="px-6 py-4 text-right font-bold">טלפון</th>
                  <th className="px-6 py-4 text-right font-bold">אימייל</th>
                  <th className="px-6 py-4 text-right font-bold">שם בנק</th>
                  <th className="px-6 py-4 text-right font-bold">
                    תאריך יצירה
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.length > 0 ? (
                  sortedSuppliers.map((supplier, index) => (
                    <tr
                      key={supplier._id}
                      onClick={() => moveToSupplierDetails(supplier)}
                      className={`cursor-pointer border-b border-gray-200 transition-all duration-200 ${
                        index % 2 === 0
                          ? "bg-gradient-to-r from-orange-50/30 to-amber-50/30 hover:from-orange-100 hover:to-amber-100"
                          : "bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50"
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {supplier.name}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {formatNumber(supplier.business_tax)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {supplier.phone}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {supplier.email ? (
                          <span className="text-orange-600">
                            {supplier.email}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">לא זמין</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {supplier.bankDetails?.bankName ? (
                          <span className="text-orange-600">
                            {supplier.bankDetails.bankName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">לא זמין</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {formatDate(supplier.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center font-bold text-lg text-red-500 py-8"
                    >
                      לא נמצאו ספקים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
