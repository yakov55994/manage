import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import FileUploader from "../../Components/FileUploader";
import { useModulePermission } from "../../hooks/useModulePermission.js";
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

const OrderEditPage = () => {
  const [projectName, setProjectName] = useState("");
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [invitingName, setInvitingName] = useState("");
  const [Contact_person, setContact_Person] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [sum, setSum] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const { canEdit } = useModulePermission(order?.projectId, "orders");

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/orders/${id}`);
        const data = response.data.data;
        setProjectName(data.projectName);
        setOrder(data);
        setOrderNumber(data.orderNumber);
        setSum(data.sum);
        setStatus(data.status);
        setDetail(data.detail);
        setInvitingName(data.invitingName);
        setContact_Person(data.Contact_person);

        if (data.createdAt) {
          const d = new Date(data.createdAt);
          setCreatedAt(d.toISOString().split("T")[0]);
        }

        setFiles(data.files || []);
      } catch (error) {
        toast.error("שגיאה בטעינת פרטי הזמנה");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

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
    setLoading(true);

    try {
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
      toast.error("שגיאה בעדכון ההזמנה");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ClipLoader size={80} color="#f97316" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">עריכת הזמנה</h1>
        </div>

        {order && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  מספר הזמנה
                </label>
                <input
                  type="number"
                  value={orderNumber}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  סכום
                </label>
                <input
                  type="number"
                  value={sum}
                  onChange={(e) => setSum(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  סטטוס
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 rounded-xl"
                >
                  <option value="הוגש">הוגש</option>
                  <option value="בעיבוד">בעיבוד</option>
                  <option value="לא הוגש">לא הוגש</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  שם מזמין
                </label>
                <input
                  type="text"
                  value={invitingName}
                  onChange={(e) => setInvitingName(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  איש קשר
                </label>
                <input
                  type="text"
                  value={Contact_person}
                  onChange={(e) => setContact_Person(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תאריך יצירה
                </label>
                <input
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 border-2 rounded-xl"
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                פירוט
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                disabled={!canEdit}
                rows={5}
                className="w-full px-4 py-3 border-2 rounded-xl resize-none"
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
                  קבצים מצורפים ({files.length})
                </label>
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <span className="text-sm">{file.name}</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm"
                        >
                          הסר
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !canEdit}
                className="flex-1 px-8 py-4 bg-orange-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? "מעדכן..." : "עדכן הזמנה"}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/orders/${id}`)}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrderEditPage;