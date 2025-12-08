import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api.js";
import { toast } from "sonner";
import {
  UserPlus,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Sparkles,
  Save,
  FileText,
  User,
  Hash,
  Landmark,
} from "lucide-react";
import BankSelector from "../../Components/BankSelector";
import Select from "react-select";
import banksData from "../../../public/data/banks_and_branches.json";

const CreateSupplier = () => {
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
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const rawReturnTo = params.get("returnTo");
  const returnTo = rawReturnTo
    ? rawReturnTo.startsWith("/")
      ? rawReturnTo
      : `/${rawReturnTo}`
    : "/suppliers";
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
    const requiredFields = ["name", "business_tax", "phone", "supplierType"];

    for (let field of requiredFields) {
      if (field === "phone") continue;
      if (!supplier[field]) {
        toast.error(`יש למלא את השדה: ${getFieldName(field)}`, {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }

    if (supplier.email && supplier.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplier.email)) {
        toast.error("אימייל לא תקין", { className: "sonner-toast error rtl" });
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

  const getFieldName = (field) =>
    ({
      name: "שם הספק",
      business_tax: "מספר עוסק",
      address: "כתובת",
      phone: "טלפון",
      email: "אימייל",
      supplierType: "סוג ספק", // 🆕 הוסף
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
        supplierType: supplier.supplierType, // 🆕 הוסף את זה!
      };

      const { bankName, branchNumber, accountNumber } = supplier.bankDetails;
      if (bankName && branchNumber && accountNumber) {
        supplierData.bankDetails = {
          bankName: bankName.trim(),
          branchNumber: branchNumber.trim(),
          accountNumber: accountNumber.trim(),
        };
      }

      const res = await api.post("/suppliers", supplierData);
      const createdSupplier = res.data.data || res.data;

      // ✅ שמור את ה-ID של הספק החדש ב-localStorage
      localStorage.setItem("newSupplierId", createdSupplier._id);

      toast.success("הספק נוצר בהצלחה!", {
        className: "sonner-toast success rtl",
      });
      const params = new URLSearchParams(location.search);
      const returnTo = params.get("returnTo");

      if (returnTo === "create-invoice") {
        navigate("/create-invoice", { state: { newSupplier: res.data.data } });
      } else {
        navigate("/suppliers");
      }

      if (res?.data?.supplier) {
        sessionStorage.setItem(
          "createdSupplier",
          JSON.stringify(res.data.supplier)
        );
      }
    } catch (err) {
      console.error("Error details:", err.response?.data);
      const errorMessage = err.response?.data?.message || "שגיאה ביצירת הספק";
      toast.error(errorMessage, { className: "sonner-toast error rtl" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-visible py-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-6xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <UserPlus className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    יצירת ספק חדש
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      הוסף ספק למערכת
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Supplier Details Section */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-visible">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
                  <div className="bg-white/95 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                        <Building2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        פרטי הספק
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Supplier Name */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-500" />
                        שם הספק
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={supplier.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הזן שם הספק..."
                      />
                    </div>

                    {/* Business Tax */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-500" />
                        מספר עוסק
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={supplier.business_tax}
                        onChange={(e) =>
                          handleInputChange("business_tax", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הזן מספר עוסק..."
                      />
                    </div>

                    {/* Phone */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-orange-500" />
                        טלפון
                        {/* <span className="text-red-500">*</span> */}
                      </label>
                      <input
                        type="tel"
                        value={supplier.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הזן מספר טלפון..."
                      />
                    </div>

                    {/* Email */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-orange-500" />
                        אימייל
                      </label>
                      <input
                        type="email"
                        value={supplier.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הזן כתובת אימייל..."
                      />
                    </div>

                    {/* 🆕 סוג ספק */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-500" />
                        סוג ספק
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={supplier.supplierType}
                        onChange={(e) =>
                          handleInputChange("supplierType", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      >
                        <option value="">-- בחר סוג ספק --</option>
                        <option value="invoices">חשבוניות בלבד</option>
                        <option value="orders">הזמנות בלבד</option>
                        <option value="both">שניהם</option>
                      </select>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2 group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        כתובת
                      </label>
                      <input
                        type="text"
                        value={supplier.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הזן כתובת מלאה..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-visible">
                {" "}
                {/* Section Header */}
                <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 p-1">
                  <div className="bg-white/95 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100">
                        <Landmark className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-900">
                          פרטי בנק
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">
                          שדות אופציונליים
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Bank Form Fields */}
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Bank Selector */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-amber-500" />
                        בנק
                      </label>
                      <div className="mt-2">
                        <BankSelector
                          banks={banks}
                          selectedBank={supplier.bankDetails.bankObj}
                          onChange={(selectedBank) => {
                            handleBankDetailsChange(
                              "bankName",
                              selectedBank?.bankName || ""
                            );
                            handleBankDetailsChange("bankObj", selectedBank);
                            handleBankDetailsChange("branchNumber", "");
                          }}
                          placeholder="בחר בנק..."
                        />
                      </div>
                    </div>

                    {/* Branch Selector */}
                    {supplier.bankDetails.bankObj &&
                      supplier.bankDetails.bankObj.branches?.length > 0 && (
                        <div className="group">
                          <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-500" />
                            בחר סניף
                          </label>
                          <div className="mt-2">
                            <Select
                              options={supplier.bankDetails.bankObj.branches.map(
                                (branch) => ({
                                  value: branch.branchCode,
                                  label: `${branch.branchCode} - ${branch.city} - ${branch.address}`,
                                  city: branch.city,
                                  address: branch.address,
                                  branchCode: branch.branchCode,
                                })
                              )}
                              value={
                                supplier.bankDetails.bankObj.branches
                                  .map((branch) => ({
                                    value: branch.branchCode,
                                    label: `${branch.branchCode} - ${branch.city} - ${branch.address}`,
                                  }))
                                  .find(
                                    (opt) =>
                                      opt.value ===
                                      supplier.bankDetails.branchNumber
                                  ) || null
                              }
                              onChange={(selected) =>
                                handleBankDetailsChange(
                                  "branchNumber",
                                  selected?.value || ""
                                )
                              }
                              placeholder="-- בחר סניף או הקלד לחיפוש --"
                              isClearable
                              isSearchable={true}
                              filterOption={(option, inputValue) => {
                                if (!inputValue) return true;
                                const searchTerm = inputValue.toLowerCase();
                                return (
                                  option.data.city
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  option.data.address
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  option.data.branchCode
                                    .toLowerCase()
                                    .includes(searchTerm)
                                );
                              }}
                              styles={{
                                control: (provided) => ({
                                  ...provided,
                                  minHeight: 48,
                                  padding: "4px",
                                  borderWidth: "2px",
                                  borderColor: "#e2e8f0",
                                  borderRadius: "12px",
                                  "&:focus-within": {
                                    borderColor: "#f59e0b",
                                    boxShadow:
                                      "0 0 0 4px rgba(245, 158, 11, 0.2)",
                                  },
                                }),
                                menu: (provided) => ({
                                  ...provided,
                                  maxHeight: 200,
                                  overflowY: "auto",
                                  borderRadius: "12px",
                                }),
                                option: (provided, state) => ({
                                  ...provided,
                                  fontSize: "14px",
                                  padding: "8px 12px",
                                  backgroundColor: state.isFocused
                                    ? "#fef3c7"
                                    : "white",
                                  color: "#334155",
                                }),
                                menuPortal: (base) => ({
                                  ...base,
                                  zIndex: 9999,
                                }),
                              }}
                              noOptionsMessage={({ inputValue }) =>
                                inputValue
                                  ? `לא נמצאו סניפים עבור "${inputValue}"`
                                  : "לא נמצאו סניפים"
                              }
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                          </div>
                        </div>
                      )}

                    {/* Account Number */}
                    {supplier.bankDetails.bankName && (
                      <div className="group">
                        <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-amber-500" />
                          מספר חשבון
                        </label>
                        <input
                          type="text"
                          value={supplier.bankDetails.accountNumber}
                          onChange={(e) =>
                            handleBankDetailsChange(
                              "accountNumber",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all group-hover:border-amber-300"
                          placeholder="הזן מספר חשבון..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex justify-center gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative px-10 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 flex items-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>יוצר ספק...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>צור ספק</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="group relative px-10 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 flex items-center gap-3"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSupplier;
