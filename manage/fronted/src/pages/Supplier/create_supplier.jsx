import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import BankSelector from "../../Components/BankSelector";
import banksData from "../../../public/data/banks_and_branches.json";

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
    },
  });
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setBanks(banksData); // מגדיר את הבנקים ישירות
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

  // כשמשתמש בוחר בנק, נעדכן גם את סניף מתוך הבחירה
  const handleBankSelect = (bankName) => {
    const selectedBank = banks.find((bank) => bank.name === bankName);
    if (selectedBank) {
      setSupplier((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          bankName: selectedBank.name,
          branchNumber: selectedBank.branchNumber, // קח את הסניף מתוך הבנק שנבחר
        },
      }));
    } else {
      // ניקוי אם בוטל הבחירה
      setSupplier((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          bankName: "",
          branchNumber: "",
        },
      }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      "name",
      "business_tax",
      "phone",
    ];
    const requiredBankFields = ["bankName", "branchNumber", "accountNumber"];

    for (let field of requiredFields) {
      if (!supplier[field]) {
        toast.error(`יש למלא את השדה: ${getFieldName(field)}`, {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }
    for (let field of requiredBankFields) {
      if (!supplier.bankDetails[field]) {
        toast.error(`יש למלא את השדה: ${getBankFieldName(field)}`, {
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

  const getBankFieldName = (field) =>
    ({
      bankName: "שם הבנק",
      branchNumber: "מספר סניף",
      accountNumber: "מספר חשבון",
    }[field] || field);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.post("/suppliers/createSupplier", supplier);
      toast.success("הספק נוצר בהצלחה!", {
        className: "sonner-toast success rtl",
      });
      navigate("/suppliers");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "שגיאה ביצירת הספק";
      toast.error(errorMessage, { className: "sonner-toast error rtl" });
    } finally {
      setIsLoading(false);
    }
  };
  const branchOptions =
  supplier.bankDetails.bankObj?.branches?.map((branch) => ({
    value: branch.branchCode,
    label: `${branch.branchCode} - ${branch.city} - ${branch.address}`,
  })) || [];


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
                שם הספק:
              </label>
              <input
                type="text"
                value={supplier.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן שם הספק"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                מספר עוסק:
              </label>
              <input
                type="number"
                value={supplier.business_tax}
                onChange={(e) =>
                  handleInputChange("business_tax", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן מספר עוסק"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                טלפון:
              </label>
              <input
                type="tel"
                value={supplier.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                placeholder="הזן מספר טלפון"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                אימייל:
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
                כתובת:
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

        {/* פרטי בנק - כאן יש לנו דרופדאון לבחירת הבנק */}
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

        {/* דרופדאון לסניפים */}
        {supplier.bankDetails.bankObj &&
          supplier.bankDetails.bankObj.branches?.length > 0 && (
            <div className="space-y-2 mt-4">
              <label className="block text-slate-700 font-semibold">
                בחר סניף:
              </label>
              <select
                value={supplier.bankDetails.branchNumber}
                onChange={(e) =>
                  handleBankDetailsChange("branchNumber", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg"
              >
                <option value="">-- בחר סניף --</option>
                {supplier.bankDetails.bankObj.branches.map((branch) => (
                  <option key={branch.branchCode} value={branch.branchCode}>
                    {branch.branchCode} - {branch.city} - {branch.address}
                  </option>
                ))}
              </select>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-slate-700 font-semibold">
                  מספר חשבון:
                </label>
                <input
                  type="number"
                  value={supplier.bankDetails.accountNumber}
                  onChange={(e) =>
                    setSupplier((prev) => ({
                      ...prev,
                      bankDetails: {
                        ...prev.bankDetails,
                        accountNumber: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                  placeholder="הזן כתובת מלאה"
                  required
                />
              </div>{" "}
            </div>
          )}

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
            onClick={() => navigate("/supplier")}
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
