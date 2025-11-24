import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import FileUploader from "../../Components/FileUploader";
import {
  ShoppingCart,
  Hash,
  DollarSign,
  FileText,
  User,
  Briefcase,
  Phone,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import DateField from "../../Components/DateField";
import { useAuth } from "../../context/AuthContext.jsx";

const OrderEditPage = () => {
  const [order, setOrder] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [invitingName, setInvitingName] = useState("");
  const [Contact_person, setContact_Person] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [sum, setSum] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true); // ✅ התחל מ-true
  const [submitting, setSubmitting] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditOrders, user } = useAuth(); // ✅ קבל user מ-context

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${id}`);
        const orderData = response.data.data || response.data;

        // ✅ נרמל את projectId
        let projectId = orderData.project;
        if (typeof projectId === "object") {
          projectId = projectId._id || projectId.$oid;
        }

        console.log("🔍 Order projectId:", projectId);
        console.log("🔍 User:", user);
        console.log("🔍 User permissions:", user?.permissions);
        console.log("🔍 Can edit orders?", canEditOrders(projectId));

        // ✅ בדיקת הרשאה
        if (!canEditOrders(projectId)) {
          console.log("❌ No permission to edit this order");
          navigate("/no-access", { replace: true });
          return;
        }

        // ✅ עדכון כל השדות
        setOrder(orderData);
        setProjectName(orderData.projectName || "");
        setOrderNumber(orderData.orderNumber || "");
        setSum(orderData.sum || "");
        setStatus(orderData.status || "בעיבוד");
        setDetail(orderData.detail || "");
        setInvitingName(orderData.invitingName || "");
        setContact_Person(orderData.Contact_person || "");
        setCreatedAt(
          orderData.createdAt
            ? new Date(orderData.createdAt).toISOString().split("T")[0]
            : ""
        );
        setFiles(orderData.files || []);

        console.log("✅ Order loaded successfully");
      } catch (error) {
        console.error("Error loading order:", error);
        toast.error("שגיאה בטעינת ההזמנה");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate, canEditOrders]);

  const handleFileUpload = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles((prev) => [...(prev || []), ...selectedFiles]);
    toast.success(`${selectedFiles.length} קבצים נבחרו`);
  };

  const handleRemoveFile = async (fileIndex) => {
    const fileToDelete = files[fileIndex];
    if (!fileToDelete) return;

    const clone = [...files];
    clone.splice(fileIndex, 1);
    setFiles(clone);
    toast.success("הקובץ הוסר");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // ✅ בדיקה נוספת לפני שמירה
      const projectId =
        typeof order.project === "object"
          ? order.project._id || order.project.$oid
          : order.project;

      if (!canEditOrders(projectId)) {
        toast.error("אין הרשאה לערוך הזמנה זו");
        navigate("/no-access", { replace: true });
        return;
      }

      const uploadedFiles = [];

      for (const file of files) {
        if (file.isLocal && file.file) {
          const formData = new FormData();
          formData.append("file", file.file);
          formData.append("folder", "orders");

          const res = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          uploadedFiles.push({
            name: file.name,
            url: res.data.file.url,
            publicId: res.data.file.publicId,
            resourceType: res.data.file.resourceType,
            size: file.file.size,
            type: file.file.type,
          });
        } else {
          uploadedFiles.push(file);
        }
      }

      await api.put(`/orders/${id}`, {
        orderNumber,
        sum: Number(sum),
        status,
        detail,
        invitingName,
        projectName,
        Contact_person,
        createdAt,
        files: uploadedFiles,
      });

      toast.success("הזמנה עודכנה בהצלחה");
      navigate(`/orders/${id}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(
        error.response?.data?.message || "שגיאה בעדכון ההזמנה"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ בדיקה נוספת - האם יש הרשאה לפרויקט הזה
  const canEdit = order
    ? canEditOrders(
        typeof order.project === "object"
          ? order.project._id || order.project.$oid
          : order.project
      )
    : false;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
        <ClipLoader size={80} color="#f97316" />
        <p className="mt-4 text-gray-600 font-semibold">טוען הזמנה...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
        <p className="text-gray-600 font-semibold">הזמנה לא נמצאה</p>
        <button
          onClick={() => navigate("/orders")}
          className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-xl"
        >
          חזור לרשימת הזמנות
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">עריכת הזמנה</h1>
          <p className="text-gray-600 mt-2">
            הזמנה מספר: {orderNumber} | פרויקט: {projectName}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Hash className="inline w-4 h-4 mr-2" />
                מספר הזמנה
              </label>
              <input
                type="number"
                value={orderNumber}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-2" />
                סכום (₪)
              </label>
              <input
                type="number"
                value={sum}
                onChange={(e) => setSum(e.target.value)}
                disabled={!canEdit}
                required
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <CheckCircle className="inline w-4 h-4 mr-2" />
                סטטוס
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!canEdit}
                required
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="הוגש">הוגש</option>
                <option value="בעיבוד">בעיבוד</option>
                <option value="לא הוגש">לא הוגש</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-2" />
                שם מזמין
              </label>
              <input
                type="text"
                value={invitingName}
                onChange={(e) => setInvitingName(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-2" />
                איש קשר
              </label>
              <input
                type="text"
                value={Contact_person}
                onChange={(e) => setContact_Person(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-2" />
                תאריך יצירה
              </label>
              <input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-2" />
              פירוט
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              disabled={!canEdit}
              rows={5}
              placeholder="הוסף פירוט להזמנה..."
              className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mb-8">
            <FileUploader
              onUploadSuccess={handleFileUpload}
              folder="orders"
              label="העלה קבצים"
              disabled={!canEdit}
              disabledMessage="אין לך הרשאת עריכה"
            />
          </div>

          {files.length > 0 && (
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Upload className="inline w-4 h-4 mr-2" />
                קבצים מצורפים ({files.length})
              </label>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-200 rounded-xl"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {file.name}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors"
                      >
                        <X className="inline w-4 h-4 mr-1" />
                        הסר
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canEdit && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">
                  אין לך הרשאת עריכה להזמנה זו
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !canEdit}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <ClipLoader size={20} color="#ffffff" className="inline mr-2" />
                  מעדכן...
                </>
              ) : (
                "עדכן הזמנה"
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/orders/${id}`)}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderEditPage;