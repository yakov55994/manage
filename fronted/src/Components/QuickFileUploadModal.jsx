import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Upload, X, FileText, Paperclip, Hash } from "lucide-react";
import api from "../api/api.js";

const documentTypes = [
  "ח. עסקה",
  "ה. עבודה",
  "ד. תשלום",
  "חשבונית מס / קבלה",
  "משכורות",
  "אין צורך",
];

export default function QuickFileUploadModal({
  open,
  onClose,
  invoice,
  onSuccess,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("");
  const [startingSerial, setStartingSerial] = useState("");
  const [loadingSerial, setLoadingSerial] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // שליפת מספר סידורי רק כשנבחר "אין צורך"
  useEffect(() => {
    if (documentType === "אין צורך") {
      fetchPreviewSerial();
    } else {
      setStartingSerial("");
    }
  }, [documentType]);

  const fetchPreviewSerial = async () => {
    try {
      setLoadingSerial(true);
      const { data } = await api.get("/invoices/next-doc-serial/preview");
      if (data.success) {
        setStartingSerial(data.serial);
      }
    } catch (err) {
      console.error("Error fetching serial:", err);
    } finally {
      setLoadingSerial(false);
    }
  };

  if (!open || !invoice) return null;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = null;
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // חישוב מספר סידורי לכל קובץ
  const getSerialForFile = (index) => {
    const base = parseInt(startingSerial, 10);
    if (isNaN(base)) return startingSerial;
    return String(base + index).padStart(4, "0");
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return toast.error("יש לבחור לפחות קובץ אחד", {
        className: "sonner-toast error rtl",
      });
    }

    if (!documentType) {
      return toast.error("יש לבחור סוג מסמך", {
        className: "sonner-toast error rtl",
      });
    }

    setUploading(true);
    try {
      // הקצאת מספרים סידוריים רק עבור "אין צורך"
      let reservedSerials = [];
      if (documentType === "אין צורך") {
        const { data: serialData } = await api.get(
          `/invoices/next-doc-serial?count=${selectedFiles.length}`
        );
        reservedSerials = serialData.serials || [serialData.serial];
      }

      const uploadedFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "invoices");

        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploadedFiles.push({
          name: file.name,
          url: res.data.file.url,
          type: file.type,
          size: file.size,
          publicId: res.data.file.publicId,
          resourceType: res.data.file.resourceType,
          documentType: documentType,
          documentNumber: reservedSerials[i] || "",
        });
      }

      await api.put(`/invoices/${invoice._id}/files`, {
        files: uploadedFiles,
      });

      toast.success(
        `${uploadedFiles.length} ${uploadedFiles.length === 1 ? "קובץ הועלה" : "קבצים הועלו"} בהצלחה`,
        { className: "sonner-toast success rtl" }
      );
      setSelectedFiles([]);
      setDocumentType("");
      setStartingSerial("");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהעלאת קבצים", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setDocumentType("");
    setStartingSerial("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Paperclip className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">
                העלאת קבצים לחשבונית
              </h2>
              <p className="text-sm text-orange-100">
                חשבונית #{invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Document Type */}
          <div>
            <label className="block font-bold mb-2 text-slate-700">
              סוג מסמך <span className="text-red-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">בחר סוג מסמך...</option>
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Document Number – רק עבור "אין צורך" */}
          {documentType === "אין צורך" && (
            <div>
              <label className="flex items-center gap-2 font-bold mb-2 text-slate-700">
                <Hash className="w-4 h-4 text-orange-600" />
                מספר מסמך (סידורי)
              </label>
              {loadingSerial ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 p-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                  מחשב מספר סידורי...
                </div>
              ) : (
                <input
                  type="text"
                  value={startingSerial}
                  onChange={(e) => setStartingSerial(e.target.value)}
                  placeholder="מספר סידורי..."
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              )}
              {selectedFiles.length > 1 && startingSerial && (
                <p className="text-xs text-slate-500 mt-1">
                  הקבצים יקבלו מספרים: {getSerialForFile(0)} עד {getSerialForFile(selectedFiles.length - 1)}
                </p>
              )}
            </div>
          )}

          {/* File Selection */}
          <div>
            <label className="block font-bold mb-2 text-slate-700">
              בחירת קבצים
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all"
            >
              <Upload className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                לחץ לבחירת קבצים
              </p>
              <p className="text-xs text-slate-400 mt-1">
                ניתן לבחור מספר קבצים
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="block font-bold text-slate-700">
                קבצים שנבחרו ({selectedFiles.length})
              </label>
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">
                      {file.name}
                    </span>
                    {documentType === "אין צורך" && startingSerial && (
                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full flex-shrink-0">
                        #{getSerialForFile(index)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-bold flex-shrink-0 mr-2"
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                "מעלה..."
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  העלה קבצים
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
