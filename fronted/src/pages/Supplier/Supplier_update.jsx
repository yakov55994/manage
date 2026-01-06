import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import {
  UserCog,
  Save,
  ArrowRight,
  User,
  Hash,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import banksData from "../../../public/data/banks_and_branches.json";
import Select from "react-select";
import BankSelector from "../../Components/BankSelector";

const SupplierEditPage = () => {
  const [supplier, setSupplier] = useState({
    name: "",
    business_tax: "",
    address: "",
    phone: "",
    email: "",
    supplierType: "", // 🆕 הוסף את זה!

    bankDetails: {
      bankName: "",
      branchNumber: "",
      accountNumber: "",
      bankObj: null,
    },
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setBanks(banksData);
  }, []);

  useEffect(() => {
    const fetchSupplier = async () => {
      setInitialLoading(true);
      try {
        const response = await api.get(`/suppliers/${id}`);
        const supplierData = response.data.data;

        const bankObj = banksData.find(
          (b) => b.bankName === supplierData.bankDetails?.bankName
        );

        setSupplier({
          name: supplierData.name || "",
          business_tax: supplierData.business_tax || "",
          address: supplierData.address || "",
          phone: supplierData.phone || "",
          email: supplierData.email || "",
          supplierType: supplierData.supplierType || "", // 🆕 הוסף

          bankDetails: {
            bankName: supplierData.bankDetails?.bankName || "",
            bankObj: bankObj || null,
            branchNumber: supplierData.bankDetails?.branchNumber || "",
            accountNumber: supplierData.bankDetails?.accountNumber || "",
          },
        });
      } catch (error) {
        console.error("Error fetching supplier:", error);
        toast.error("שגיאה בטעינת פרטי הספק", {
          className: "sonner-toast error rtl",
        });
        navigate("/suppliers");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSupplier();
  }, [id, navigate]);

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
    const requiredFields = ["name", "business_tax", "supplierType"];

    for (let field of requiredFields) {
      if (!supplier[field] || supplier[field].toString().trim() === "") {
        toast.error(`יש למלא את השדה: ${getFieldName(field)}`, {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }

    if (supplier.email && supplier.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplier.email)) {
        toast.error("אימייל לא תקין", {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }

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

  const getFieldName = (field) => {
    const fieldNames = {
      name: "שם הספק",
      business_tax: "מספר עוסק",
      address: "כתובת",
      email: "אימייל",
      supplierType: "סוג ספק", // 🆕 הוסף
    };
    return fieldNames[field] || field;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const supplierData = {
        name: supplier.name.trim(),
        business_tax: supplier.business_tax.trim(),
        phone: supplier.phone.trim() || "",
        address: supplier.address?.trim() || undefined,
        email: supplier.email?.trim() || undefined,
        supplierType: supplier.supplierType, // 🆕 הוסף
      };

      const { bankName, branchNumber, accountNumber } = supplier.bankDetails;
      if (bankName && branchNumber && accountNumber) {
        supplierData.bankDetails = {
          bankName: bankName.trim(),
          branchNumber: branchNumber.trim(),
          accountNumber: accountNumber.trim(),
        };
      }

      await api.put(`/suppliers/${id}`, supplierData);

      toast.success("הספק עודכן בהצלחה!", {
        className: "sonner-toast success rtl",
      });

      navigate(`/suppliers/${id}`);
    } catch (error) {
      console.error("Update error:", error.response?.data);
      const errorMessage = error.response?.data?.message || "שגיאה בעדכון הספק";
      toast.error(errorMessage, {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
          <ClipLoader size={80} color="#f97316" loading={initialLoading} />
        </div>
        <h1 className="mt-6 font-bold text-2xl text-orange-900">
          טוען פרטי ספק...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg">
              <UserCog className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
            </div>
            <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-bold text-gray-900">עריכת ספק</h1>
          </div>
          <div className="h-1 w-32 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mx-auto"></div>
        </div>

        {/* כפתור חזרה */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <button
            onClick={() => navigate(`/suppliers/${id}`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזור לפרטי הספק</span>
          </button>
        </div>

        {/* טופס עריכה */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-4 sm:p-4 sm:p-5 md:p-6 md:p-8"
        >
          {/* פרטי ספק עיקריים */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-5 md:mb-6 pb-4 border-b-2 border-gradient-to-r from-orange-200 to-amber-200">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg shadow-md">
                <User className="text-white w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">פרטי הספק</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 sm:p-5 md:p-6">
              {/* שם הספק */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-orange-100 p-1.5 rounded-lg">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  שם הספק
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplier.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl font-medium focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="הזן שם ספק"
                />
              </div>

              {/* מספר עוסק */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Hash className="w-4 h-4 text-blue-600" />
                  </div>
                  מספר עוסק
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplier.business_tax}
                  onChange={(e) =>
                    handleInputChange("business_tax", e.target.value)
                  }
                  className="w-full px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl font-medium focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="הזן מספר עוסק"
                />
              </div>

              {/* טלפון */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-green-100 p-1.5 rounded-lg">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  טלפון
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={supplier.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl font-medium focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
                  placeholder="הזן מספר טלפון"
                />
              </div>

              {/* אימייל */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-purple-100 p-1.5 rounded-lg">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  אימייל
                </label>
                <input
                  type="email"
                  value={supplier.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl font-medium focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="הזן כתובת אימייל"
                />
              </div>

              {/* 🆕 סוג ספק */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-amber-100 p-1.5 rounded-lg">
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  סוג ספק
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={supplier.supplierType}
                  onChange={(e) =>
                    handleInputChange("supplierType", e.target.value)
                  }
                  className="w-full px-4 py-3 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl font-medium focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  required
                >
                  <option value="">-- בחר סוג ספק --</option>
                  <option value="invoices">חשבוניות בלבד</option>
                  <option value="orders">הזמנות בלבד</option>
                  <option value="both">שניהם</option>
                </select>
              </div>

              {/* כתובת */}
              <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                  </div>
                  כתובת
                </label>
                <input
                  type="text"
                  value={supplier.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full px-4 py-3 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="הזן כתובת מלאה"
                />
              </div>
            </div>
          </div>

          {/* פרטי בנק */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-5 md:mb-6 pb-4 border-b-2 border-gradient-to-r from-orange-200 to-amber-200">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg shadow-md">
                <Building2 className="text-white w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                פרטי חשבון בנק
              </h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                אופציונלי
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 md:p-6 rounded-xl border-2 border-amber-200 mb-4 sm:mb-5 md:mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 font-medium">
                  פרטי הבנק הם אופציונליים. אם תבחר למלא - יש למלא את כל השדות
                  (בנק, סניף ומספר חשבון).
                </p>
              </div>
            </div>

            {/* בחירת בנק */}
            <div className="mb-4 sm:mb-5 md:mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <div className="bg-teal-100 p-1.5 rounded-lg">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                בחר בנק
              </label>
              <div className="relative">
                <BankSelector
                  banks={banks}
                  selectedBank={supplier.bankDetails.bankObj}
                  onChange={(bank) => {
                    handleBankDetailsChange("bankName", bank?.bankName || "");
                    handleBankDetailsChange("bankObj", bank || null);
                    handleBankDetailsChange("branchNumber", "");
                  }}
                  placeholder="בחר בנק מהרשימה"
                />
              </div>
            </div>

            {/* דרופדאון סניפים */}
            {supplier.bankDetails.bankObj?.branches?.length > 0 && (
              <div className="mb-4 sm:mb-5 md:mb-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <div className="bg-cyan-100 p-1.5 rounded-lg">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                  </div>
                  בחר סניף
                </label>
                <Select
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      fontWeight: "500",
                      fontSize: "15px",
                      padding: "6px",
                      borderRadius: "0.75rem",
                      border: state.isFocused
                        ? "2px solid #06b6d4"
                        : "2px solid #a5f3fc",
                      background:
                        "linear-gradient(to bottom right, #ecfeff, #cffafe)",
                      boxShadow: state.isFocused
                        ? "0 0 0 3px rgba(6, 182, 212, 0.1)"
                        : "none",
                      "&:hover": {
                        border: "2px solid #06b6d4",
                      },
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      fontWeight: "500",
                      fontSize: "15px",
                      backgroundColor: state.isSelected
                        ? "#f97316"
                        : state.isFocused
                        ? "#fed7aa"
                        : "white",
                      color: state.isSelected ? "white" : "#1f2937",
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      fontWeight: "500",
                      fontSize: "15px",
                      color: "#9ca3af",
                    }),
                  }}
                  options={supplier.bankDetails.bankObj.branches.map(
                    (branch) => ({
                      value: branch.branchCode,
                      label: `${branch.branchCode} - ${branch.city} - ${branch.address}`,
                    })
                  )}
                  value={
                    supplier.bankDetails.branchNumber
                      ? {
                          value: supplier.bankDetails.branchNumber,
                          label: supplier.bankDetails.bankObj.branches.find(
                            (b) =>
                              b.branchCode === supplier.bankDetails.branchNumber
                          )
                            ? `${supplier.bankDetails.branchNumber} - ${
                                supplier.bankDetails.bankObj.branches.find(
                                  (b) =>
                                    b.branchCode ===
                                    supplier.bankDetails.branchNumber
                                ).city
                              } - ${
                                supplier.bankDetails.bankObj.branches.find(
                                  (b) =>
                                    b.branchCode ===
                                    supplier.bankDetails.branchNumber
                                ).address
                              }`
                            : supplier.bankDetails.branchNumber,
                        }
                      : null
                  }
                  onChange={(opt) =>
                    handleBankDetailsChange("branchNumber", opt?.value || "")
                  }
                  placeholder="בחר סניף מהרשימה"
                  isSearchable
                  isClearable
                />
              </div>
            )}

            {/* שדה חשבון */}
            {supplier.bankDetails.bankName && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="bg-emerald-100 p-1.5 rounded-lg">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  מספר חשבון
                </label>
                <input
                  type="text"
                  value={supplier.bankDetails.accountNumber}
                  onChange={(e) =>
                    handleBankDetailsChange("accountNumber", e.target.value)
                  }
                  className="w-full px-4 py-3 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl font-medium focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
                  placeholder="הזן מספר חשבון"
                />
              </div>
            )}
          </div>

          {/* כפתורי פעולה */}
          <div className="flex gap-3 sm:gap-4 pt-6 border-t-2 border-gray-200">
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
                  <span>עדכן ספק</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/suppliers/${id}`)}
              disabled={loading}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-6 h-6" />
              <span>ביטול</span>
            </button>
          </div>

          {/* הערת שדות חובה */}
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 text-gray-500" />
            <span>
              שדות המסומנים ב-<span className="text-red-500 font-bold">*</span>{" "}
              הם שדות חובה
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierEditPage;
