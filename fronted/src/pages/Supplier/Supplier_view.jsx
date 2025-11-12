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
  Square
} from "lucide-react";
import api from "../../api/api";
import { toast } from "sonner";

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
    businessTaxRange: { min: "", max: "" }
  });

  // ✅ עמודות לייצוא – הוספתי _id, כמות חשבוניות ורשימת מזהי חשבוניות
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
  });

  const navigate = useNavigate();

  // תאריך תקני מהספק (תומך גם ב-createdAt וגם ב-date)
  const getSupplierDate = (supplier) => {
    const d = supplier?.createdAt || supplier?.date;
    return d ? new Date(d) : null;
  };
  const formatSupplierDate = (supplier) => {
    const d = getSupplierDate(supplier);
    return d ? d.toLocaleDateString("he-IL") : "";
  };

  // 🔧 רשימת עמודות זמינות למודאל
  const availableColumns = [
    { key: '_id', label: 'מזהה ספק' },
    { key: 'name', label: 'שם הספק' },
    { key: 'business_tax', label: 'מספר עוסק' },
    { key: 'address', label: 'כתובת' },
    { key: 'phone', label: 'טלפון' },
    { key: 'email', label: 'אימייל' },
    { key: 'bankName', label: 'שם הבנק' },
    { key: 'branchNumber', label: 'מספר סניף' },
    { key: 'accountNumber', label: 'מספר חשבון' },
    { key: 'invoicesCount', label: 'מס׳ חשבוניות' },
    { key: 'invoicesIds', label: 'מזהי חשבוניות' },
    { key: 'createdAt', label: 'תאריך יצירה' },
  ];

  const filteredSuppliers = React.useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    let filtered = suppliers;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier?._id?.toString().includes(searchTerm) ||
        supplier?.name?.toLowerCase().includes(q) ||
        supplier?.email?.toLowerCase().includes(q) ||
        supplier?.business_tax?.toString().includes(searchTerm)
      );
    }

    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(supplier => {
        const d = getSupplierDate(supplier);
        return d && d >= new Date(advancedFilters.dateFrom);
      });
    }
    if (advancedFilters.dateTo) {
      filtered = filtered.filter(supplier => {
        const d = getSupplierDate(supplier);
        return d && d <= new Date(advancedFilters.dateTo);
      });
    }

    if (advancedFilters.hasBankDetails === "yes") {
      filtered = filtered.filter(s =>
        s.bankDetails?.bankName && s.bankDetails?.accountNumber
      );
    } else if (advancedFilters.hasBankDetails === "no") {
      filtered = filtered.filter(s =>
        !s.bankDetails?.bankName || !s.bankDetails?.accountNumber
      );
    }

    if (advancedFilters.hasEmail === "yes") {
      filtered = filtered.filter(s => s.email && s.email.trim() !== "");
    } else if (advancedFilters.hasEmail === "no") {
      filtered = filtered.filter(s => !s.email || s.email.trim() === "");
    }

    if (advancedFilters.businessTaxRange.min) {
      filtered = filtered.filter(s =>
        (s.business_tax || 0) >= parseInt(advancedFilters.businessTaxRange.min)
      );
    }
    if (advancedFilters.businessTaxRange.max) {
      filtered = filtered.filter(s =>
        (s.business_tax || 0) <= parseInt(advancedFilters.businessTaxRange.max)
      );
    }

    return filtered;
  }, [suppliers, searchTerm, advancedFilters]);

  const sortedSuppliers = React.useMemo(() => {
    if (!Array.isArray(filteredSuppliers)) return [];

    return [...filteredSuppliers].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? (a.name || "").localeCompare((b.name || ""), "he")
          : (b.name || "").localeCompare((a.name || ""), "he");
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

  // ✅ יצוא לאקסל – תואם לשדות שביקשת
  const exportCustomReport = () => {
    if (!Array.isArray(sortedSuppliers) || sortedSuppliers.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const columnMapping = {
      _id: "מזהה ספק",
      name: "שם הספק",
      business_tax: "מספר עוסק",
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

    const selectedColumns = Object.keys(exportColumns).filter(k => exportColumns[k]);
    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const suppliersData = sortedSuppliers.map((s) => {
      const row = {};

      selectedColumns.forEach(col => {
        switch (col) {
          case '_id':
            row[columnMapping._id] = s?._id || "";
            break;
          case 'name':
            row[columnMapping.name] = s?.name || "";
            break;
          case 'business_tax':
            row[columnMapping.business_tax] = s?.business_tax ?? "";
            break;
          case 'address':
            row[columnMapping.address] = s?.address || "";
            break;
          case 'phone':
            row[columnMapping.phone] = s?.phone || "";
            break;
          case 'email':
            row[columnMapping.email] = s?.email || "";
            break;
          case 'bankName':
            row[columnMapping.bankName] = s?.bankDetails?.bankName || "";
            break;
          case 'branchNumber':
            row[columnMapping.branchNumber] = s?.bankDetails?.branchNumber || "";
            break;
          case 'accountNumber':
            row[columnMapping.accountNumber] = s?.bankDetails?.accountNumber || "";
            break;
          case 'invoicesCount':
            row[columnMapping.invoicesCount] = Array.isArray(s?.invoices) ? s.invoices.length : 0;
            break;
          case 'invoicesIds':
            row[columnMapping.invoicesIds] = Array.isArray(s?.invoices)
              ? s.invoices.map(x => (typeof x === "string" ? x : x?.$oid || x?._id || "")).filter(Boolean).join(", ")
              : "";
            break;
          case 'createdAt':
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
    const fileName = `דוח_ספקים_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${suppliersData.length} ספקים`, { className: "sonner-toast success rtl" });
  };

  const clearFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      hasBankDetails: "all",
      hasEmail: "all",
      businessTaxRange: { min: "", max: "" }
    });
    setSearchTerm("");
  };

  const toggleColumn = (columnKey) => {
    setExportColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const selectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach(key => {
      newState[key] = true;
    });
    setExportColumns(newState);
  };

  const deselectAllColumns = () => {
    const newState = {};
    Object.keys(exportColumns).forEach(key => {
      newState[key] = false;
    });
    setExportColumns(newState);
  };

  // ✅ פונקציית עזר שמחזירה מערך ספקים מה-API בכל מבנה נפוץ
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
      toast.error("לא נבחר ספק למחיקה או שה-ID לא תקין", { className: "sonner-toast error rtl" });
      return;
    }

    try {
      await api.delete(`/suppliers/${supplierToDelete}`);
      setSuppliers((prev) => prev.filter(s => s._id !== supplierToDelete));
      setShowModal(false);
      setSupplierToDelete(null);
      toast.success("הספק נמחק בהצלחה", { className: "sonner-toast success rtl" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("שגיאה במחיקת ספק", { className: "sonner-toast error rtl" });
    }
  };

  const handleEdit = (id) => navigate(`/update-supplier/${id}`);
  const handleView = (id) => navigate(`/suppliers/${id}`);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
          <ClipLoader size={80} color="#f97316" loading={loading} />
        </div>
        <h1 className="mt-6 font-bold text-2xl text-orange-900">טוען רשימת ספקים...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg">
              <Users className="text-white w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">רשימת ספקים</h1>
          </div>
          <div className="h-1 w-32 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mx-auto"></div>
        </div>

        {/* סרגל כלים עליון */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            {/* חיפוש ומיון */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 flex-1">
              {/* חיפוש */}
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-semibold text-gray-700 mb-2">חיפוש</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ID, שם, אימייל או מספר עוסק..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pr-10 pl-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              {/* מיון */}
              <div className="flex gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מיין לפי</label>
                  <select
                    onChange={(e) => setSortBy(e.target.value)}
                    value={sortBy}
                    className="px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all font-medium cursor-pointer"
                  >
                    <option value="name">שם</option>
                    <option value="business_tax">מספר עוסק</option>
                    <option value="createdAt">תאריך יצירה</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">סדר</label>
                  <select
                    onChange={(e) => setSortOrder(e.target.value)}
                    value={sortOrder}
                    className="px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium cursor-pointer"
                  >
                    <option value="asc">⬆ עולה</option>
                    <option value="desc">⬇ יורד</option>
                  </select>
                </div>
              </div>
            </div>

            {/* כפתורי פעולה */}
            <div className="flex gap-3 w-full lg:w-auto">
              <button
                onClick={() => navigate('/create-supplier')}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>הוסף ספק</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>דוחות</span>
              </button>
            </div>
          </div>
        </div>

        {/* פילטרים מתקדמים */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg shadow-md">
              <Filter className="text-white w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">פילטרים מתקדמים</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-orange-600" /> תאריך מ:
              </label>
              <input
                type="date"
                value={advancedFilters.dateFrom}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-amber-600" /> תאריך עד:
              </label>
              <input
                type="date"
                value={advancedFilters.dateTo}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-4 py-3 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" /> פרטי בנק:
              </label>
              <select
                value={advancedFilters.hasBankDetails}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasBankDetails: e.target.value }))}
                className="w-full px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all font-medium cursor-pointer"
              >
                <option value="all">הכל</option>
                <option value="yes">יש פרטי בנק</option>
                <option value="no">אין פרטי בנק</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 text-purple-600" /> אימייל:
              </label>
              <select
                value={advancedFilters.hasEmail}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, hasEmail: e.target.value }))}
                className="w-full px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium cursor-pointer"
              >
                <option value="all">הכל</option>
                <option value="yes">יש אימייל</option>
                <option value="no">אין אימייל</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">מספר עוסק מ:</label>
              <input
                type="number"
                value={advancedFilters.businessTaxRange.min}
                onChange={(e) =>
                  setAdvancedFilters(prev => ({
                    ...prev,
                    businessTaxRange: { ...prev.businessTaxRange, min: e.target.value },
                  }))
                }
                className="w-32 px-3 py-2 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg focus:border-green-400 focus:outline-none transition-all"
                placeholder="מינימום"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">עד:</label>
              <input
                type="number"
                value={advancedFilters.businessTaxRange.max}
                onChange={(e) =>
                  setAdvancedFilters(prev => ({
                    ...prev,
                    businessTaxRange: { ...prev.businessTaxRange, max: e.target.value },
                  }))
                }
                className="w-32 px-3 py-2 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg focus:border-green-400 focus:outline-none transition-all"
                placeholder="מקסימום"
              />
            </div>

            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
            >
              <X className="w-4 h-4" />
              נקה פילטרים
            </button>
          </div>
        </div>

        {/* הצגת תוצאות */}
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4 mb-6 border-2 border-orange-200">
          <p className="text-center font-semibold text-gray-800">
            מציג <span className="text-orange-600 font-bold text-lg">{sortedSuppliers.length}</span> ספקים מתוך{" "}
            <span className="text-amber-600 font-bold text-lg">{suppliers.length}</span>
          </p>
        </div>

        {/* טבלת ספקים */}
        {Array.isArray(suppliers) && suppliers.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    <th className="px-6 py-4 text-center font-bold">שם הספק</th>
                    <th className="px-6 py-4 text-center font-bold">מספר עוסק</th>
                    <th className="px-6 py-4 text-center font-bold">טלפון</th>
                    <th className="px-6 py-4 text-center font-bold">אימייל</th>
                    <th className="px-6 py-4 text-center font-bold">שם בנק</th>
                    <th className="px-6 py-4 text-center font-bold">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSuppliers.map((supplier, index) => (
                    <tr
                      key={supplier._id}
                      onClick={() => handleView(supplier._id)}
                      className={`cursor-pointer border-b border-gray-200 transition-all duration-200 ${
                        index % 2 === 0
                          ? "bg-gradient-to-r from-orange-50/50 to-amber-50/50 hover:from-orange-100 hover:to-amber-100"
                          : "bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50"
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-center text-gray-900">{supplier.name}</td>
                      <td className="px-6 py-4 font-medium text-center text-gray-700">{supplier.business_tax}</td>
                      <td className="px-6 py-4 font-medium text-center text-gray-700">{supplier.phone}</td>
                      <td className="px-6 py-4 font-medium text-center text-gray-700">
                        {supplier.email ? (
                          <span className="text-blue-600">{supplier.email}</span>
                        ) : (
                          <span className="text-gray-400 italic">לא הוזן</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-center text-gray-700">
                        {supplier.bankDetails?.bankName ? (
                          <span className="text-green-600">{supplier.bankDetails.bankName}</span>
                        ) : (
                          <span className="text-gray-400 italic">אין חשבון</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(supplier._id);
                            }}
                            className="p-2.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-all duration-200 hover:scale-110"
                            title="צפה בפרטים"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(supplier._id);
                            }}
                            className="p-2.5 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-lg transition-all duration-200 hover:scale-110"
                            title="ערוך"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSupplierToDelete(supplier._id);
                              setShowModal(true);
                            }}
                            className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-all duration-200 hover:scale-110"
                            title="מחק"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">אין ספקים להציג</h2>
            <p className="text-gray-600 mb-6">לחץ על "הוסף ספק" כדי להתחיל</p>
            <button
              onClick={() => navigate('/create-supplier')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>הוסף ספק ראשון</span>
            </button>
          </div>
        )}

        {/* Report Generator Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-50">
            {/* רקע + סגירה בלחיצה בחוץ */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReportModal(false)}
            />
            {/* מעטפת עם גלילה על כל המסך, מיושרת למעלה */}
            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
  {/* קופסת המודאל */}
  <div
    className="relative w-full max-w-3xl my-8"
    onClick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
  >
    {/* זוהר עדין */}
    <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-xl"></div>

    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
      {/* כותרת + כפתור סגירה */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">מחולל דוחות ספקים</h3>
          </div>
          <button
            onClick={() => setShowReportModal(false)}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            aria-label="סגור"
            title="סגור"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* תוכן המודאל */}
      <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">
        {/* בחירת עמודות */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900">בחר עמודות לייצוא</h4>
            <div className="flex gap-2">
              <button
                onClick={selectAllColumns}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckSquare className="w-4 h-4" />
                בחר הכל
              </button>
              <button
                onClick={deselectAllColumns}
                className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
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
                    ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!exportColumns[column.key]}
                  onChange={() => toggleColumn(column.key)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <span className={`text-sm font-medium ${
                  exportColumns[column.key] ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {column.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* סיכום הדוח */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 mb-6">
          <h4 className="font-bold text-lg mb-3 text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            סיכום הדוח
          </h4>
          <div className="space-y-2 text-gray-700">
            <p className="flex items-center gap-2">
              <span className="font-semibold">מספר ספקים לייצוא:</span>
              <span className="text-orange-600 font-bold">
                {sortedSuppliers.length}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-semibold">עמודות נבחרות:</span>
              <span className="text-green-600 font-bold">
                {Object.values(exportColumns).filter(Boolean).length}
              </span>
            </p>
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowReportModal(false)}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
          >
            ביטול
          </button>
          <button
            onClick={exportCustomReport}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
          >
            <DownloadCloud className="w-5 h-5" />
            ייצא דוח
          </button>
        </div>
      </div>
    </div>
  </div>
</div>{/* /wrapper */}
          </div>
        )}{/* /showReportModal */}

        {/* מודל מחיקה */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
              <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold">אישור מחיקה</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-lg text-gray-700 text-center mb-2">
                  האם אתה בטוח שברצונך למחוק את הספק?
                </p>
                <p className="text-red-600 text-center font-semibold mb-6">
                  פעולה זו אינה ניתנת לביטול!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                  >
                    <Trash2 className="w-5 h-5" />
                    מחק ספק
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-medium"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}{/* /showModal */}
      </div>{/* /max-w-7xl */}
    </div>   /* /min-h-screen */
  );
};

export default SuppliersPage;
