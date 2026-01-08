import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Save, ArrowLeft, DollarSign, FileText, X } from "lucide-react";
import { ClipLoader } from "react-spinners";
import api from "../../api/api";
import OrderSelectionModal from "../../Components/OrderSelectionModal";

export default function UpdateIncome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    description: "",
    notes: "",
    orderId: null,
    isCredited: "לא",
  });

  useEffect(() => {
    loadIncome();
  }, [id]);

  const loadIncome = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/incomes/${id}`);
      const income = response.data?.data;

      if (!income) {
        toast.error("הכנסה לא נמצאה");
        navigate("/incomes");
        return;
      }

      // המרת תאריך לפורמט שמתאים ל-input date
      const dateObj = new Date(income.date);
      const formattedDate = dateObj.toISOString().split("T")[0];

      setFormData({
        date: formattedDate,
        amount: income.amount || "",
        description: income.description || "",
        notes: income.notes || "",
        orderId: income.orderId?._id || income.orderId || null,
        isCredited: income.isCredited || "לא",
      });

      if (income.orderId && typeof income.orderId === 'object') {
        setSelectedOrder(income.orderId);
      }
    } catch (error) {
      console.error("Error loading income:", error);
      toast.error("שגיאה בטעינת ההכנסה");
      navigate("/incomes");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // טיפול בבחירת הזמנה מהמודל
  const handleOrderSelect = (order) => {
    if (order) {
      setSelectedOrder(order);
      // שויכו להזמנה - עדכן שדות אוטומטית
      setFormData(prev => ({
        ...prev,
        orderId: order._id,
        isCredited: "כן",
        // התאריך תשלום יהיה תאריך הזיכוי (תאריך ההכנסה הנוכחי או התאריך שהמשתמש בחר)
        date: prev.date || new Date().toISOString().split("T")[0],
      }));
    } else {
      // ביטול שיוך
      setSelectedOrder(null);
      setFormData(prev => ({
        ...prev,
        orderId: null,
        isCredited: "לא",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.amount || !formData.description) {
      toast.error("נא למלא את כל השדות החובה");
      return;
    }

    setSaving(true);

    try {
      // קודם כל, טען את ההכנסה המקורית כדי לבדוק אם היה orderId קודם
      const originalIncomeRes = await api.get(`/incomes/${id}`);
      const originalIncome = originalIncomeRes.data?.data;
      const oldOrderId = originalIncome?.orderId?._id || originalIncome?.orderId;
      const newOrderId = formData.orderId;

      console.log('📝 Update income - Old orderId:', oldOrderId, 'New orderId:', newOrderId);

      // עדכן את ההכנסה
      await api.put(`/incomes/${id}`, formData);

      // אם היה orderId קודם ועכשיו אין (ביטול שיוך)
      if (oldOrderId && !newOrderId) {
        console.log('🔓 Unlinking order:', oldOrderId);
        try {
          const orderRes = await api.get(`/orders/${oldOrderId}`);
          const orderData = orderRes.data?.data || orderRes.data;

          await api.put(`/orders/${oldOrderId}`, {
            ...orderData,
            projectId: typeof orderData.projectId === 'object'
              ? (orderData.projectId._id || orderData.projectId.$oid)
              : orderData.projectId,
            supplierId: typeof orderData.supplierId === 'object'
              ? (orderData.supplierId?._id || orderData.supplierId?.$oid)
              : orderData.supplierId,
            isCredited: false,
            creditDate: null,
          });
          console.log('✅ Order unmarked as credited');
        } catch (err) {
          console.error('Error updating old order:', err);
        }
      }

      // אם יש orderId חדש (שיוך חדש או שינוי שיוך)
      if (newOrderId) {
        console.log('🔗 Linking to order:', newOrderId);
        try {
          const orderRes = await api.get(`/orders/${newOrderId}`);
          const orderData = orderRes.data?.data || orderRes.data;

          await api.put(`/orders/${newOrderId}`, {
            ...orderData,
            projectId: typeof orderData.projectId === 'object'
              ? (orderData.projectId._id || orderData.projectId.$oid)
              : orderData.projectId,
            supplierId: typeof orderData.supplierId === 'object'
              ? (orderData.supplierId?._id || orderData.supplierId?.$oid)
              : orderData.supplierId,
            isCredited: true,
            creditDate: formData.date,
          });
          console.log('✅ Order marked as credited');
        } catch (err) {
          console.error('Error updating new order:', err);
        }

        // אם השתנה orderId (היה orderId אחר קודם)
        if (oldOrderId && oldOrderId !== newOrderId) {
          console.log('🔄 Changing order link - unlinking old order:', oldOrderId);
          try {
            const oldOrderRes = await api.get(`/orders/${oldOrderId}`);
            const oldOrderData = oldOrderRes.data?.data || oldOrderRes.data;

            await api.put(`/orders/${oldOrderId}`, {
              ...oldOrderData,
              projectId: typeof oldOrderData.projectId === 'object'
                ? (oldOrderData.projectId._id || oldOrderData.projectId.$oid)
                : oldOrderData.projectId,
              supplierId: typeof oldOrderData.supplierId === 'object'
                ? (oldOrderData.supplierId?._id || oldOrderData.supplierId?.$oid)
                : oldOrderData.supplierId,
              isCredited: false,
              creditDate: null,
            });
            console.log('✅ Old order unmarked as credited');
          } catch (err) {
            console.error('Error updating old order:', err);
          }
        }
      }

      toast.success("ההכנסה עודכנה בהצלחה!");
      navigate(`/incomes/${id}`);
    } catch (error) {
      console.error("Error updating income:", error);
      toast.error(error.response?.data?.message || "שגיאה בעדכון הכנסה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-2xl text-slate-900">
          טוען הכנסה...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      עדכון הכנסה
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      ערוך את פרטי ההכנסה
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/incomes/${id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">חזרה</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* תאריך */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  תאריך *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* סכום */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  סכום (זכות) *
                </label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* תיאור */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  תיאור *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="תיאור ההכנסה"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* שיוך להזמנה */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  שיוך להזמנה (אופציונלי)
                </label>

                {selectedOrder ? (
                  <div className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">
                          הזמנה #{selectedOrder.orderNumber}
                        </div>
                        <div className="text-sm text-slate-500">
                          {selectedOrder.projectName} • {selectedOrder.invitingName}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(true)}
                      className="text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline px-2"
                    >
                      החלף
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                  >
                    + לחץ לשיוך הזמנה
                  </button>
                )}

                <OrderSelectionModal
                  isOpen={isOrderModalOpen}
                  onClose={() => setIsOrderModalOpen(false)}
                  onSelect={handleOrderSelect}
                  selectedOrderId={formData.orderId}
                />
              </div>

              {/* האם זוכה - לקריאה בלבד */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  האם זוכה
                </label>
                <div className={`px-4 py-3 border-2 rounded-xl ${formData.isCredited === "כן"
                  ? "border-green-300 bg-green-50 text-green-800 font-bold"
                  : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}>
                  {formData.isCredited}
                  {formData.isCredited === "כן" && (
                    <span className="text-xs text-green-600 mr-2">
                      (משוייך להזמנה)
                    </span>
                  )}
                </div>
              </div>

              {/* הערות */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="הערות נוספות..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => navigate(`/incomes/${id}`)}
                className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg"
              >
                <Save className="w-5 h-5" />
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
