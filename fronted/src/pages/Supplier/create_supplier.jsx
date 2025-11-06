import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import BankSelector from "../../Components/BankSelector";
import Select from 'react-select'; // הוסף את זה
import banksData from "../../../public/data/banks_and_branches.json";
import { useLocation } from "react-router-dom";



const CreateSupplier = () => {
  const [supplier, setSupplier] = useState({
    name: "",
    business_tax: "",
    address: "",
    phone: "",
    email: "",
    bankDetails: {
      bankName: "",
      branchNumber: "",
      accountNumber: "",
      bankObj: null, // עזר לUI בלבד
    },
  });
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


const location = useLocation();
const params = new URLSearchParams(location.search);
const returnTo = params.get("returnTo") || "/create-invoice";


  useEffect(() => {
    setBanks(banksData);
  }, []);

  const handleInputChange = (field, value) => {
    setSupplier((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBankDetailsChange = (field, value) => {
    setSupplier((prev) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value,
      },
    }));
  };

  const validateForm = () => {  
    const requiredFields = ["name", "business_tax", "phone"];

    for (let field of requiredFields) {
        if (field === "phone") continue;
      if (!supplier[field]) {
        toast.error(`יש למלא את השדה: ${getFieldName(field)}`, {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }

    // בדיקת תקינות אימייל רק אם הוכנס אימייל
    if (supplier.email && supplier.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplier.email)) {
        toast.error("אימייל לא תקין", { className: "sonner-toast error rtl" });
        return false;
      }
    }

    // בדיקה שאם יש פרטי בנק חלקיים - דורש הכל
    const { bankName, branchNumber, accountNumber } = supplier.bankDetails;
    const hasBankInfo = bankName || branchNumber || accountNumber;
    
    if (hasBankInfo) {
      if (!bankName || !branchNumber || !accountNumber) {
        toast.error("אם מזינים פרטי בנק, יש למלא את כל השדות", {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }

    return true;
  };

  const getFieldName = (field) =>
    ({
      name: "שם הספק",
      business_tax: "מספר עוסק",
      address: "כתובת",
      phone: "טלפון",
      email: "אימייל",
    }[field] || field);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

     setIsLoading(true);
  try {
    const supplierData = {
      name: supplier.name.trim(),
      business_tax: supplier.business_tax.trim(),
      phone: supplier.phone.trim(),
      address: supplier.address?.trim() || undefined,
      email: supplier.email?.trim() || undefined,
    };

    const { bankName, branchNumber, accountNumber } = supplier.bankDetails;
    if (bankName && branchNumber && accountNumber) {
      supplierData.bankDetails = {
        bankName: bankName.trim(),
        branchNumber: branchNumber.trim(),
        accountNumber: accountNumber.trim(),
      };
    }

    console.log("Sending data:", supplierData);

   const res = await api.post("/suppliers/createSupplier", supplierData);

    toast.success("הספק נוצר בהצלחה!", {
      className: "sonner-toast success rtl",
    });

   // אם השרת מחזיר את הספק שנוצר:
   if (res?.data?.supplier) {
     sessionStorage.setItem("createdSupplier", JSON.stringify(res.data.supplier));
   }
   // חוזרים למסך שקרא לנו (ברירת מחדל: /create-invoice)
   navigate(returnTo);
  }
 catch (err) {
      console.error("Error details:", err.response?.data); // לדיבוג
      const errorMessage = err.response?.data?.message || "שגיאה ביצירת הספק";
      toast.error(errorMessage, { className: "sonner-toast error rtl" });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="mt-10 bg-gray-300 p-8 rounded-lg shadow-xl w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-center space-x-3 mb-8">
        <UserPlus className="text-slate-800 ml-4 mt-2 size-8" />
        <h1 className="text-4xl font-bold text-center text-slate-800 drop-shadow-lg">
          יצירת ספק חדש
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* פרטי ספק עיקריים */}
        <div className="bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-slate-700 mb-6 border-b-2 border-slate-200 pb-2">
            פרטי הספק
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                שם הספק <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplier.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן שם הספק"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                מספר עוסק <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplier.business_tax}
                onChange={(e) =>
                  handleInputChange("business_tax", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן מספר עוסק"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                טלפון <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={supplier.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן מספר טלפון"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                אימייל
              </label>
              <input
                type="email"
                value={supplier.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן כתובת אימייל"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-slate-700 font-semibold">
                כתובת
              </label>
              <input
                type="text"
                value={supplier.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן כתובת מלאה"
              />
            </div>
          </div>
        </div>

        {/* פרטי בנק - אופציונלי */}
        <div className="bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-slate-700 mb-6 border-b-2 border-slate-200 pb-2">
            פרטי בנק (אופציונלי)
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">בנק:</label>
              <BankSelector
                banks={banks}
                selectedBank={supplier.bankDetails.bankObj}
                onChange={(selectedBank) => {
                  handleBankDetailsChange("bankName", selectedBank?.bankName || "");
                  handleBankDetailsChange("bankObj", selectedBank);
                  handleBankDetailsChange("branchNumber", ""); // אפס סניף אם שונה הבנק
                }}
                placeholder="בחר בנק"
              />
            </div>

            {/* החלף את ה-select ב-Select של react-select */}
            {supplier.bankDetails.bankObj &&
              supplier.bankDetails.bankObj.branches?.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-slate-700 font-semibold">
                    בחר סניף:
                  </label>
                  <Select
                    options={supplier.bankDetails.bankObj.branches.map(branch => ({
                      value: branch.branchCode,
                      label: `${branch.branchCode} - ${branch.city} - ${branch.address}`,
                      city: branch.city,
                      address: branch.address,
                      branchCode: branch.branchCode
                    }))}
                    value={
                      supplier.bankDetails.bankObj.branches
                        .map(branch => ({
                          value: branch.branchCode,
                          label: `${branch.branchCode} - ${branch.city} - ${branch.address}`
                        }))
                        .find(opt => opt.value === supplier.bankDetails.branchNumber) || null
                    }
                    onChange={(selected) =>
                      handleBankDetailsChange("branchNumber", selected?.value || "")
                    }
                    placeholder="-- בחר סניף או הקלד לחיפוש --"
                    isClearable
                    isSearchable={true}
                    filterOption={(option, inputValue) => {
                      if (!inputValue) return true;
                      const searchTerm = inputValue.toLowerCase();
                      return (
                        option.data.city.toLowerCase().includes(searchTerm) ||
                        option.data.address.toLowerCase().includes(searchTerm) ||
                        option.data.branchCode.toLowerCase().includes(searchTerm)
                      );
                    }}
                    styles={{
                      control: (provided) => ({ 
                        ...provided, 
                        minHeight: 48, // להתאים לגובה הקיים
                        padding: '4px',
                        borderWidth: '2px',
                        borderColor: '#e2e8f0', // border-slate-200
                        borderRadius: '8px', // rounded-lg
                        '&:focus-within': {
                          borderColor: '#64748b', // focus:ring-slate-500
                          boxShadow: '0 0 0 2px rgba(100, 116, 139, 0.2)'
                        }
                      }),
                      menu: (provided) => ({
                        ...provided,
                        maxHeight: 200,
                        overflowY: 'auto'
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        fontSize: '14px',
                        padding: '8px 12px',
                        backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
                        color: '#334155'
                      })
                    }}
                    noOptionsMessage={({ inputValue }) => 
                      inputValue ? `לא נמצאו סניפים עבור "${inputValue}"` : 'לא נמצאו סניפים'
                    }
                  />
                </div>
              )}

            {/* מספר חשבון */}
            {supplier.bankDetails.bankName && (
              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">
                  מספר חשבון:
                </label>
                <input
                  type="text"
                  value={supplier.bankDetails.accountNumber}
                  onChange={(e) =>
                    handleBankDetailsChange("accountNumber", e.target.value)
                  }
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                  placeholder="הזן מספר חשבון"
                />
              </div>
            )}
          </div>
        </div>

        {/* כפתורים */}
        <div className="flex justify-center gap-4 pt-6">
          <button
            type="submit"
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "יוצר ספק..." : "צור ספק"}
          </button>

          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="px-8 py-3 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-400 transition-colors shadow-lg hover:shadow-xl"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSupplier;