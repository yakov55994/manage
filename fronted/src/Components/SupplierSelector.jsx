import { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
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
  // סינון ספקים לפי חיפוש
  const filteredSuppliers = (suppliers || []).filter((supplier) => {
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
    setSelectedSupplier(supplier);
    setIsOpen(false);
    setSearchTerm("");

    // שלח את הספק הנבחר להורה
    if (onSelect) {
      onSelect(supplier);
    }
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
    </div>
  );
};

export default SupplierSelector;
