import { useState, useEffect } from "react";
import { X, FileText, Hash } from "lucide-react";
import api from "../api/api";

export default function DocumentTypeModal({ open, onClose, onSelect, fileName, showInvoiceNumber = false, currentInvoiceNumber = "" }) {
  const [documentNumber, setDocumentNumber] = useState("");
  const [loadingSerial, setLoadingSerial] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (open) {
      setDocumentNumber(currentInvoiceNumber || "");
      setSelectedType(null);
    }
  }, [open, currentInvoiceNumber]);

  if (!open) return null;

  const documentTypes = [
    "ח. עסקה",
    "ה. עבודה",
    "ד. תשלום",
    "חשבונית מס / קבלה",
    "משכורות",
    "אין צורך"
  ];

  const handleTypeClick = async (type) => {
    if (showInvoiceNumber) {
      setSelectedType(type);
      setDocumentNumber("");

      // מספר סידורי רק למסמכים מסוג "אין צורך"
      if (type === "אין צורך") {
        try {
          setLoadingSerial(true);
          const { data } = await api.get("/invoices/next-doc-serial/preview");
          if (data.success) {
            setDocumentNumber(data.serial);
          }
        } catch (err) {
          console.error("Error fetching serial:", err);
        } finally {
          setLoadingSerial(false);
        }
      }
    } else {
      onSelect(type);
    }
  };

  const handleConfirm = async () => {
    if (!selectedType) return;

    // רק "אין צורך" מקבל מספר סידורי אטומי
    if (selectedType === "אין צורך") {
      try {
        const { data } = await api.get("/invoices/next-doc-serial");
        if (data.success) {
          onSelect(selectedType, data.serial);
        } else {
          onSelect(selectedType, documentNumber);
        }
      } catch (err) {
        console.error("Error reserving serial:", err);
        onSelect(selectedType, documentNumber);
      }
    } else {
      // סוגים אחרים – בלי מספר סידורי
      onSelect(selectedType);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
              <FileText className="text-orange-600" size={24} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900">
              בחר סוג מסמך
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {fileName && (
          <div className="mb-4 p-3 bg-orange-50 rounded-xl border-2 border-orange-200">
            <span className="text-sm text-slate-600">קובץ: </span>
            <span className="font-bold text-orange-700">{fileName}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-2">
          {documentTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeClick(type)}
              className={`w-full text-right px-5 py-3 rounded-xl border-2 transition-all font-medium ${
                selectedType === type
                  ? "bg-orange-100 border-orange-400 text-orange-800"
                  : "bg-gradient-to-r from-slate-50 to-slate-100 hover:from-orange-50 hover:to-amber-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* שדה מספר מסמך - מוצג רק עבור "אין צורך" */}
        {showInvoiceNumber && selectedType === "אין צורך" && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Hash className="w-4 h-4 text-orange-600" />
              מספר מסמך (סידורי)
            </label>
            {loadingSerial ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                מחשב מספר סידורי...
              </div>
            ) : (
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="הזן מספר מסמך..."
                className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
              />
            )}
          </div>
        )}

        {showInvoiceNumber && selectedType && (
          <button
            onClick={handleConfirm}
            disabled={loadingSerial}
            className="mt-4 w-full px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-all font-bold disabled:opacity-50"
          >
            אישור
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full px-6 py-3 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all font-bold"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
