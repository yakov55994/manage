import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Link, useNavigate } from "react-router-dom";
import { DownloadCloud, Edit2, Trash2, Filter } from "lucide-react"; // Importing icons
import api from "../../api/api";
import { toast } from "sonner";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");  // הוספת משתנה מצב עבור הסטטוס

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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl"
        });
      } finally {
        setLoading(false);
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

              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium"
              >
                <DownloadCloud size={20} />
                <span>ייצוא לאקסל</span>
              </button>
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
                      <th className="px-6 py-4 text-right">מספר הזמנה</th>
                      <th className="px-6 py-4 text-right">סכום</th>
                      <th className="px-6 py-4 text-right">סטטוס</th>
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
                        <td className="px-6 py-4 font-medium">{order.orderNumber}</td>
                        <td className="px-6 py-4 font-medium">{formatNumber(order.sum)} ₪</td>
                        <td className="px-6 py-4 font-medium">{order.status}</td>
                        <td className="px-6 py-4 font-medium">{order.projectName}</td>
                        <td className="px-6 py-4 font-medium">
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

      </div>
    </div>
  );
};


export default OrdersPage;
