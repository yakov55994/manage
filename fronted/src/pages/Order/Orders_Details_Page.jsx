import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import {
  ShoppingCart,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  User,
  Hash,
  DollarSign,
  Briefcase,
  AlertCircle,
  Phone,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Download,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

const OrderDetailsPage = () => {
  const { projectId, id } = useParams();
  const [order, setOrder] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { canViewModule, canEditModule, isAdmin } = useAuth();

  const canViewOrders = canViewModule(projectId, "orders");
  const canEditOrders = canEditModule(projectId, "orders");

  useEffect(() => {
    if (!canViewOrders) {
      navigate("/no-access");
    }
  }, [canViewOrders]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        const orderData = response.data.data;

        if (orderData.files && orderData.files.length > 0) {
          const fileDetails = await Promise.all(
            orderData.files.map(async (file) => {
              if (file && file._id) {
                const fileRes = await api.get(`/files/${file._id}`);
                return fileRes.data;
              } else {
                console.warn("File has no ID, using URL directly:", file.url);
                return file;
              }
            })
          );
          orderData.files = fileDetails;
        }

        setOrder(orderData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching order details:", error);
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען פרטי הזמנה...
        </h1>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num ? num.toLocaleString() : "0";
  };

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file, index) => {
    const fileUrl = file?.url || file?.fileUrl;
    const fileName = file?.name || `קובץ ${index + 1}`;

    if (!fileUrl) {
      return (
        <div className="text-red-500 text-sm">שגיאה: לא נמצא קישור לקובץ</div>
      );
    }

    const fileExtension = fileUrl.split(".").pop().toLowerCase();

    if (fileExtension === "pdf") {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            צפה ב-PDF
          </a>
        </div>
      );
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <button
            onClick={() => openInExcelViewer(fileUrl)}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            צפה באקסל
          </button>
        </div>
      );
    } else if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            צפה בתמונה
          </a>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            הורד
          </a>
        </div>
      );
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-order/${id}`);
  };

  const handleDelete = async () => {
    try {
      if (!order?._id) return;
      setDeleting(true);
      await api.delete(`/orders/${order._id}`);
      toast.success("ההזמנה נמחקה בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate("/orders");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("שגיאה במחיקת ההזמנה", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-600">הזמנה לא נמצאה</h1>
          <button
            onClick={() => navigate("/orders")}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
          >
            חזור לרשימת הזמנות
          </button>
        </div>
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
                    פרטי הזמנה
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      מספר {order.orderNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/orders")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לרשימה</span>
                </button>

                {canEditOrders && (
                  <button
                    onClick={() => handleEdit(order._id)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>ערוך הזמנה</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl shadow-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>מחק הזמנה</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Order Details Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    פרטי ההזמנה
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* שם המזמין */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        שם המזמין
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.invitingName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* מספר הזמנה */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Hash className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        מספר הזמנה
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.orderNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* סכום */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <DollarSign className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        סכום
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatNumber(order.sum)} ₪
                      </p>
                    </div>
                  </div>
                </div>

                {/* פירוט */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        פירוט
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.detail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* פרויקט */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Briefcase className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        פרויקט
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.projectName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* סטטוס */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        סטטוס הזמנה
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.status}
                      </p>
                    </div>
                  </div>
                </div>
                {order.status == "הוגש חלקי" ? (
                  <>
                     <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                       סכום חלקי ששולם
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.submittedAmount}
                      </p>
                    </div>
                  </div>
                </div>
                  </>
                ) : <></>
              }

                {/* איש קשר */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Phone className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        איש קשר
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.Contact_person}
                      </p>
                    </div>
                  </div>
                </div>

                {/* תאריך יצירה */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תאריך יצירה
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatHebrewDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* נוצר ע"י */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        נוצר ע"י
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {order.createdByName || "לא זמין"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100">
                    <Paperclip className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    קבצים מצורפים
                  </h2>
                  {order.files && order.files.length > 0 && (
                    <span className="mr-auto px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                      {order.files.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {order.files && order.files.length > 0 ? (
                <div className="space-y-3">
                  {order.files.map((file, index) => (
                    <div key={index}>{renderFile(file, index)}</div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-lg">אין קבצים מצורפים</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם למחוק את ההזמנה?
                  </h3>
                  <p className="text-slate-600">הפעולה בלתי הפיכה.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg disabled:opacity-60"
                  >
                    {deleting ? "מוחק..." : "מחק"}
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;