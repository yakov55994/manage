import { X, FileText } from "lucide-react";

export default function DocumentTypeModal({ open, onClose, onSelect, fileName }) {
  if (!open) return null;

  const documentTypes = [
    "הזמנת עבודה",
    "חשבונית מס/קבלה",
    "חשבונית מס - קבלה",
    "חשבונית מס קבלה",
    "אישור ביצוע",
    "קבלה",
    "חשבונית",
    "חשבונית עסקה",
    "חשבונית זיכוי",
    "הזמנת רכש",
    "אישור העברה",
    "תעודת משלוח",
    "חוזה",
    "אין צורך",
    "אחר"
  ];

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
              onClick={() => onSelect(type)}
              className="w-full text-right px-5 py-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 hover:from-orange-50 hover:to-amber-50 border-2 border-slate-200 hover:border-orange-300 transition-all font-medium text-slate-700 hover:text-orange-700"
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-6 py-3 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all font-bold"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
