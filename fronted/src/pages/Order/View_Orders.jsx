import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Link, useNavigate } from "react-router-dom";
import { DownloadCloud, Edit2, Trash2, Filter } from "lucide-react"; // Importing icons
import api from "../../api/api";
import { toast } from "sonner";
import { FileSpreadsheet, X } from "lucide-react"; // הוסף את האייקונים החדשים

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");  // הוספת משתנה מצב עבור הסטטוס
const [allOrders, setAllOrders] = useState([]); // רשימה מלאה של הזמנות
const [showReportModal, setShowReportModal] = useState(false); // מצב מחולל הדוחות

// פילטרים מתקדמים
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

// עמודות לייצוא
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
// רשימת עמודות זמינות
const availableColumns = [
  { key: 'orderNumber', label: 'מספר הזמנה', selected: exportColumns.orderNumber },
  { key: 'projectName', label: 'שם הפרויקט', selected: exportColumns.projectName },
  { key: 'invitingName', label: 'שם המזמין', selected: exportColumns.invitingName },
  { key: 'sum', label: 'סכום', selected: exportColumns.sum },
  { key: 'status', label: 'סטטוס', selected: exportColumns.status },
  { key: 'createdAt', label: 'תאריך יצירה', selected: exportColumns.createdAt },
  { key: 'detail', label: 'פירוט', selected: exportColumns.detail },
  { key: 'formattedSum', label: 'סכום מעוצב', selected: exportColumns.formattedSum },
  { key: 'formattedDate', label: 'תאריך מעוצב', selected: exportColumns.formattedDate },
  { key: 'daysSinceCreated', label: 'ימים מיצירה', selected: exportColumns.daysSinceCreated },
];

// קבלת סטטוסים ייחודיים
const uniqueStatuses = [...new Set(allOrders.map(order => order.status))].filter(Boolean);

// פילטור הזמנות עם פילטרים מתקדמים
const getFilteredOrders = () => {
  let filtered = [...allOrders];

  if (showReportModal) {
    // כל הפילטרים המתקדמים כאן...
  } else {
    if (selectedStatus) {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }
  }
  return filtered;
};

// חישוב נתונים נוספים להזמנה
const calculateOrderStats = (order) => {
  const daysSinceCreated = Math.floor((new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24));
  const formattedSum = formatNumber(order.sum) + ' ₪';
  const formattedDate = formatDate(order.createdAt);
  return { daysSinceCreated, formattedSum, formattedDate };
};

// פונקציות ניהול עמודות
const toggleColumn = (columnKey) => {
  setExportColumns(prev => ({...prev, [columnKey]: !prev[columnKey]}));
};

const selectAllColumns = () => {
  const newState = {};
  Object.keys(exportColumns).forEach(key => { newState[key] = true; });
  setExportColumns(newState);
};

const deselectAllColumns = () => {
  const newState = {};
  Object.keys(exportColumns).forEach(key => { newState[key] = false; });
  setExportColumns(newState);
};

const clearAdvancedFilters = () => {
  setAdvancedFilters({
    dateFrom: "", dateTo: "", sumMin: "", sumMax: "",
    projectName: "", invitingName: "", orderNumber: "", status: "", detail: "",
  });
};

// ייצוא מותאם אישית
const exportCustomReport = () => {
  // כל הלוגיקה של הייצוא המתקדם...
};


  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString('he-IL');
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // סינון ההזמנות לפי סטטוס (אם נבחר)
  const filteredOrders = selectedStatus
    ? orders.filter(order => order.status === selectedStatus)
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
      "סטטוס": order.status,
      "פירוט": order.detail,
    }));

    const worksheet = XLSX.utils.json_to_sheet(ordersWithHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "הזמנות");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "הזמנות.xlsx");
  };

useEffect(() => {
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders`);
      setOrders(response.data);
      setAllOrders(response.data); // 👈 הוסף את זה!
      setLoading(false);
    } catch (error) {
      // error handling...
    }
  };
  fetchOrders();
}, []);

  const handleDelete = async () => {
    if (!orderToDelete) {
      toast.error("לא נבחרה הזמנה למחיקה או שה-ID לא תקין", { className: "sonner-toast error rtl" });
      return;
    }

    try {
      await api.delete(`/orders/${orderToDelete}`);
      setOrders((prevOrders) => prevOrders.filter(order => order._id !== orderToDelete));
      setShowModal(false);
      toast.success("ההזמנה נמחקה בהצלחה", { className: "sonner-toast success rtl" });
    } catch (error) {
      toast.error("שגיאה במחיקת הזמנה", { className: "sonner-toast error rtl" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-order/${id}`);
  };
  const handleView = (id) => {
    navigate(`/order/${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען רשימת הזמנות . . .</h1>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b py-8">
      <div className="container mx-auto px-4">
        <div className="bg-slate-100 rounded-lg shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800">רשימת הזמנות</h1>
              <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 mx-auto"></div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                <div className="flex items-center">
                    <label className="mr-1 font-bold text-l">מיין לפי:</label>
                  </div>
                  <select
                    onChange={(e) => setSortBy(e.target.value)}
                    value={sortBy}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 ml-3"
                  >
                    <option value="sum" className="font-bold">סכום</option>
                    <option value="createdAt" className="font-bold">תאריך יצירה</option>
                  </select>
                  <select
                    onChange={(e) => setSortOrder(e.target.value)}
                    value={sortOrder}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="asc" className="font-bold">עולה</option>
                    <option value="desc" className="font-bold">יורד</option>
                  </select>
                </div>

                {/* הוספת פילטר סטטוס */}
                <div className="flex items-center">
                    <Filter size={18} className="text-slate-600 mr-2" />
                    <label className="mr-1 font-bold text-l">סינון:</label>
                  </div>
                <select
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  value={selectedStatus}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="" className="font-bold">בחר סטטוס</option>
                  <option value="הוגש" className="font-bold">הוגש</option>
                  <option value="לא הוגש" className="font-bold">לא הוגש</option>
                  <option value="בעיבוד" className="font-bold">בעיבוד</option>
                  {/* הוסף כאן את שאר האפשרויות לסטטוס */}
                </select>
              </div>

<div className="flex gap-4">
  <button
    onClick={() => setShowReportModal(true)} // 👈 כפתור חדש!
    className="flex items-center gap-2 bg-slate-300 text-black px-6 py-2.5 rounded-3xl hover:bg-slate-900 hover:text-white transition-colors duration-200 font-medium"
  >
    <FileSpreadsheet size={20} />
    <span>מחולל דוחות</span>
  </button>

  <button
    onClick={exportToExcel}
    className="flex items-center gap-2 bg-slate-300 text-black px-6 py-2.5 rounded-3xl hover:bg-slate-900 hover:text-white transition-colors duration-200 font-medium"
  >
    <DownloadCloud size={20} />
    <span>ייצוא מהיר</span> {/* 👈 שנה את הטקסט */}
  </button>
</div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <ClipLoader size={50} color="#4b5563" />
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-l">
                      <th className="px-6 py-4 text-center">מספר הזמנה</th>
                      <th className="px-6 py-4 text-center">סכום</th>
                      <th className="px-6 py-4 text-center">סטטוס</th>
                      <th className="px-6 py-4 text-center">שם פרוייקט</th>
                      <th className="px-6 py-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map((order) => (
                      <tr
                        key={order._id}
                        onClick={() => handleView(order._id)}
                        className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium text-center">{order.orderNumber}</td>
                        <td className="px-6 py-4 font-medium text-center">{formatNumber(order.sum)} ₪</td>
                        <td className="px-6 py-4 font-medium text-center">{order.status}</td>
                        <td className="px-6 py-4 font-medium text-center">{order.projectName}</td>
                        <td className="px-6 py-4 font-medium text-center">
                          <div className="flex justify-center gap-2">
                           
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(order._id);
                              }}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors duration-150"
                            >
                              <Edit2 size={25} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(order._id);
                                setShowModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
                            >
                              <Trash2 size={25} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-medium text-slate-600">אין הזמנות להציג</h2>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="mb-6">
                <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
                  <h3 className="text-3xl font-bold text-center">האם אתה בטוח?</h3>
                  <p className="mt-1 text-l text-center">שים לב! פעולה זו תמחק את ההזמנה לצמיתות.</p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-l font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150"
                >
                  מחק הזמנה
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-l font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל מחולל דוחות */}
{/* מודל מחולל דוחות - להוסיף לפני מודל המחיקה */}
{showReportModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  onClick={() => setShowReportModal(false)}

  >
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold">מחולל דוחות הזמנות</h3>
        <button
          onClick={() => setShowReportModal(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      {/* פילטרים מתקדמים */}
      <div className="mb-6">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Filter size={20} />
          פילטרים מתקדמים
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">תאריך יצירה מ:</label>
            <input
              type="date"
              value={advancedFilters.dateFrom}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, dateFrom: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">תאריך יצירה עד:</label>
            <input
              type="date"
              value={advancedFilters.dateTo}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, dateTo: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">סכום מינימלי:</label>
            <input
              type="number"
              value={advancedFilters.sumMin}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, sumMin: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="₪"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">סכום מקסימלי:</label>
            <input
              type="number"
              value={advancedFilters.sumMax}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, sumMax: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="₪"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">שם פרויקט:</label>
            <input
              type="text"
              value={advancedFilters.projectName}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, projectName: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="חיפוש חלקי..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">שם מזמין:</label>
            <input
              type="text"
              value={advancedFilters.invitingName}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, invitingName: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="חיפוש חלקי..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">מספר הזמנה:</label>
            <input
              type="text"
              value={advancedFilters.orderNumber}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, orderNumber: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="חיפוש חלקי..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">סטטוס:</label>
            <select
              value={advancedFilters.status}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, status: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">כל הסטטוסים</option>
              <option value="הוגש">הוגש</option>
              <option value="לא הוגש">לא הוגש</option>
              <option value="בעיבוד">בעיבוד</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">פירוט:</label>
            <input
              type="text"
              value={advancedFilters.detail}
              onChange={(e) => setAdvancedFilters(prev => ({...prev, detail: e.target.value}))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="חיפוש בפירוט..."
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={clearAdvancedFilters}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            <X size={16} />
            נקה פילטרים
          </button>
        </div>
      </div>

      {/* בחירת עמודות */}
      <div className="mb-6">
        <h4 className="text-lg font-bold mb-4">בחר עמודות לייצוא:</h4>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={selectAllColumns}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            בחר הכל
          </button>
          <button
            onClick={deselectAllColumns}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            בטל הכל
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.orderNumber}
              onChange={() => toggleColumn('orderNumber')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">מספר הזמנה</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.projectName}
              onChange={() => toggleColumn('projectName')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">שם הפרויקט</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.invitingName}
              onChange={() => toggleColumn('invitingName')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">שם המזמין</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.sum}
              onChange={() => toggleColumn('sum')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">סכום</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.status}
              onChange={() => toggleColumn('status')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">סטטוס</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.createdAt}
              onChange={() => toggleColumn('createdAt')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">תאריך יצירה</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.detail}
              onChange={() => toggleColumn('detail')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">פירוט</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.formattedSum}
              onChange={() => toggleColumn('formattedSum')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">סכום מעוצב</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.formattedDate}
              onChange={() => toggleColumn('formattedDate')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">תאריך מעוצב</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportColumns.daysSinceCreated}
              onChange={() => toggleColumn('daysSinceCreated')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">ימים מיצירה</span>
          </label>
        </div>
      </div>

      {/* סיכום הדוח */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold mb-2">סיכום הדוח:</h4>
        <p className="text-sm">
          <strong>מספר הזמנות:</strong> {getFilteredOrders().length} <br/>
          <strong>עמודות נבחרות:</strong> {Object.values(exportColumns).filter(v => v).length} <br/>
          <strong>סכום כולל:</strong> {getFilteredOrders().reduce((sum, order) => sum + (order.sum || 0), 0).toLocaleString('he-IL')} ₪ <br/>
          <strong>ממוצע הזמנה:</strong> {getFilteredOrders().length > 0 ? Math.round(getFilteredOrders().reduce((sum, order) => sum + (order.sum || 0), 0) / getFilteredOrders().length).toLocaleString('he-IL') : 0} ₪ <br/>
          <strong>הזמנות בסטטוס "הוגש":</strong> {getFilteredOrders().filter(order => order.status === 'הוגש').length} <br/>
          <strong>הזמנות בסטטוס "לא הוגש":</strong> {getFilteredOrders().filter(order => order.status === 'לא הוגש').length} <br/>
          <strong>הזמנות בעיבוד:</strong> {getFilteredOrders().filter(order => order.status === 'בעיבוד').length}
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={() => setShowReportModal(false)}
          className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ביטול
        </button>
        <button
          onClick={exportCustomReport}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <DownloadCloud size={20} />
          ייצא דוח
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
};


export default OrdersPage;
