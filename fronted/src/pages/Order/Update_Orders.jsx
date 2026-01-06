import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import FileUploader from "../../Components/FileUploader";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
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
  const [supplierId, setSupplierId] = useState(""); // ✅ הוספה
  const [Contact_person, setContact_Person] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [sum, setSum] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [submittedAmount, setSubmittedAmount] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");

  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditOrders, user } = useAuth();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${id}`);
        const orderData = response.data.data || response.data;

        let projectId = orderData.projectId;

        if (typeof projectId === "object") {
          projectId = projectId._id || projectId.$oid;
        }

        if (!canEditOrders(projectId)) {
          navigate("/no-access", { replace: true });
          return;
        }

        setOrder(orderData);
        setProjectName(orderData.projectName || "");
        setOrderNumber(orderData.orderNumber || "");
        setSum(orderData.sum || "");
        setStatus(orderData.status || "בעיבוד");
        setDetail(orderData.detail || "");
        setInvitingName(orderData.invitingName || "");
        setSupplierId(orderData.supplierId || ""); // ✅ הוספה
        setContact_Person(orderData.Contact_person || "");
        setCreatedAt(
          orderData.createdAt
            ? new Date(orderData.createdAt).toISOString().split("T")[0]
            : ""
        );
        setSubmittedAmount(orderData.submittedAmount || "");
        setSubmittedDate(
          orderData.submittedDate
            ? new Date(orderData.submittedDate).toISOString().split("T")[0]
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
    if (!url) {
      console.warn("⚠️ URL is empty");
      return null;
    }

    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)$/);

      if (match && match[1]) {
        const publicId = match[1].replace(/\.[^.]+$/, "");
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
    const fileToDelete = files[fileIndex];

    if (!fileToDelete) {
      toast.error("קובץ לא נמצא");
      return;
    }

    if (fileToDelete.isLocal) {
      const clone = [...files];
      clone.splice(fileIndex, 1);
      setFiles(clone);

      if (fileToDelete.tempUrl) {
        URL.revokeObjectURL(fileToDelete.tempUrl);
      }

      toast.success("הקובץ הוסר מהרשימה");
      return;
    }

    const originalFiles = [...files];

    try {
      const clone = [...files];
      clone.splice(fileIndex, 1);
      setFiles(clone);

      const fileUrl = fileToDelete.url || fileToDelete.fileUrl;

      if (!fileUrl) {
        console.warn("⚠️ No URL found in file object");
        toast.warning("לא נמצא URL לקובץ");
        return;
      }

      let publicId = fileToDelete.publicId;

      if (!publicId) {
        publicId = extractPublicIdFromUrl(fileUrl);
      }

      if (!publicId) {
        console.error("❌ Could not get publicId");
        toast.warning(
          "הקובץ הוסר מהרשימה, אך לא ניתן למחוק מ-Cloudinary (חסר publicId)"
        );
        return;
      }

      const response = await api.delete("/upload/delete-cloudinary", {
        data: {
          publicId,
          resourceType: fileToDelete.resourceType || "raw",
        },
      });

      toast.success("הקובץ נמחק מהשרת ומ-Cloudinary");
    } catch (error) {
      console.error("❌ Error deleting file:", error);

      if (
        error.response?.status === 404 ||
        error.response?.data?.result === "not found"
      ) {
        toast.info("הקובץ כבר לא קיים ב-Cloudinary");
      } else {
        toast.error(
          "שגיאה במחיקת הקובץ: " +
            (error.response?.data?.message ||
              error.response?.data?.error ||
              error.message)
        );

        setFiles(originalFiles);
      }
    }
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
            folder: res.data.file.folder,
            size: file.file.size,
            type: file.file.type,
          });
        } else {
          const existingFile = {
            name: file.name,
            url: file.url,
            type: file.type,
            size: file.size,
          };

          if (file.publicId) {
            existingFile.publicId = file.publicId;
          } else if (file.url) {
            existingFile.publicId = extractPublicIdFromUrl(file.url);
          }

          if (file.resourceType) {
            existingFile.resourceType = file.resourceType;
          } else {
            existingFile.resourceType = "raw";
          }

          if (file.folder) {
            existingFile.folder = file.folder;
          }

          uploadedFiles.push(existingFile);
        }
      }

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
        supplierId, // ✅ הוספה
        detail,
        Contact_person,
        createdAt,
        files: uploadedFiles,
        submittedDate: status !== "לא הוגש" ? submittedDate : null,
        submittedAmount: status === "הוגש חלקי" ? Number(submittedAmount) : 0,
      };

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Hero Header */}
        <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">עריכת הזמנה</h1>
                  <p className="text-sm font-medium text-slate-600 mt-2">
                    הזמנה מספר: {orderNumber} | פרויקט: {projectName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:p-5 md:p-6 mb-8">
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
                type="text"
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
                onChange={(e) => {
                  const value = e.target.value;
                  setStatus(value);

                  // ✅ אפס שדות הגשה אם בוחרים "לא הוגש"
                  if (value === "לא הוגש") {
                    setSubmittedAmount("");
                    setSubmittedDate("");
                  }
                }}
                disabled={!canEdit}
                required
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="לא הוגש">לא הוגש</option>
                <option value="בעיבוד">בעיבוד</option>
                <option value="הוגש חלקי">הוגש חלקי</option>
                <option value="הוגש">הוגש</option>
              </select>
            </div>

            {/* ✅ בחירת ספק */}
            <div>
              <SupplierSelector
                projectId={null}
                value={supplierId}
                onSelect={(supplier) => {
                  setSupplierId(supplier._id);
                  // ✅ אל תמלא את invitingName - שדות נפרדים!
                }}
                disabled={!canEdit}
              />
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

            {/* ✅ תאריך הגשה - מופיע אם הסטטוס אינו "לא הוגש" */}
            {status !== "לא הוגש" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  תאריך הגשה
                </label>
                <input
                  type="date"
                  value={submittedDate}
                  onChange={(e) => setSubmittedDate(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* ✅ סכום הגשה - מופיע רק אם "הוגש חלקי" */}
            {status === "הוגש חלקי" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign className="inline w-4 h-4 mr-2" />
                  סכום שהוגש (₪)
                </label>
                <input
                  type="text"
                  value={submittedAmount}
                  onChange={(e) => setSubmittedAmount(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="הזן סכום..."
                />
              </div>
            )}
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
            <div className="mb-4 sm:mb-5 md:mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">
                  אין לך הרשאת עריכה להזמנה זו
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={submitting || !canEdit}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <ClipLoader
                    size={20}
                    color="#ffffff"
                    className="inline ml-2"
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
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
