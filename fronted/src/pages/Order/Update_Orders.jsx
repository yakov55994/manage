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
        let projectId = orderData.projectId;

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
        const normalizedFiles = Array.isArray(orderData.files)
          ? orderData.files
              .map((f) => {
                if (typeof f === "string") {
                  try {
                    return JSON.parse(f);
                  } catch {
                    return null;
                  }
                }
                return f;
              })
              .filter(Boolean)
          : [];

        setFiles(normalizedFiles);

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

  const extractPublicIdFromUrl = (url) => {
    console.log("🔍 Extracting publicId from URL:", url);

    if (!url) {
      console.warn("⚠️ URL is empty");
      return null;
    }

    try {
      // Cloudinary URL format: .../upload/v123456/folder/filename.ext
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)$/);

      console.log("🔍 Regex match result:", match);

      if (match && match[1]) {
        // הסר את הסיומת (extension)
        const publicId = match[1].replace(/\.[^.]+$/, "");
        console.log("✅ Extracted publicId:", publicId);
        return publicId;
      }

      console.warn("⚠️ Could not match URL pattern");
      return null;
    } catch (error) {
      console.error("❌ Error extracting publicId:", error);
      return null;
    }
  };
  const handleFileUpload = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles((prev) => [...(prev || []), ...selectedFiles]);
    toast.success(`${selectedFiles.length} קבצים נבחרו`);
  };

  const handleRemoveFile = async (fileIndex) => {
    console.log("🗑️ === START handleRemoveFile ===");
    console.log("🗑️ fileIndex:", fileIndex);

    const fileToDelete = files[fileIndex];
    console.log("🗑️ fileToDelete:", fileToDelete);

    if (!fileToDelete) {
      toast.error("קובץ לא נמצא");
      return;
    }

    // 1️⃣ קובץ מקומי - רק הסר מה-UI
    if (fileToDelete.isLocal) {
      console.log("📁 Local file - removing from UI only");
      const clone = [...files];
      clone.splice(fileIndex, 1);
      setFiles(clone);

      if (fileToDelete.tempUrl) {
        URL.revokeObjectURL(fileToDelete.tempUrl);
      }

      toast.success("הקובץ הוסר מהרשימה");
      return;
    }

    // 2️⃣ קובץ ב-Cloudinary
    console.log("☁️ Cloudinary file - attempting to delete from server");

    const originalFiles = [...files];

    try {
      // הסר מה-UI מיד (אופטימיסטי)
      const clone = [...files];
      clone.splice(fileIndex, 1);
      setFiles(clone);
      console.log("✅ Removed from UI (optimistically)");

      // חלץ publicId
      const fileUrl = fileToDelete.url || fileToDelete.fileUrl;
      console.log("🔗 File URL:", fileUrl);

      if (!fileUrl) {
        console.warn("⚠️ No URL found in file object");
        toast.warning("לא נמצא URL לקובץ");
        return;
      }

      // נסה לקבל publicId מהשדה או מה-URL
      let publicId = fileToDelete.publicId;
      console.log("🔑 publicId from file object:", publicId);

      if (!publicId) {
        console.log("🔍 Attempting to extract publicId from URL...");
        publicId = extractPublicIdFromUrl(fileUrl);
        console.log("🔑 Extracted publicId:", publicId);
      }

      if (!publicId) {
        console.error("❌ Could not get publicId");
        toast.warning(
          "הקובץ הוסר מהרשימה, אך לא ניתן למחוק מ-Cloudinary (חסר publicId)"
        );
        return;
      }

      console.log("📤 Sending DELETE request to /upload/delete-cloudinary");
      console.log("📤 Request data:", {
        publicId,
        resourceType: fileToDelete.resourceType || "raw",
      });

      // קריאה לשרת למחיקה
      const response = await api.delete("/upload/delete-cloudinary", {
        data: {
          publicId,
          resourceType: fileToDelete.resourceType || "raw",
        },
      });

      console.log("✅ Server response:", response.data);
      toast.success("הקובץ נמחק מהשרת ומ-Cloudinary");
    } catch (error) {
      console.error("❌ Error deleting file:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);

      // בדוק אם זה 404 (קובץ כבר נמחק)
      if (
        error.response?.status === 404 ||
        error.response?.data?.result === "not found"
      ) {
        console.log("ℹ️ File not found in Cloudinary (already deleted)");
        toast.info("הקובץ כבר לא קיים ב-Cloudinary");
      } else {
        // שגיאה אמיתית - החזר את המצב המקורי
        console.log("🔄 Restoring original files state");
        toast.error(
          "שגיאה במחיקת הקובץ: " +
            (error.response?.data?.message ||
              error.response?.data?.error ||
              error.message)
        );

        setFiles(originalFiles);
      }
    }

    console.log("🗑️ === END handleRemoveFile ===");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const projectId =
        typeof order.projectId === "object"
          ? order.projectId._id || order.projectId.$oid
          : order.projectId;

      if (!canEditOrders(projectId)) {
        toast.error("אין הרשאה לערוך הזמנה זו");
        navigate("/no-access", { replace: true });
        return;
      }

      const uploadedFiles = [];

      for (const file of files) {
        if (file.isLocal && file.file) {
          // 1️⃣ קובץ חדש - העלאה ל-Cloudinary
          console.log("📤 Uploading new file:", file.name);

          const formData = new FormData();
          formData.append("file", file.file);
          formData.append("folder", "orders");

          const res = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          console.log("📥 Upload response:", res.data.file);

          uploadedFiles.push({
            name: file.name,
            url: res.data.file.url,
            publicId: res.data.file.publicId,
            resourceType: res.data.file.resourceType,
            folder: res.data.file.folder,
            size: file.file.size,
            type: file.file.type,
          });
        } else {
          // 2️⃣ קובץ קיים - חלץ publicId מה-URL אם חסר
          console.log("📋 Existing file:", file);

          const existingFile = {
            name: file.name,
            url: file.url,
            type: file.type,
            size: file.size,
          };

          // ✅ אם יש publicId - השתמש בו
          if (file.publicId) {
            existingFile.publicId = file.publicId;
          } else if (file.url) {
            // ✅ אם אין publicId - חלץ מה-URL
            existingFile.publicId = extractPublicIdFromUrl(file.url);
            console.log(
              "🔍 Extracted publicId for existing file:",
              existingFile.publicId
            );
          }

          // ✅ העתק שדות נוספים אם קיימים
          if (file.resourceType) {
            existingFile.resourceType = file.resourceType;
          } else {
            existingFile.resourceType = "raw"; // ברירת מחדל
          }

          if (file.folder) {
            existingFile.folder = file.folder;
          }

          uploadedFiles.push(existingFile);
        }
      }

      console.log("📤 uploadedFiles type:", typeof uploadedFiles);
      console.log("📤 uploadedFiles is Array?:", Array.isArray(uploadedFiles));
      console.log(
        "📤 uploadedFiles JSON:",
        JSON.stringify(uploadedFiles, null, 2)
      );

      const payload = {
        orderNumber,
        projectName,
        projectId:
          typeof order.projectId === "object"
            ? order.projectId._id || order.projectId.$oid
            : order.projectId,
        sum: Number(sum),
        status,
        invitingName,
        detail,
        Contact_person,
        createdAt,
        files: uploadedFiles,
      };

      console.log("📤 Sending payload:", payload);
      console.log("📤 payload.files type:", typeof payload.files);

      const response = await api.put(`/orders/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.success) {
        toast.success("ההזמנה עודכנה בהצלחה!");
        navigate("/orders");
      }
    } catch (error) {
      console.error("❌ Error updating order:", error);
      toast.error(
        "שגיאה בעדכון ההזמנה: " +
          (error.response?.data?.message || error.message)
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
                  <ClipLoader
                    size={20}
                    color="#ffffff"
                    className="inline mr-2"
                  />
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
