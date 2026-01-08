import { useState, useEffect } from "react";
import { Search, Check, X, ShoppingCart } from "lucide-react";
import api from "../api/api";

/**
 * קומפוננטה לבחירת הזמנה
 * @param {String} value - ID הזמנה נבחרת
 * @param {Function} onSelect - callback לעדכון (מקבל את כל אובייקט ההזמנה או null)
 * @param {Boolean} allowClear - האם לאפשר ניקוי בחירה (default: false)
 * @param {String} label - כותרת השדה
 * @param {String} placeholder - placeholder לחיפוש
 */
export default function OrderSelector({
  value,
  onSelect,
  allowClear = false,
  label = "בחר הזמנה",
  placeholder = "חפש הזמנה לפי מספר או פרטים...",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // טען הזמנות
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get("/orders");
      setOrders(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // סינון הזמנות לפי חיפוש
  const filteredOrders = orders.filter((order) => {
    const q = searchTerm.toLowerCase();
    return (
      order.orderNumber?.toString().includes(q) ||
      order.projectName?.toLowerCase().includes(q) ||
      order.invitingName?.toLowerCase().includes(q) ||
      order.detail?.toLowerCase().includes(q)
    );
  });

  // מציאת ההזמנה הנבחרת
  const selectedOrder = value
    ? orders.find(order => order._id === value)
    : null;

  // טיפול בבחירת הזמנה
  const handleSelect = (order) => {
    if (order._id === value) {
      // ביטול בחירה
      onSelect?.(null);
    } else {
      // בחירת הזמנה
      onSelect?.(order);
    }
  };

  // ניקוי בחירה
  const handleClear = () => {
    onSelect?.(null);
  };

  // פורמט תאריך
  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("he-IL");
  };

  // פורמט סטטוס
  const getStatusColor = (status) => {
    switch (status) {
      case "הוגש":
        return "bg-green-100 text-green-800 border-green-300";
      case "הוגש חלקי":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "בעיבוד":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-red-100 text-red-800 border-red-300";
    }
  };

  return (
    <div className="w-full">
      {/* כותרת */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
        {allowClear && value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <X className="w-3 h-3" />
            נקה
          </button>
        )}
      </div>

      {/* הצגת הזמנה נבחרת */}
      {selectedOrder && (
        <div className="mb-2 p-3 bg-orange-100 border-2 border-orange-300 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-700" />
              <div>
                <span className="text-sm font-bold text-orange-900">
                  הזמנה #{selectedOrder.orderNumber}
                </span>
                {selectedOrder.projectName && (
                  <span className="text-xs text-orange-700 mr-2">
                    ({selectedOrder.projectName})
                  </span>
                )}
              </div>
            </div>
            {allowClear && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-orange-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-orange-700" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* מיכל הבחירה */}
      <div className="relative bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl shadow-lg overflow-hidden">
        {/* אזור עליון - חיפוש */}
        <div className="p-4 border-b-2 border-orange-100 bg-white/50">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-right"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-5 h-5" />
          </div>
        </div>

        {/* רשימת הזמנות */}
        <div className="p-5 max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p>טוען הזמנות...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center text-gray-400 p-6">
              {searchTerm ? "לא נמצאו הזמנות התואמות לחיפוש" : "אין הזמנות זמינות"}
            </div>
          ) : (
            filteredOrders.map((order) => {
              const selected = order._id === value;

              return (
                <label
                  key={order._id}
                  className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all border-2
                    ${
                      selected
                        ? "bg-orange-100 border-orange-300 shadow-md"
                        : "bg-white border-orange-100 hover:bg-orange-50 hover:border-orange-200"
                    }
                  `}
                >
                  {/* Radio */}
                  <div className="relative w-5 h-5 flex-shrink-0 mt-1">
                    <input
                      type="radio"
                      checked={selected}
                      onChange={() => handleSelect(order)}
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />
                    {selected && (
                      <Check className="absolute inset-0 w-5 h-5 text-orange-600 pointer-events-none" />
                    )}
                  </div>

                  {/* פרטי ההזמנה */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingCart className="w-4 h-4 text-orange-600" />
                      <span
                        className={`font-bold text-sm ${
                          selected ? "text-orange-900" : "text-slate-700"
                        }`}
                      >
                        הזמנה #{order.orderNumber}
                      </span>

                      {/* סטטוס */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status || "לא הוגש"}
                      </span>
                    </div>

                    {/* שם פרויקט */}
                    {order.projectName && (
                      <div className="text-xs text-slate-600 mb-1">
                        <span className="font-medium">פרויקט:</span> {order.projectName}
                      </div>
                    )}

                    {/* שם מזמין */}
                    {order.invitingName && (
                      <div className="text-xs text-slate-600 mb-1">
                        <span className="font-medium">מזמין:</span> {order.invitingName}
                      </div>
                    )}

                    {/* פרטים */}
                    {order.detail && (
                      <div className="text-xs text-slate-500 mb-1">
                        {order.detail}
                      </div>
                    )}

                    {/* תאריך יצירה */}
                    {order.createdAt && (
                      <div className="text-xs text-slate-400 mt-1">
                        תאריך יצירה: {formatDate(order.createdAt)}
                      </div>
                    )}
                  </div>

                  {/* סכום */}
                  <div className="text-left">
                    <span className="font-bold text-orange-700 text-sm">
                      ₪{order.sum?.toLocaleString()}
                    </span>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
