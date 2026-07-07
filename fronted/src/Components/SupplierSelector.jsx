import { useState, useEffect } from "react";
import { ChevronDown, User, Mail, X } from "lucide-react";
import api from "../api/api.js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SupplierSelector = ({
  projectId,
  value,
  onSelect,
  onAddNew,
  label = "בחר ספק",
  placeholder = "חפש או בחר ספק...",
  required = false,
  className = "",
  disabled = false,
  supplierType = "both", // 🆕 ברירת מחדל - כולם
  returnTo = "create-invoice", // 🆕 ברירת מחדל
}) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const navigate = useNavigate();

  // State for email update modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [pendingSupplier, setPendingSupplier] = useState(null);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // 🔄 טעינת ספקים עם סינון לפי supplierType
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);

        // 🆕 בנה את ה-URL עם query parameters
        let url = `/suppliers`;
        const params = new URLSearchParams();

        if (projectId) {
          params.append("projectId", projectId);
        }

        // 🆕 הוסף סינון לפי סוג ספק
        if (supplierType && supplierType !== "both") {
          params.append("type", supplierType);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await api.get(url);
        setSuppliers(res?.data?.data || []);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("שגיאה בטעינת רשימת ספקים", {
          className: "sonner-toast error rtl",
        });
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [projectId, supplierType]); // 🆕 הוסף supplierType לתלויות

  // עדכון הספק הנבחר כשמשנים את value מבחוץ
  useEffect(() => {
    if (value && suppliers.length > 0) {
      const supplier =
        suppliers.find((s) => s?._id === value) ||
        suppliers.find((s) => s?.name === value) ||
        null;
      setSelectedSupplier(supplier);
    } else {
      setSelectedSupplier(null);
    }
  }, [value, suppliers]);

  // 🆕 זיהוי ספק חדש מה-query string
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const newSupplierId = params.get('newSupplierId');
  
  if (newSupplierId && suppliers.length > 0) {
    const newSupplier = suppliers.find(s => s._id === newSupplierId);
    if (newSupplier) {
      handleSupplierSelect(newSupplier);
      // נקה את ה-URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}, [suppliers]);
  // סינון ספקים לפי חיפוש - מסתיר ספקים לא פעילים (מלבד הספק שכבר נבחר)
  const filteredSuppliers = (suppliers || []).filter((supplier) => {
    const isSelected =
      value && (supplier?._id === value || supplier?.name === value);
    if (supplier?.isActive === false && !isSelected) return false;

    const name = String(supplier?.name ?? "").toLowerCase();
    const email = String(supplier?.email ?? "").toLowerCase();
    const tax = String(supplier?.business_tax ?? "");
    const term = String(searchTerm ?? "").toLowerCase();
    return (
      name.includes(term) ||
      email.includes(term) ||
      tax.includes(String(searchTerm ?? ""))
    );
  });

  const handleSupplierSelect = (supplier) => {
    // Check if supplier has email
    if (!supplier.email || supplier.email.trim() === "") {
      // Show email update modal
      setPendingSupplier(supplier);
      setEmailInput("");
      setShowEmailModal(true);
      setIsOpen(false);
      return;
    }

    setSelectedSupplier(supplier);
    setIsOpen(false);
    setSearchTerm("");

    // שלח את הספק הנבחר להורה
    if (onSelect) {
      onSelect(supplier);
    }
  };

  // Handle email update
  const handleEmailUpdate = async () => {
    if (!pendingSupplier) return;

    if (emailInput && emailInput.trim()) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        toast.error("כתובת אימייל לא תקינה", {
          className: "sonner-toast error rtl",
        });
        return;
      }

      setUpdatingEmail(true);
      try {
        // Update supplier email via API
        await api.put(`/suppliers/${pendingSupplier._id}`, {
          email: emailInput.trim(),
        });

        // Update local suppliers list
        const updatedSupplier = { ...pendingSupplier, email: emailInput.trim() };
        setSuppliers((prev) =>
          prev.map((s) =>
            s._id === pendingSupplier._id ? updatedSupplier : s
          )
        );

        toast.success("כתובת האימייל עודכנה בהצלחה", {
          className: "sonner-toast success rtl",
        });

        // Select the supplier with updated email
        setSelectedSupplier(updatedSupplier);
        if (onSelect) {
          onSelect(updatedSupplier);
        }
      } catch (error) {
        console.error("Error updating supplier email:", error);
        toast.error("שגיאה בעדכון כתובת האימייל", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setUpdatingEmail(false);
      }
    } else {
      // User chose to continue without email
      setSelectedSupplier(pendingSupplier);
      if (onSelect) {
        onSelect(pendingSupplier);
      }
    }

    setShowEmailModal(false);
    setPendingSupplier(null);
    setEmailInput("");
    setSearchTerm("");
  };

  // Handle skip email update
  const handleSkipEmail = () => {
    if (pendingSupplier) {
      setSelectedSupplier(pendingSupplier);
      if (onSelect) {
        onSelect(pendingSupplier);
      }
    }
    setShowEmailModal(false);
    setPendingSupplier(null);
    setEmailInput("");
    setSearchTerm("");
  };

  const formatSupplierDisplay = (supplier) => {
    const name = supplier?.name ?? "ללא שם";
    const tax = supplier?.business_tax ?? "";
    return tax ? `${name} - ${tax}` : name;
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-m font-bold text-black mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer
            flex items-center justify-between font-bold
            ${
              disabled
                ? "bg-gray-100 cursor-not-allowed"
                : "hover:border-gray-400"
            }
            ${isOpen ? "ring-2 ring-blue-500" : ""}
            focus:outline-none focus:ring-2 focus:ring-blue-500
          `}
        >
          <div className="flex items-center">
            <User size={20} className="text-gray-500 ml-2" />
            <span className={selectedSupplier ? "text-black" : "text-gray-500"}>
              {selectedSupplier
                ? formatSupplierDisplay(selectedSupplier)
                : placeholder}
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* רשימת ספקים */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-visible">
            {/* שדה חיפוש */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="חפש ספק..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* רשימה */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  טוען ספקים...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? "לא נמצאו ספקים מתאימים" : "אין ספקים זמינים"}
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier._id}
                    onClick={() => handleSupplierSelect(supplier)}
                    className={`p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0
          ${selectedSupplier?._id === supplier._id ? "bg-blue-100" : ""}
        `}
                  >
                    <div className="font-bold text-black">
                      {formatSupplierDisplay(supplier)}
                    </div>
                    {(supplier.email || supplier.phone) && (
                      <div className="text-sm text-gray-600 mt-1">
                        {supplier.email}{" "}
                        {supplier.email && supplier.phone && "•"}{" "}
                        {supplier.phone}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* ➕ צור ספק חדש — תמיד מופיע */}
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => {
                  setIsOpen(false);
    navigate(`/create-supplier?returnTo=${returnTo}`);
                }}
                className="mt-2 rounded-2xl p-2 cursor-pointer bg-slate-200 font-bold text-center hover:bg-slate-300 
     border-t border-gray-200"
              >
                ➕ צור ספק חדש
              </div>

              {/* כפתור סגירה */}
              <div
                className="mt-2 rounded-2xl p-1 cursor-pointer bg-slate-200 font-bold text-center hover:bg-slate-300 
     border-t border-gray-200"
              >
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full p-2 text-sm transition-colors"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* רקע לסגירה */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Email Update Modal */}
      {showEmailModal && pendingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Mail className="text-orange-600" size={20} />
                <h3 className="text-xl font-bold text-slate-800">
                  עדכון כתובת אימייל
                </h3>
              </div>
              <button
                onClick={handleSkipEmail}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="mb-4 text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="font-medium text-amber-800 mb-1">
                  לספק "{pendingSupplier.name}" אין כתובת אימייל
                </p>
                <p className="text-xs text-amber-700">
                  האם ברצונך להוסיף כתובת אימייל עכשיו?
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  כתובת אימייל
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="הזן כתובת אימייל..."
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-2xl">
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleSkipEmail}
                  disabled={updatingEmail}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  המשך בלי אימייל
                </button>
                <button
                  onClick={handleEmailUpdate}
                  disabled={updatingEmail || !emailInput.trim()}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-sm"
                >
                  {updatingEmail ? "מעדכן..." : "עדכן ובחר"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSelector;
