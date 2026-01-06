import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import {
  DownloadCloud,
  Edit2,
  Trash2,
  Users,
  FileSpreadsheet,
  Filter,
  X,
  Search,
  Plus,
  Eye,
  AlertCircle,
  Calendar,
  Mail,
  Building2,
  CheckSquare,
  Square,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import api from "../../api/api.js";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext.jsx";

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    hasBankDetails: "all",
    hasEmail: "all",
    businessTaxRange: { min: "", max: "" },
    supplierType: "all", // 🆕
  });

  const [exportColumns, setExportColumns] = useState({
    _id: false,
    name: true,
    business_tax: true,
    address: true,
    phone: true,
    email: true,
    bankName: true,
    branchNumber: false,
    accountNumber: false,
    invoicesCount: true,
    invoicesIds: false,
    createdAt: true,
    supplierType: true, // 🆕
  });

  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const getSupplierDate = (supplier) => {
    const d = supplier?.createdAt || supplier?.date;
    return d ? new Date(d) : null;
  };

  const formatSupplierDate = (supplier) => {
    const d = getSupplierDate(supplier);
    return d ? d.toLocaleDateString("he-IL") : "";
  };

  const availableColumns = [
    { key: "_id", label: "מזהה ספק" },
    { key: "name", label: "שם הספק" },
    { key: "business_tax", label: "מספר עוסק" },
    { key: "supplierType", label: "סוג ספק" }, // 🆕
    { key: "address", label: "כתובת" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "bankName", label: "שם הבנק" },
    { key: "branchNumber", label: "מספר סניף" },
    { key: "accountNumber", label: "מספר חשבון" },
    { key: "invoicesCount", label: "מס׳ חשבוניות" },
    { key: "invoicesIds", label: "מזהי חשבוניות" },
    { key: "createdAt", label: "תאריך יצירה" },
  ];

  const filteredSuppliers = React.useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    let filtered = suppliers;



    if (searchTerm) {
      const q = searchTerm.toLowerCase();

      filtered = filtered.filter((supplier) => {
        // חיפוש בשדות טקסט
        const textFields = [
          supplier?._id?.toString(),
          supplier?.name,
          supplier?.email,
          supplier?.address,
          supplier?.phone,
          supplier?.supplierType,
          supplier?.bankDetails?.bankName,
          supplier?.bankDetails?.branchNumber?.toString(),
          supplier?.bankDetails?.accountNumber?.toString(),
        ].filter(Boolean).map(field => field.toLowerCase());

        // חיפוש במספר עוסק (חיפוש חלקי)
        const businessTax = supplier?.business_tax?.toString() || '';

        // חיפוש בתאריך (פורמט קריא)
        const dateStr = formatSupplierDate(supplier) || '';

        // בדיקה אם החיפוש קיים באחד מהשדות
        return textFields.some(field => field.includes(q)) ||
               businessTax.includes(searchTerm) ||
               dateStr.includes(searchTerm);
      });
    }

    if (advancedFilters.dateFrom) {
      filtered = filtered.filter((supplier) => {
        const d = getSupplierDate(supplier);
        return d && d >= new Date(advancedFilters.dateFrom);
      });
    }
    if (advancedFilters.dateTo) {
      filtered = filtered.filter((supplier) => {
        const d = getSupplierDate(supplier);
        return d && d <= new Date(advancedFilters.dateTo);
      });
    }

    if (advancedFilters.hasBankDetails === "yes") {
      filtered = filtered.filter(
        (s) => s.bankDetails?.bankName && s.bankDetails?.accountNumber
      );
    } else if (advancedFilters.hasBankDetails === "no") {
      filtered = filtered.filter(
        (s) => !s.bankDetails?.bankName || !s.bankDetails?.accountNumber
      );
    }

    if (advancedFilters.hasEmail === "yes") {
      filtered = filtered.filter((s) => s.email && s.email.trim() !== "");
    } else if (advancedFilters.hasEmail === "no") {
      filtered = filtered.filter((s) => !s.email || s.email.trim() === "");
    }

    if (advancedFilters.businessTaxRange.min) {
      filtered = filtered.filter(
        (s) =>
          (s.business_tax || 0) >=
          parseInt(advancedFilters.businessTaxRange.min)
      );
    }
    if (advancedFilters.businessTaxRange.max) {
      filtered = filtered.filter(
        (s) =>
          (s.business_tax || 0) <=
          parseInt(advancedFilters.businessTaxRange.max)
      );
    }

    // 🆕 פילטר לפי סוג ספק - עם debugging
    // 🆕 פילטר לפי סוג ספק - כולל "both"
    // 🆕 פילטר לפי סוג ספק
    // 🆕 פילטר סוג ספק — התאמה מדויקת בלבד
    if (advancedFilters.supplierType !== "all") {
      filtered = filtered.filter((s) => {
        const type = (s.supplierType || "").toLowerCase();

        // אם אין סוג ספק → לא להציג
        if (!type) return false;

        // הצגה מדויקת לפי בחירת המשתמש
        return type === advancedFilters.supplierType;
      });
    }

    return filtered;
  }, [suppliers, searchTerm, advancedFilters]);
  const sortedSuppliers = React.useMemo(() => {
    if (!Array.isArray(filteredSuppliers)) return [];

    return [...filteredSuppliers].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? (a.name || "").localeCompare(b.name || "", "he")
          : (b.name || "").localeCompare(a.name || "", "he");
      }
      if (sortBy === "business_tax") {
        return sortOrder === "asc"
          ? (a.business_tax || 0) - (b.business_tax || 0)
          : (b.business_tax || 0) - (a.business_tax || 0);
      }
      if (sortBy === "createdAt") {
        const da = getSupplierDate(a)?.getTime() ?? 0;
        const db = getSupplierDate(b)?.getTime() ?? 0;
        return sortOrder === "asc" ? da - db : db - da;
      }
      return 0;
    });
  }, [filteredSuppliers, sortBy, sortOrder]);

  const exportCustomReport = () => {
    if (!Array.isArray(sortedSuppliers) || sortedSuppliers.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const columnMapping = {
      _id: "מזהה ספק",
      name: "שם הספק",
      business_tax: "מספר עוסק",
      supplierType: "סוג ספק", // 🆕
      address: "כתובת",
      phone: "טלפון",
      email: "אימייל",
      bankName: "שם הבנק",
      branchNumber: "מספר סניף",
      accountNumber: "מספר חשבון",
      invoicesCount: "מס׳ חשבוניות",
      invoicesIds: "מזהי חשבוניות",
      createdAt: "תאריך יצירה",
    };

    const selectedColumns = Object.keys(exportColumns).filter(
      (k) => exportColumns[k]
    );
    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    const suppliersData = sortedSuppliers.map((s) => {
      const row = {};

      selectedColumns.forEach((col) => {
        switch (col) {
          case "_id":
            row[columnMapping._id] = s?._id || "";
            break;
          case "name":
            row[columnMapping.name] = s?.name || "";
            break;
          case "business_tax":
            row[columnMapping.business_tax] = s?.business_tax ?? "";
            break;
          // 🆕 סוג ספק
          case "supplierType":
            row[columnMapping.supplierType] =
              s?.supplierType === "invoices"
                ? "חשבוניות"
                : s?.supplierType === "orders"
                  ? "הזמנות"
                  : s?.supplierType === "both"
                    ? "שניהם"
                    : "לא הוגדר";
            break;
          case "address":
            row[columnMapping.address] = s?.address || "";
            break;
          case "phone":
            row[columnMapping.phone] = s?.phone || "";
            break;
          case "email":
            row[columnMapping.email] = s?.email || "";
            break;
          case "bankName":
            row[columnMapping.bankName] = s?.bankDetails?.bankName || "";
            break;
          case "branchNumber":
            row[columnMapping.branchNumber] =
              s?.bankDetails?.branchNumber || "";
            break;
          case "accountNumber":
            row[columnMapping.accountNumber] =
              s?.bankDetails?.accountNumber || "";
            break;
          case "invoicesCount":
            row[columnMapping.invoicesCount] = Array.isArray(s?.invoices)
              ? s.invoices.length
              : 0;
            break;
          case "invoicesIds":
            row[columnMapping.invoicesIds] = Array.isArray(s?.invoices)
              ? s.invoices
                .map((x) =>
                  typeof x === "string" ? x : x?.$oid || x?._id || ""
                )
                .filter(Boolean)
                .join(", ")
              : "";
            break;
          case "createdAt":
            row[columnMapping.createdAt] = formatSupplierDate(s);
            break;
          default:
            break;
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(suppliersData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח ספקים");
    const fileName = `דוח_ספקים_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${suppliersData.length} ספקים`, {
      className: "sonner-toast success rtl",
    });
  };

  const clearFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      hasBankDetails: "all",
      hasEmail: "all",
      businessTaxRange: { min: "", max: "" },
      supplierType: "all", // 🆕
    });
    setSearchTerm("");
  };

  const toggleColumn = (columnKey) => {
    setExportColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const selectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach((key) => {
      newState[key] = true;
    });
    setExportColumns(newState);
  };

  const deselectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach((key) => {
      newState[key] = false;
    });
    setExportColumns(newState);
  };

  const arr = (res) =>
    Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e) => e.key === "Escape" && setShowReportModal(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const res = await api.get("/suppliers");
        const data = arr(res);
        setAllSuppliers(data);
        setSuppliers(data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleDelete = async () => {
    if (!supplierToDelete) {
      toast.error("לא נבחר ספק למחיקה או שה-ID לא תקין", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    try {
      await api.delete(`/suppliers/${supplierToDelete}`);
      setSuppliers((prev) => prev.filter((s) => s._id !== supplierToDelete));
      setAllSuppliers((prev) => prev.filter((s) => s._id !== supplierToDelete));
      setShowModal(false);
      setSupplierToDelete(null);
      toast.success("הספק נמחק בהצלחה", {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("שגיאה במחיקת ספק", { className: "sonner-toast error rtl" });
    }
  };

  const handleEdit = (id) => navigate(`/update-supplier/${id}`);
  const handleView = (id) => navigate(`/suppliers/${id}`);

if (loading) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
        <ClipLoader size={100} color="#f97316" loading />
      </div>
      <h1 className="mt-8 font-bold text-xl sm:text-2xl md:text-3xl text-slate-900">
        טוען רשימת ספקים...
      </h1>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
    {/* Animated Background */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
    </div>

    <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
      {/* Hero Header */}
      <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
        <div className="relative">
          <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">
                  רשימת ספקים
                </h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-slate-600">
                    ניהול וניתוח ספקים
                  </span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חיפוש לפי ID, שם, אימייל או מספר עוסק..."
                  className="w-full pr-12 pl-4 py-4 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="mb-4 sm:mb-5 md:mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-white/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-4">
          {/* Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-orange-600 w-5 h-5" />
              <span className="font-bold text-slate-700">מיין לפי:</span>
            </div>
            <select
              onChange={(e) => setSortBy(e.target.value)}
              value={sortBy}
              className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
            >
              <option value="name">שם</option>
              <option value="business_tax">מספר עוסק</option>
              <option value="createdAt">תאריך יצירה</option>
            </select>
            <select
              onChange={(e) => setSortOrder(e.target.value)}
              value={sortOrder}
              className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
            >
              <option value="asc">עולה</option>
              <option value="desc">יורד</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate("/create-supplier")}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>יצירת ספק</span>
              </button>
            )}

            <button
              onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
              <FileSpreadsheet className="w-5 h-5" />
              <span>מחולל דוחות</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 font-medium">
            מציג {sortedSuppliers.length} ספקים מתוך {allSuppliers.length}
          </div>
          
          {(searchTerm ||
            advancedFilters.dateFrom ||
            advancedFilters.dateTo ||
            advancedFilters.hasBankDetails !== "all" ||
            advancedFilters.hasEmail !== "all" ||
            advancedFilters.supplierType !== "all" ||
            advancedFilters.businessTaxRange.min ||
            advancedFilters.businessTaxRange.max) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all font-bold shadow-md"
            >
              <X className="w-4 h-4" />
              נקה סינון
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mb-4 sm:mb-5 md:mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 border border-white/50">
        <div className="flex items-center gap-3 mb-4 sm:mb-5 md:mb-6">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg shadow-md">
            <Filter className="text-white w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">פילטרים מתקדמים</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* תאריך מ */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-orange-600" /> תאריך מ:
            </label>
            <input
              type="date"
              value={advancedFilters.dateFrom}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  dateFrom: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>

          {/* תאריך עד */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-amber-600" /> תאריך עד:
            </label>
            <input
              type="date"
              value={advancedFilters.dateTo}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  dateTo: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
            />
          </div>

          {/* סוג ספק */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Building2 className="w-4 h-4 text-purple-600" /> סוג ספק:
            </label>
            <select
              value={advancedFilters.supplierType}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  supplierType: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium cursor-pointer"
            >
              <option value="all">הכל</option>
              <option value="invoices">חשבוניות בלבד</option>
              <option value="orders">הזמנות בלבד</option>
              <option value="both">שניהם</option>
            </select>
          </div>

          {/* פרטי בנק */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" /> פרטי בנק:
            </label>
            <select
              value={advancedFilters.hasBankDetails}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  hasBankDetails: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all font-medium cursor-pointer"
            >
              <option value="all">הכל</option>
              <option value="yes">יש פרטי בנק</option>
              <option value="no">אין פרטי בנק</option>
            </select>
          </div>

          {/* אימייל */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Mail className="w-4 h-4 text-pink-600" /> אימייל:
            </label>
            <select
              value={advancedFilters.hasEmail}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  hasEmail: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-pink-200 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all font-medium cursor-pointer"
            >
              <option value="all">הכל</option>
              <option value="yes">יש אימייל</option>
              <option value="no">אין אימייל</option>
            </select>
          </div>

          {/* מספר עוסק מינימום */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              מספר עוסק - מינימום:
            </label>
            <input
              type="number"
              value={advancedFilters.businessTaxRange.min}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  businessTaxRange: {
                    ...prev.businessTaxRange,
                    min: e.target.value,
                  },
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
              placeholder="מינימום"
            />
          </div>

          {/* מספר עוסק מקסימום */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              מספר עוסק - מקסימום:
            </label>
            <input
              type="number"
              value={advancedFilters.businessTaxRange.max}
              onChange={(e) =>
                setAdvancedFilters((prev) => ({
                  ...prev,
                  businessTaxRange: {
                    ...prev.businessTaxRange,
                    max: e.target.value,
                  },
                }))
              }
              className="w-full px-4 py-3 bg-white border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all"
              placeholder="מקסימום"
            />
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      {sortedSuppliers.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block w-full overflow-hidden rounded-xl bg-white shadow-xl">
            <table className="w-full">
              <thead>
                <tr
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                  style={{
                    display: "grid",
                    gridTemplateColumns: isAdmin
                      ? "1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 1.2fr"
                      : "1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 0.8fr",
                  }}
                >
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    שם הספק
                  </th>
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    מספר עוסק
                  </th>
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    סוג ספק
                  </th>
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    טלפון
                  </th>
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    אימייל
                  </th>
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    שם בנק
                  </th>
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    פעולות
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {sortedSuppliers.map((supplier, index) => (
                  <tr
                    key={supplier._id}
                    onClick={() => handleView(supplier._id)}
                    className={`cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'
                    }`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isAdmin
                        ? "1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 1.2fr"
                        : "1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 0.8fr",
                    }}
                  >
                    <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-center text-slate-700">
                      {supplier.business_tax}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {supplier.supplierType === "invoices" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                          📄 חשבוניות
                        </span>
                      ) : supplier.supplierType === "orders" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                          📦 הזמנות
                        </span>
                      ) : supplier.supplierType === "both" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          🔄 שניהם
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                          ❓ לא הוגדר
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm font-medium text-center text-slate-700">
                      {supplier.phone}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-center text-slate-700">
                      {supplier.email ? (
                        <span className="text-blue-600">{supplier.email}</span>
                      ) : (
                        <span className="text-gray-400 italic">לא הוזן</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-center text-slate-700">
                      {supplier.bankDetails?.bankName ? (
                        <span className="text-green-600">
                          {supplier.bankDetails.bankName}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">אין חשבון</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(supplier._id);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="צפה בפרטים"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(supplier._id);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                          title="ערוך"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSupplierToDelete(supplier._id);
                              setShowModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="מחק"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {sortedSuppliers.map((supplier) => (
              <div
                key={supplier._id}
                onClick={() => handleView(supplier._id)}
                className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all border border-orange-100 p-4 cursor-pointer active:scale-98"
              >
                {/* Header - Supplier Name */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-orange-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">שם הספק</div>
                      <div className="text-lg font-bold text-slate-900">
                        {supplier.name}
                      </div>
                    </div>
                  </div>
                  {/* Supplier Type Badge */}
                  <div>
                    {supplier.supplierType === "invoices" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        📄 חשבוניות
                      </span>
                    ) : supplier.supplierType === "orders" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        📦 הזמנות
                      </span>
                    ) : supplier.supplierType === "both" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        🔄 שניהם
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        ❓ לא הוגדר
                      </span>
                    )}
                  </div>
                </div>

                {/* Business Tax */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 mb-1">מספר עוסק</div>
                  <div className="text-sm font-bold text-slate-900">
                    {supplier.business_tax}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">טלפון</div>
                    <div className="text-sm font-medium text-slate-700">
                      {supplier.phone || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <Mail className="w-3 h-3" />
                      אימייל
                    </div>
                    <div className="text-sm font-medium">
                      {supplier.email ? (
                        <span className="text-blue-600 truncate block">{supplier.email}</span>
                      ) : (
                        <span className="text-gray-400 italic">לא הוזן</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="mb-3 bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                    <Building2 className="w-3 h-3" />
                    שם בנק
                  </div>
                  <div className="text-sm font-medium">
                    {supplier.bankDetails?.bankName ? (
                      <span className="text-green-600">{supplier.bankDetails.bankName}</span>
                    ) : (
                      <span className="text-gray-400 italic">אין חשבון</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(supplier._id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>צפייה</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(supplier._id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>עריכה</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupplierToDelete(supplier._id);
                        setShowModal(true);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-600">
            {searchTerm ||
            Object.values(advancedFilters).some((v) => v && v !== "all")
              ? "לא נמצאו תוצאות"
              : "עדיין אין ספקים"}
          </h2>
          {isAdmin && !searchTerm && (
            <button
              onClick={() => navigate("/create-supplier")}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>הוסף ספק ראשון</span>
            </button>
          )}
        </div>
      )}

      {/* Report Generator Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          />

          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="relative w-full max-w-3xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl sm:rounded-3xl opacity-20 blur-xl"></div>

              <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 sm:p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold">
                        מחולל דוחות ספקים
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-4 sm:p-5 md:p-6">
                  <div className="mb-4 sm:mb-5 md:mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">
                        בחר עמודות לייצוא
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllColumns}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        >
                          <CheckSquare className="w-4 h-4" />
                          בחר הכל
                        </button>
                        <button
                          onClick={deselectAllColumns}
                          className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all"
                        >
                          <Square className="w-4 h-4" />
                          בטל הכל
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableColumns.map((column) => (
                        <label
                          key={column.key}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            exportColumns[column.key]
                              ? "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-400"
                              : "bg-gray-50 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!exportColumns[column.key]}
                            onChange={() => toggleColumn(column.key)}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <span
                            className={`text-sm font-medium ${
                              exportColumns[column.key]
                                ? "text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {column.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 mb-4 sm:mb-5 md:mb-6">
                    <h4 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      סיכום הדוח
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">
                          מספר ספקים לייצוא:
                        </span>
                        <span className="text-purple-600 font-bold">
                          {sortedSuppliers.length}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">עמודות נבחרות:</span>
                        <span className="text-green-600 font-bold">
                          {
                            Object.values(exportColumns).filter(Boolean)
                              .length
                          }
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-bold"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={exportCustomReport}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg font-bold"
                    >
                      <DownloadCloud className="w-5 h-5" />
                      ייצא דוח
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl sm:rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 max-w-md w-full">
              <div className="text-center mb-4 sm:mb-5 md:mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  האם למחוק את הספק?
                </h3>
                <p className="text-slate-600">הפעולה בלתי הפיכה.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                >
                  מחק
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default SuppliersPage;
