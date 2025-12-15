import { X, FileText } from "lucide-react";

export default function DocumentTypeModal({ open, onClose, onSelect, fileName }) {
  if (!open) return null;

  const documentTypes = [
    "חשבונית",
    "אישור העברה",
    "תעודת משלוח",
    "חוזה",
    "הזמנת רכש",
    "אחר"
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="text-slate-700" size={24} />
            <h3 className="text-2xl font-bold text-slate-800">
              בחר סוג מסמך
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X size={22} />
          </button>
        </div>

        {fileName && (
          <div className="mb-4 text-slate-600 text-sm">
            קובץ: <span className="font-bold">{fileName}</span>
          </div>
        )}

        <div className="space-y-2">
          {documentTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                onSelect(type);
                onClose();
              }}
              className="w-full text-right px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors font-medium text-slate-700 hover:text-slate-900"
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors font-bold"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
