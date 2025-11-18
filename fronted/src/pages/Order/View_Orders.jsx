import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import {
  DownloadCloud,
  Edit2,
  Trash2,
  Filter,
  FileSpreadsheet,
  X,
  ShoppingCart,
  Sparkles,
  Search,
  ArrowUpDown,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import api from "../../api/api";
import { toast } from "sonner";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    sumMin: "",
    sumMax: "",
    projectName: "",
    invitingName: "",
    orderNumber: "",
    status: "",
    detail: "",
  });

  const [exportColumns, setExportColumns] = useState({
    orderNumber: true,
    projectName: true,
    invitingName: true,
    sum: true,
    status: true,
    createdAt: true,
    detail: false,
    formattedSum: false,
    formattedDate: false,
    daysSinceCreated: false,
  });

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString("he-IL");
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const availableColumns = [
    { key: "orderNumber", label: "מספר הזמנה" },
    { key: "projectName", label: "שם הפרויקט" },
    { key: "invitingName", label: "שם המזמין" },
    { key: "sum", label: "סכום" },
    { key: "status", label: "סטטוס" },
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "detail", label: "פירוט" },
    { key: "formattedSum", label: "סכום מעוצב" },
    { key: "formattedDate", label: "תאריך מעוצב" },
    { key: "daysSinceCreated", label: "ימים מיצירה" },
  ];

  const getFilteredOrders = () => {
    let filtered = [...allOrders];

    // חיפוש כללי
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber?.toString().includes(searchTerm) ||
          order.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.invitingName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showReportModal) {
      if (advancedFilters.dateFrom) {
        filtered = filtered.filter(
          (order) =>
            new Date(order.createdAt) >= new Date(advancedFilters.dateFrom)
        );
      }
      if (advancedFilters.dateTo) {
        filtered = filtered.filter(
          (order) =>
            new Date(order.createdAt) <= new Date(advancedFilters.dateTo)
        );
      }
      if (advancedFilters.sumMin) {
        filtered = filtered.filter(
          (order) => order.sum >= parseInt(advancedFilters.sumMin)
        );
      }
      if (advancedFilters.sumMax) {
        filtered = filtered.filter(
          (order) => order.sum <= parseInt(advancedFilters.sumMax)
        );
      }
      if (advancedFilters.projectName) {
        filtered = filtered.filter((order) =>
          order.projectName
            ?.toLowerCase()
            .includes(advancedFilters.projectName.toLowerCase())
        );
      }
      if (advancedFilters.invitingName) {
        filtered = filtered.filter((order) =>
          order.invitingName
            ?.toLowerCase()
            .includes(advancedFilters.invitingName.toLowerCase())
        );
      }
      if (advancedFilters.orderNumber) {
        filtered = filtered.filter((order) =>
          order.orderNumber?.toString().includes(advancedFilters.orderNumber)
        );
      }
      if (advancedFilters.status) {
        filtered = filtered.filter(
          (order) => order.status === advancedFilters.status
        );
      }
      if (advancedFilters.detail) {
        filtered = filtered.filter((order) =>
          order.detail
            ?.toLowerCase()
            .includes(advancedFilters.detail.toLowerCase())
        );
      }
    } else {
      if (selectedStatus) {
        filtered = filtered.filter((order) => order.status === selectedStatus);
      }
    }

    return filtered;
  };

  const calculateOrderStats = (order) => {
    const daysSinceCreated = Math.floor(
      (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24)
    );
    const formattedSum = formatNumber(order.sum) + " ₪";
    const formattedDate = formatDate(order.createdAt);
    return { daysSinceCreated, formattedSum, formattedDate };
  };

  const toggleColumn = (columnKey) => {
    setExportColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const selectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach((key) => {
      newState[key] = true;
    });
    setExportColumns(newState);
  };

  const deselectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach((key) => {
      newState[key] = false;
    });
    setExportColumns(newState);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      sumMin: "",
      sumMax: "",
      projectName: "",
      invitingName: "",
      orderNumber: "",
      status: "",
      detail: "",
    });
  };

  const exportCustomReport = () => {
    const dataToExport = getFilteredOrders();

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const selectedColumns = Object.keys(exportColumns).filter(
      (key) => exportColumns[key]
    );

    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    const ordersData = dataToExport.map((order) => {
      const stats = calculateOrderStats(order);
      const row = {};

      selectedColumns.forEach((col) => {
        switch (col) {
          case "orderNumber":
            row["מספר הזמנה"] = order.orderNumber || "";
            break;
          case "projectName":
            row["שם הפרויקט"] = order.projectName || "";
            break;
          case "invitingName":
            row["שם המזמין"] = order.invitingName || "";
            break;
          case "sum":
            row["סכום"] = order.sum || 0;
            break;
          case "status":
            row["סטטוס"] = order.status || "";
            break;
          case "createdAt":
            row["תאריך יצירה"] = formatDate(order.createdAt);
            break;
          case "detail":
            row["פירוט"] = order.detail || "";
            break;
          case "formattedSum":
            row["סכום מעוצב"] = stats.formattedSum;
            break;
          case "formattedDate":
            row["תאריך מעוצב"] = stats.formattedDate;
            break;
          case "daysSinceCreated":
            row["ימים מיצירה"] = stats.daysSinceCreated;
            break;
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(ordersData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח הזמנות");

    const fileName = `דוח_הזמנות_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${ordersData.length} הזמנות`, {
      className: "sonner-toast success rtl",
    });
  };

  const filteredOrders = searchTerm
    ? getFilteredOrders()
    : selectedStatus
    ? orders.filter((order) => order.status === selectedStatus)
    : orders;

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "sum") {
      return sortOrder === "asc" ? a.sum - b.sum : b.sum - a.sum;
    }
    if (sortBy === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  const exportToExcel = () => {
    const ordersWithHeaders = sortedOrders.map((order) => ({
      "מספר הזמנה": order.orderNumber,
      "שם הפרוייקט": order.projectName,
      "שם המזמין": order.invitingName,
      "תאריך יצירה": formatDate(order.createdAt),
      "סכום ": formatNumber(order.sum),
      סטטוס: order.status,
      פירוט: order.detail,
    }));

    const worksheet = XLSX.utils.json_to_sheet(ordersWithHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "הזמנות");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "הזמנות.xlsx"
    );
  };

  const arr = (res) =>
    Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res 
      : [];

  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedProjectId = authUser?.selectedProject;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/orders`);

        // 🔥 תקן את הטיפול בנתונים
        const ordersData = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];

        setAllOrders(ordersData);
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("שגיאה בטעינת הזמנות", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e) => e.key === "Escape" && setShowReportModal(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const handleDelete = async () => {
    if (!orderToDelete) {
      toast.error("לא נבחרה הזמנה למחיקה", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    try {
      await api.delete(`/orders/${orderToDelete}`, {
        params: { projectId: selectedProjectId },
      });

      setOrders((prev) => prev.filter((o) => o._id !== orderToDelete));
      setAllOrders((prev) => prev.filter((o) => o._id !== orderToDelete));

      setShowModal(false);

      toast.success("ההזמנה נמחקה בהצלחה", {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      toast.error("שגיאה במחיקת הזמנה", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-order/${id}`);
  };

  const handleView = (id) => {
    navigate(`/orders/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען רשימת הזמנות...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <ShoppingCart className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    רשימת הזמנות
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      ניהול וניתוח הזמנות
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חיפוש לפי מספר הזמנה, פרויקט או מזמין..."
                    className="w-full pr-12 pl-4 py-4 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Controls Bar */}
        <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
            {/* Sort & Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">מיין לפי:</span>
              </div>
              <select
                onChange={(e) => setSortBy(e.target.value)}
                value={sortBy}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="sum">סכום</option>
                <option value="createdAt">תאריך יצירה</option>
              </select>
              <select
                onChange={(e) => setSortOrder(e.target.value)}
                value={sortOrder}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="asc">עולה</option>
                <option value="desc">יורד</option>
              </select>

              <div className="flex items-center gap-2">
                <Filter className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">סינון:</span>
              </div>
              <select
                onChange={(e) => setSelectedStatus(e.target.value)}
                value={selectedStatus}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="">כל הסטטוסים</option>
                <option value="הוגש">הוגש</option>
                <option value="לא הוגש">לא הוגש</option>
                <option value="בעיבוד">בעיבוד</option>
              </select>

              {(selectedStatus || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedStatus("");
                    setSearchTerm("");
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-bold"
                >
                  נקה סינון
                </button>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>מחולל דוחות</span>
              </button>

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>ייצוא מהיר</span>
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600 font-medium">
            מציג {sortedOrders.length} הזמנות מתוך {allOrders.length}
          </div>
        </div>

        {/* Orders Table */}
        {sortedOrders.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <th className="px-6 py-4 text-sm font-bold text-white">
                      מספר הזמנה
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-white">
                      סכום
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-white">
                      סטטוס
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-white">
                      שם פרויקט
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-white">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr
                      key={order._id}
                      onClick={() => handleView(order._id)}
                      className="cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-center text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-center text-slate-900">
                        {formatNumber(order.sum)} ₪
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-center text-slate-900">
                        {order.status}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-center text-slate-900">
                        {order.projectName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(order._id);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToDelete(order._id);
                              setShowModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">
              {searchTerm || selectedStatus
                ? "לא נמצאו תוצאות"
                : "אין הזמנות להציג"}
            </h2>
          </div>
        )}

        {/* Delete Modal - keeping existing modals */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את ההזמנה לצמיתות.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                  >
                    מחק
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 z-50">
            {/* רקע + סגירה בלחיצה בחוץ */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReportModal(false)}
            />

            {/* מעטפת עם גלילה */}
            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
              {/* קופסת המודאל */}
              <div
                className="relative w-full max-w-4xl mt-20"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                {/* זוהר עדין */}
                <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-xl"></div>

                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                  {/* כותרת + כפתור סגירה */}
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold">
                          מחולל דוחות הזמנות
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        aria-label="סגור"
                        title="סגור"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-white/90 text-sm mt-2">
                      סנן את ההזמנות ובחר עמודות לייצוא
                    </p>
                  </div>

                  {/* תוכן המודאל */}
                  <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">
                    {/* Advanced Filters */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Filter className="w-5 h-5 text-orange-500" />
                          סינון מתקדם
                        </h4>
                        <button
                          onClick={clearAdvancedFilters}
                          className="text-sm font-bold text-orange-600 hover:text-orange-700"
                        >
                          איפוס מסננים
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Date From */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך מ-
                          </label>
                          <input
                            type="date"
                            value={advancedFilters.dateFrom}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                dateFrom: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Date To */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך עד-
                          </label>
                          <input
                            type="date"
                            value={advancedFilters.dateTo}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                dateTo: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Sum Min */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סכום מינימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.sumMin}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                sumMin: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מינימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Sum Max */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סכום מקסימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.sumMax}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                sumMax: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מקסימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Project Name */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            שם פרויקט
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.projectName}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                projectName: e.target.value,
                              })
                            }
                            placeholder="חפש שם פרויקט"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Inviting Name */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            שם מזמין
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.invitingName}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                invitingName: e.target.value,
                              })
                            }
                            placeholder="חפש שם מזמין"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Order Number */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            מספר הזמנה
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.orderNumber}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                orderNumber: e.target.value,
                              })
                            }
                            placeholder="לדוגמה: 40283"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סטטוס
                          </label>
                          <select
                            value={advancedFilters.status}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                status: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          >
                            <option value="">הכל</option>
                            <option value="הוגש">הוגש</option>
                            <option value="לא הוגש">לא הוגש</option>
                            <option value="בעיבוד">בעיבוד</option>
                          </select>
                        </div>

                        {/* Detail contains */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            מילת מפתח בפירוט
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.detail}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                detail: e.target.value,
                              })
                            }
                            placeholder="למשל: חציון"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                      </div>

                      {/* Filter Summary */}
                      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                        <p className="text-sm font-bold text-gray-700">
                          מסננים: {getFilteredOrders().length} הזמנות מתוך{" "}
                          {allOrders.length}
                        </p>
                      </div>
                    </div>

                    {/* Column Selection */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900">
                          בחר עמודות לייצוא
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllColumns}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <CheckSquare className="w-4 h-4" />
                            בחר הכל
                          </button>
                          <button
                            onClick={deselectAllColumns}
                            className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                          >
                            <Square className="w-4 h-4" />
                            בטל הכל
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {availableColumns.map((column) => (
                          <label
                            key={column.key}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              exportColumns[column.key]
                                ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400"
                                : "bg-gray-50 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={exportColumns[column.key]}
                              onChange={() => toggleColumn(column.key)}
                              className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                            />
                            <span
                              className={`text-sm font-medium ${
                                exportColumns[column.key]
                                  ? "text-gray-900"
                                  : "text-gray-600"
                              }`}
                            >
                              {column.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* כפתורי פעולה */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
                      >
                        ביטול
                      </button>
                      <button
                        onClick={exportCustomReport}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
                      >
                        <DownloadCloud className="w-5 h-5" />
                        ייצא דוח
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
