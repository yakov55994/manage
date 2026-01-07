import { useState, useEffect } from "react";
import { Search, X, Check, FileText, Trash2 } from "lucide-react";
import api from "../api/api";

export default function OrderSelectionModal({
    isOpen,
    onClose,
    onSelect,
    selectedOrderId,
}) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchOrders();
        }
    }, [isOpen]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get("/orders");
            setOrders(response.data?.data || []);
        } catch (err) {
            console.error("Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredOrders = orders.filter((order) => {
        const term = searchTerm.toLowerCase();
        return (
            order.orderNumber?.toString().includes(term) ||
            order.projectName?.toLowerCase().includes(term) ||
            order.invitingName?.toLowerCase().includes(term)
        );
    });

    const handleSelect = (order) => {
        // אם לוחצים על ההזמנה שכבר נבחרה - מבטלים בחירה (Toggle)
        const currentId = selectedOrderId?._id || selectedOrderId;
        if (currentId === order._id) {
            onSelect(null);
        } else {
            onSelect(order);
        }
        onClose();
    };

    const handleRemoveSelection = () => {
        onSelect(null);
        // ניתן להשאיר את המודל פתוח או לסגור אותו, לפי העדפה. כאן נסגור:
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with X button */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">בחר הזמנה</h2>
                        <p className="text-sm text-gray-500">שייך הזמנה לפריט זה</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="חפש לפי מספר הזמנה, פרויקט או שם מזמין..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-right"
                            autoFocus
                        />
                    </div>

                    {/* Show selected order status if exists - Allows Cancellation */}
                    {selectedOrderId && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="flex items-center gap-2 text-blue-800">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-medium">ישנה הזמנה משוייכת כרגע</span>
                            </div>
                            <button
                                onClick={handleRemoveSelection}
                                className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                בטל שיוך
                            </button>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p>טוען הזמנות...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p>לא נמצאו הזמנות תואמות</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => {
                            const currentId = selectedOrderId?._id || selectedOrderId;
                            const isSelected = currentId === order._id;
                            return (
                                <div
                                    key={order._id}
                                    onClick={() => handleSelect(order)}
                                    className={`
                    relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all group
                    ${isSelected
                                            ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200"
                                            : "bg-white border-gray-100 hover:border-blue-300 hover:shadow-md"
                                        }
                  `}
                                >
                                    {/* Icon */}
                                    <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600"}
                  `}>
                                        <FileText className="w-6 h-6" />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`font-bold truncate ${isSelected ? "text-blue-900" : "text-gray-800"}`}>
                                                הזמנה #{order.orderNumber}
                                            </h3>
                                            <span className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                                ₪{order.sum?.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="truncate max-w-[150px] font-medium text-gray-700">
                                                {order.projectName}
                                            </span>
                                            <span>•</span>
                                            <span className="truncate">
                                                {order.invitingName}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-4 left-4 text-blue-600">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}