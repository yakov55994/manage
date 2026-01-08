import { useState, useEffect } from "react";
import { Search, Check, X, FileText } from "lucide-react";
import api from "../api/api";

/**
 * קומפוננטה לבחירת הזמנה
 * @param {String} value - ID הזמנה נבחרת
 * @param {Function} onSelect - callback לעדכון (מקבל את כל אובייקט ההזמנה או null)
 * @param {Boolean} allowClear - האם לאפשר ניקוי בחירה (default: false)
 * @param {String} label - כותרת השדה
 * @param {String} placeholder - placeholder לחיפוש
 */
export default function InvoiceSelector({
  value,
  onSelect,
  allowClear = false,
  label = "בחר הזמנה",
  placeholder = "חפש הזמנה לפי מספר או פרטים...",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // טען הזמנות
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/invoices");
      setInvoices(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // סינון חשבוניות לפי חיפוש
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.invitingName?.toLowerCase().includes(q) ||
      inv.detail?.toLowerCase().includes(q) ||
      inv.projects?.some(p => p.projectName?.toLowerCase().includes(q))
    );
  });

  // מציאת ההזמנה הנבחרת
  const selectedInvoice = value
    ? invoices.find(inv => inv._id === value)
    : null;

  // טיפול בבחירת הזמנה
  const handleSelect = (invoice) => {
    if (invoice._id === value) {
      // ביטול בחירה
      onSelect?.(null);
    } else {
      // בחירת הזמנה
      onSelect?.(invoice);
    }
  };

  // ניקוי בחירה
  const handleClear = () => {
    onSelect?.(null);
  };

  // פורמט תאריך
  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("he-IL");
  };

  return (
    <div className="w-full">
      {/* כותרת */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold text-slate-700">
          {label}
        </label>
        {allowClear && value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <X className="w-3 h-3" />
            נקה
          </button>
        )}
      </div>

      {/* הצגת הזמנה נבחרת */}
      {selectedInvoice && (
        <div className="mb-2 p-3 bg-orange-100 border-2 border-orange-300 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-700" />
              <div>
                <span className="text-sm font-bold text-orange-900">
                  חשבונית #{selectedInvoice.invoiceNumber}
                </span>
                {selectedInvoice.invitingName && (
                  <span className="text-xs text-orange-700 mr-2">
                    ({selectedInvoice.invitingName})
                  </span>
                )}
              </div>
            </div>
            {allowClear && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-orange-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-orange-700" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* מיכל הבחירה */}
      <div className="relative bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl shadow-lg overflow-hidden">
        {/* אזור עליון - חיפוש */}
        <div className="p-4 border-b-2 border-orange-100 bg-white/50">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all text-right"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-5 h-5" />
          </div>
        </div>

        {/* רשימת הזמנות */}
        <div className="p-5 max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p>טוען הזמנות...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center text-gray-400 p-6">
              {searchTerm ? "לא נמצאו הזמנות התואמות לחיפוש" : "אין הזמנות זמינות"}
            </div>
          ) : (
            filteredInvoices.map((invoice) => {
              const selected = invoice._id === value;

              return (
                <label
                  key={invoice._id}
                  className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all border-2
                    ${
                      selected
                        ? "bg-orange-100 border-orange-300 shadow-md"
                        : "bg-white border-orange-100 hover:bg-orange-50 hover:border-orange-200"
                    }
                  `}
                >
                  {/* Radio */}
                  <div className="relative w-5 h-5 flex-shrink-0 mt-1">
                    <input
                      type="radio"
                      checked={selected}
                      onChange={() => handleSelect(invoice)}
                      className="w-5 h-5 accent-orange-500 cursor-pointer"
                    />
                    {selected && (
                      <Check className="absolute inset-0 w-5 h-5 text-orange-600 pointer-events-none" />
                    )}
                  </div>

                  {/* פרטי החשבונית */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span
                        className={`font-bold text-sm ${
                          selected ? "text-orange-900" : "text-slate-700"
                        }`}
                      >
                        חשבונית #{invoice.invoiceNumber}
                      </span>

                      {/* סטטוס תשלום */}
                      {invoice.paid && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            invoice.paid === "כן"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : invoice.paid === "יצא לתשלום"
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          {invoice.paid}
                        </span>
                      )}
                    </div>

                    {/* שם מזמין */}
                    {invoice.invitingName && (
                      <div className="text-xs text-slate-600 mb-1">
                        <span className="font-medium">מזמין:</span> {invoice.invitingName}
                      </div>
                    )}

                    {/* פרטים */}
                    {invoice.detail && (
                      <div className="text-xs text-slate-500 mb-1">
                        {invoice.detail}
                      </div>
                    )}

                    {/* פרויקטים */}
                    {invoice.projects && invoice.projects.length > 0 && (
                      <div className="text-xs text-slate-500 mt-2">
                        <span className="font-medium">פרויקטים:</span>{" "}
                        {invoice.projects.map(p => p.projectName).join(", ")}
                      </div>
                    )}

                    {/* תאריך יצירה */}
                    {invoice.createdAt && (
                      <div className="text-xs text-slate-400 mt-1">
                        תאריך יצירה: {formatDate(invoice.createdAt)}
                      </div>
                    )}
                  </div>

                  {/* סכום */}
                  <div className="text-left">
                    <span className="font-bold text-orange-700 text-sm">
                      ₪{invoice.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
