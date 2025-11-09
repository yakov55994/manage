import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { ShoppingCart, Edit, Trash2, FileText, Calendar, User, Hash, DollarSign, Briefcase, AlertCircle, Phone, X } from "lucide-react";
import { toast } from 'sonner';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        const orderData = response.data;

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

    fetchInvoiceDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
          <ClipLoader size={80} color="#f97316" loading={loading} />
        </div>
        <h1 className="mt-6 font-bold text-2xl text-orange-900">טוען פרטי הזמנה...</h1>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num ? num.toLocaleString() : "0";
  };

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;
    if (!fileUrl) return null;

    const fileExtension = fileUrl.split('.').pop().toLowerCase();

    if (fileExtension === 'pdf') {
      return (
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">צפה בקובץ PDF</span>
        </a>
      );
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return (
        <button
          onClick={() => openInExcelViewer(fileUrl)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">צפה בקובץ Excel</span>
        </button>
      );
    } else if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">צפה בתמונה</span>
        </a>
      );
    } else {
      return (
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">צפה בקובץ</span>
        </a>
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
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="flex flex-col items-center">
            <div className="bg-red-100 rounded-full p-4 mb-4">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-red-600 mb-2">הזמנה לא נמצאה</h1>
            <p className="text-gray-600 text-center mb-6">לא ניתן למצוא את ההזמנה המבוקשת</p>
            <button
              onClick={() => navigate('/orders')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              חזור לרשימת הזמנות
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg">
                <ShoppingCart className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">פרטי הזמנה</h1>
                <p className="text-gray-600 mt-1">הצגת מידע מפורט על ההזמנה</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleEdit(order._id)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              >
                <Edit className="w-5 h-5" />
                <span>עריכת הזמנה</span>
              </button>

              <button
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              >
                <Trash2 className="w-5 h-5" />
                <span>מחק הזמנה</span>
              </button>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* שם המזמין */}
            <div className="group bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border-r-4 border-orange-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">שם המזמין</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{order.invitingName}</p>
            </div>

            {/* מספר הזמנה */}
            <div className="group bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border-r-4 border-amber-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Hash className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">מספר הזמנה</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{order.orderNumber}</p>
            </div>

            {/* סכום */}
            <div className="group bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-r-4 border-green-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">סכום</span>
              </div>
              <p className="text-xl font-bold text-green-700 mr-10">{formatNumber(order.sum)} ₪</p>
            </div>

            {/* פירוט */}
            <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-r-4 border-blue-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">פירוט</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{order.detail}</p>
            </div>

            {/* פרויקט */}
            <div className="group bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-r-4 border-purple-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">פרויקט</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{order.projectName}</p>
            </div>

            {/* תאריך יצירה */}
            <div className="group bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border-r-4 border-indigo-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">תאריך יצירה</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{formatHebrewDate(order.createdAt)}</p>
            </div>

            {/* סטטוס */}
            <div className="group bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border-r-4 border-orange-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">סטטוס הזמנה</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{order.status}</p>
            </div>

            {/* איש קשר */}
            <div className="group bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-xl border-r-4 border-teal-500 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Phone className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-gray-600">איש קשר</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mr-10">{order.Contact_person}</p>
            </div>
          </div>

          {/* Files Section */}
          {order.files && order.files.length > 0 && (
            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg shadow-lg">
                  <FileText className="text-white w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">קבצים מצורפים</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.files.map((file, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border-2 border-gray-200 hover:border-orange-400 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold w-10 h-10 rounded-lg flex items-center justify-center shadow-md">
                          {index + 1}
                        </div>
                        <span className="font-semibold text-gray-700">קובץ {index + 1}</span>
                      </div>
                      <div>
                        {renderFile(file)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!order.files || order.files.length === 0) && (
            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl border-2 border-dashed border-gray-300 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                <p className="text-xl font-semibold text-gray-600">אין קבצים מצורפים</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold">אישור מחיקה</h3>
                </div>
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-lg text-gray-700 text-center mb-2">
                האם אתה בטוח שברצונך למחוק את ההזמנה?
              </p>
              <p className="text-red-600 text-center font-semibold mb-6">
                פעולה זו אינה ניתנת לביטול!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <ClipLoader size={20} color="#ffffff" />
                      מוחק...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      מחק הזמנה
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;