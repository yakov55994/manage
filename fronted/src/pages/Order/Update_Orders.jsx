import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
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
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const OrderEditPage = () => {
  const [projectName, setProjectName] = useState("");
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [invitingName, setInvitingName] = useState("");
  const [Contact_person, setContact_Person] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [sum, setSum] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

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
        setFiles(data.files || []);
      } catch (error) {
        toast.error("שגיאה בטעינת פרטי הזמנה", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleFileUpload = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles = [
      ...files,
      ...Array.from(selectedFiles)
        .filter((file) => !files.some((f) => f.name === file.name))
        .map((file) => ({
          name: file.name,
          file,
          isLocal: true,
        })),
    ];

    setFiles(newFiles);
    toast.success(`${selectedFiles.length} קבצים נוספו`, {
      className: "sonner-toast success rtl",
    });
  };

  const extractPublicIdFromUrl = (url, withExtension = true) => {
    try {
      const urlParts = url.split("/");
      const uploadIndex = urlParts.findIndex((part) => part === "upload");

      if (uploadIndex === -1) return null;

      let pathAfterUpload = urlParts.slice(uploadIndex + 1);

      if (pathAfterUpload[0] && pathAfterUpload[0].match(/^v\d+$/)) {
        pathAfterUpload = pathAfterUpload.slice(1);
      }

      let publicId = pathAfterUpload.join("/");

      if (!withExtension) {
        const lastDotIndex = publicId.lastIndexOf(".");
        if (lastDotIndex > 0) {
          publicId = publicId.substring(0, lastDotIndex);
        }
      }

      return publicId;
    } catch (error) {
      console.error("Error extracting publicId from URL:", error);
      return null;
    }
  };

  const handleRemoveFile = async (fileIndex) => {
    const fileToDelete = files[fileIndex];

    if (!fileToDelete) {
      toast.error("קובץ לא נמצא", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    if (fileToDelete.isLocal) {
      const newFiles = [...files];
      newFiles.splice(fileIndex, 1);
      setFiles(newFiles);

      if (fileToDelete.tempUrl) {
        URL.revokeObjectURL(fileToDelete.tempUrl);
      }

      toast.success("הקובץ הוסר מהרשימה", {
        className: "sonner-toast success rtl",
      });
      return;
    }

    const newFiles = [...files];
    newFiles.splice(fileIndex, 1);
    setFiles(newFiles);

    if (fileToDelete.url || fileToDelete.fileUrl) {
      const fileUrl = fileToDelete.url || fileToDelete.fileUrl;
      const publicId = extractPublicIdFromUrl(fileUrl, true);

      if (publicId) {
        try {
          await api.delete("/upload/delete-cloudinary", {
            data: {
              publicId: publicId,
              resourceType: "raw",
            },
          });

          toast.success("הקובץ נמחק בהצלחה מ-Cloudinary", {
            className: "sonner-toast success rtl",
          });
        } catch (deleteError) {
          console.error(
            "מחיקה מ-Cloudinary נכשלה:",
            deleteError.response?.status
          );
          toast.warning("הקובץ הוסר מהרשימה. בדוק ידנית אם נמחק מ-Cloudinary", {
            className: "sonner-toast warning rtl",
          });
        }
      } else {
        console.error("לא הצליח לחלץ publicId מ-URL:", fileUrl);
        toast.warning("הקובץ הוסר מהרשימה, אך לא ניתן לחלץ את פרטי הקובץ", {
          className: "sonner-toast warning rtl",
        });
      }
    } else {
      toast.success("הקובץ הוסר", {
        className: "sonner-toast success rtl",
      });
    }
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;
    const fileName = file.name || (fileUrl && fileUrl.split("/").pop());

    if (!fileUrl && file?.file) {
      return <span className="text-gray-700 font-medium">{file.name}</span>;
    }

    const ext = fileUrl?.split(".").pop().toLowerCase();

    if (ext === "pdf") {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium hover:underline"
        >
          <FileText className="w-4 h-4" />
          {fileName}
        </a>
      );
    }

    if (["jpg", "jpeg", "png", "gif"].includes(ext)) {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          <FileText className="w-4 h-4" />
          {fileName}
        </a>
      );
    }

    if (ext === "xlsx") {
      const viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
        fileUrl
      )}`;
      return (
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium hover:underline"
        >
          <FileText className="w-4 h-4" />
          {fileName}
        </a>
      );
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium hover:underline"
      >
        <FileText className="w-4 h-4" />
        {fileName}
      </a>
    );
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

      const formData = {
        _id: id,
        orderNumber,
        sum: isNaN(Number(sum)) ? 0 : Number(sum),
        status,
        detail,
        invitingName,
        projectName,
        Contact_person,
        files: uploadedFiles,
      };

      await api.put(`/orders/${id}`, formData);
      toast.success("הזמנה עודכנה בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate(`/orders/${id}`);
    } catch (error) {
      toast.error(error.message, {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
          <ClipLoader size={80} color="#f97316" loading={loading} />
        </div>
        <h1 className="mt-6 font-bold text-2xl text-orange-900">
          טוען נתונים...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg">
              <ShoppingCart className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                עריכת הזמנה
              </h1>
              <p className="text-gray-600 mt-1">עדכון פרטי ההזמנה</p>
            </div>
          </div>
        </div>

        {order && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            {/* Grid של שדות */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* מספר הזמנה */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-orange-100 p-1.5 rounded-lg">
                    <Hash className="w-4 h-4 text-orange-600" />
                  </div>
                  מספר הזמנה
                </label>
                <input
                  type="number"
                  value={orderNumber}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-600 font-medium cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* סכום */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-green-100 p-1.5 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  סכום
                </label>
                <input
                  type="number"
                  value={sum}
                  onChange={(e) => setSum(e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl font-medium focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                  placeholder="הזן סכום"
                />
              </div>

              {/* סטטוס */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  סטטוס הזמנה
                </label>
                <select
                  onChange={(e) => setStatus(e.target.value)}
                  value={status}
                  className="w-full px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl font-medium focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                >
                  <option value="הוגש">הוגש</option>
                  <option value="בעיבוד">בעיבוד</option>
                  <option value="לא הוגש">לא הוגש</option>
                </select>
              </div>

              {/* שם מזמין */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-purple-100 p-1.5 rounded-lg">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  שם מזמין
                </label>
                <input
                  type="text"
                  value={invitingName}
                  onChange={(e) => setInvitingName(e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl font-medium focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="הזן שם מזמין"
                />
              </div>

              {/* פרויקט */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                  </div>
                  שם פרויקט
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="הזן שם פרויקט"
                />
              </div>

              {/* איש קשר */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-teal-100 p-1.5 rounded-lg">
                    <Phone className="w-4 h-4 text-teal-600" />
                  </div>
                  איש קשר
                </label>
                <input
                  type="text"
                  value={Contact_person}
                  onChange={(e) => setContact_Person(e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl font-medium focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all"
                  placeholder="הזן שם איש קשר"
                />
              </div>
            </div>

            {/* פירוט */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                פירוט ההזמנה
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl font-medium focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all resize-none"
                placeholder="הזן פירוט מפורט של ההזמנה..."
              />
            </div>

            {/* העלאת קבצים */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <div className="bg-orange-100 p-1.5 rounded-lg">
                  <Upload className="w-4 h-4 text-orange-600" />
                </div>
                העלאת קבצים נוספים
              </label>

              <div className="relative">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl cursor-pointer hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                >
                  <Upload className="w-5 h-5" />
                  <span>בחר קבצים להעלאה</span>
                </label>
              </div>
            </div>

            {/* רשימת קבצים */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <div className="bg-blue-100 p-1.5 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                קבצים מצורפים ({files.length})
              </label>

              {files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl hover:border-orange-300 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold w-10 h-10 rounded-lg flex items-center justify-center shadow-md">
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          {renderFile(file)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all duration-200 font-medium group-hover:scale-105"
                      >
                        <X className="w-4 h-4" />
                        <span>הסר</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl border-2 border-dashed border-gray-300 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-600">
                    אין קבצים מצורפים
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    העלה קבצים כדי להוסיף אותם להזמנה
                  </p>
                </div>
              )}
            </div>

            {/* כפתורי פעולה */}
            <div className="flex gap-4 pt-6 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ClipLoader size={24} color="#ffffff" />
                    <span>מעדכן...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    <span>עדכן הזמנה</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/orders/${id}`)}
                disabled={loading}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-bold text-lg disabled:opacity-50"
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
