import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { DownloadCloud, Edit2, Trash2, Users, FileSpreadsheet, Filter, X } from "lucide-react";
import api from "../../api/api";
import { toast } from "sonner";

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // מצב פילטרים מתקדמים
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    hasBankDetails: "all", // all, yes, no
    hasEmail: "all",
    businessTaxRange: { min: "", max: "" }
  });

  // מצב עמודות לייצוא
  const [exportColumns, setExportColumns] = useState({
    name: true,
    business_tax: true,
    address: true,
    phone: true,
    email: true,
    bankName: true,
    branchNumber: false,
    accountNumber: false,
    createdAt: true
  });

  const navigate = useNavigate();


  // רשימת כל העמודות האפשריות
  const availableColumns = [
    { key: 'name', label: 'שם הספק', selected: exportColumns.name },
    { key: 'business_tax', label: 'מספר עוסק', selected: exportColumns.business_tax },
    { key: 'address', label: 'כתובת', selected: exportColumns.address },
    { key: 'phone', label: 'טלפון', selected: exportColumns.phone },
    { key: 'email', label: 'אימייל', selected: exportColumns.email },
    { key: 'bankName', label: 'שם הבנק', selected: exportColumns.bankName },
    { key: 'branchNumber', label: 'מספר סניף', selected: exportColumns.branchNumber },
    { key: 'accountNumber', label: 'מספר חשבון', selected: exportColumns.accountNumber },
    { key: 'createdAt', label: 'תאריך יצירה', selected: exportColumns.createdAt }
  ];

  // פילטור ספקים עם פילטרים מתקדמים
  const filteredSuppliers = React.useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    
    let filtered = suppliers;
    
    // חיפוש טקסט
    if (searchTerm) {
      filtered = filtered.filter(supplier => 
        supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier?.business_tax?.toString().includes(searchTerm)
      );
    }

    // פילטור לפי טווח תאריכים
    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(supplier => 
        new Date(supplier.createdAt) >= new Date(advancedFilters.dateFrom)
      );
    }
    if (advancedFilters.dateTo) {
      filtered = filtered.filter(supplier => 
        new Date(supplier.createdAt) <= new Date(advancedFilters.dateTo)
      );
    }

    // פילטור לפי פרטי בנק
    if (advancedFilters.hasBankDetails === "yes") {
      filtered = filtered.filter(supplier => 
        supplier.bankDetails?.bankName && supplier.bankDetails?.accountNumber
      );
    } else if (advancedFilters.hasBankDetails === "no") {
      filtered = filtered.filter(supplier => 
        !supplier.bankDetails?.bankName || !supplier.bankDetails?.accountNumber
      );
    }

    // פילטור לפי אימייל
    if (advancedFilters.hasEmail === "yes") {
      filtered = filtered.filter(supplier => supplier.email && supplier.email.trim() !== "");
    } else if (advancedFilters.hasEmail === "no") {
      filtered = filtered.filter(supplier => !supplier.email || supplier.email.trim() === "");
    }

    // פילטור לפי טווח מספר עוסק
    if (advancedFilters.businessTaxRange.min) {
      filtered = filtered.filter(supplier => 
        (supplier.business_tax || 0) >= parseInt(advancedFilters.businessTaxRange.min)
      );
    }
    if (advancedFilters.businessTaxRange.max) {
      filtered = filtered.filter(supplier => 
        (supplier.business_tax || 0) <= parseInt(advancedFilters.businessTaxRange.max)
      );
    }

    return filtered;
  }, [suppliers, searchTerm, advancedFilters]);

  const sortedSuppliers = React.useMemo(() => {
    if (!Array.isArray(filteredSuppliers)) return [];
    
    return [...filteredSuppliers].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" 
          ? (a.name || '').localeCompare((b.name || ''), 'he')
          : (b.name || '').localeCompare((a.name || ''), 'he');
      }
      if (sortBy === "business_tax") {
        return sortOrder === "asc" ? (a.business_tax || 0) - (b.business_tax || 0) : (b.business_tax || 0) - (a.business_tax || 0);
      }
      if (sortBy === "createdAt") {
        return sortOrder === "asc"
          ? new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          : new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });
  }, [filteredSuppliers, sortBy, sortOrder]);

  // ייצוא מותאם אישית
  const exportCustomReport = () => {
    if (!Array.isArray(sortedSuppliers) || sortedSuppliers.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const columnMapping = {
      name: "שם הספק",
      business_tax: "מספר עוסק", 
      address: "כתובת",
      phone: "טלפון",
      email: "אימייל",
      bankName: "שם הבנק",
      branchNumber: "מספר סניף",
      accountNumber: "מספר חשבון",
      createdAt: "תאריך יצירה"
    };

    const selectedColumns = Object.keys(exportColumns).filter(key => exportColumns[key]);
    
    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const suppliersData = sortedSuppliers.map((supplier) => {
      const row = {};
      
      selectedColumns.forEach(col => {
        switch(col) {
          case 'name':
            row[columnMapping.name] = supplier.name || '';
            break;
          case 'business_tax':
            row[columnMapping.business_tax] = supplier.business_tax || '';
            break;
          case 'address':
            row[columnMapping.address] = supplier.address || '';
            break;
          case 'phone':
            row[columnMapping.phone] = supplier.phone || '';
            break;
          case 'email':
            row[columnMapping.email] = supplier.email || '';
            break;
          case 'bankName':
            row[columnMapping.bankName] = supplier.bankDetails?.bankName || '';
            break;
          case 'branchNumber':
            row[columnMapping.branchNumber] = supplier.bankDetails?.branchNumber || '';
            break;
          case 'accountNumber':
            row[columnMapping.accountNumber] = supplier.bankDetails?.accountNumber || '';
            break;
          case 'createdAt':
            row[columnMapping.createdAt] = new Date(supplier.createdAt).toLocaleDateString('he-IL');
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

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/suppliers/getAllSuppliers`);
        
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          setSuppliers(response.data.data);
        } else {
          setSuppliers([]);
        }
        
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        setSuppliers([]);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl"
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
      setSuppliers((prevSuppliers) => prevSuppliers.filter(supplier => supplier._id !== supplierToDelete));
      setShowModal(false);
      setSupplierToDelete(null);
      toast.success("הספק נמחק בהצלחה", { className: "sonner-toast success rtl" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("שגיאה במחיקת ספק", { className: "sonner-toast error rtl" });
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-supplier/${id}`);
  };

  const handleView = (id) => {
    navigate(`/supplier/${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען רשימת ספקים . . .</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b py-8">
      <div className="container mx-auto px-4">
        <div className="bg-slate-100 rounded-lg shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Users className="text-slate-800 ml-4 size-10" />
                <h1 className="text-4xl font-bold text-slate-800">רשימת ספקים</h1>
              </div>
              <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 mx-auto"></div>
            </div>
          </div>

          <div className="p-6">
            {/* סרגל כלים עליון */}
            <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-8">
              <div className="flex flex-wrap items-end gap-4">
                {/* חיפוש */}
                <div className="flex items-center">
                  <label className="mr-1 font-bold text-l">חיפוש:</label>
                  <input
                    type="text"
                    placeholder="חפש לפי שם, אימייל או מספר עוסק..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 ml-3"
                  />
                </div>

                {/* מיון */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <label className="mr-1 font-bold text-l">מיין לפי:</label>
                  </div>
                  <select
                    onChange={(e) => setSortBy(e.target.value)}
                    value={sortBy}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 ml-3"
                  >
                    <option value="name" className="font-bold">שם</option>
                    <option value="business_tax" className="font-bold">מספר עוסק</option>
                    <option value="createdAt" className="font-bold">תאריך יצירה</option>
                  </select>
                  <select
                    onChange={(e) => setSortOrder(e.target.value)}
                    value={sortOrder}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="asc" className="font-bold">עולה</option>
                    <option value="desc" className="font-bold">יורד</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/create-supplier')}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-500 transition-colors duration-200 font-medium"
                >
                  <span>➕</span>
                  <span>הוסף ספק חדש</span>
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium"
                >
                  <FileSpreadsheet size={20} />
                  <span>מחולל דוחות</span>
                </button>
              </div>
            </div>

            {/* פילטרים מתקדמים */}
            <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Filter size={20} />
                פילטרים מתקדמים
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך מ:</label>
                  <input
                    type="date"
                    value={advancedFilters.dateFrom}
                    onChange={(e) => setAdvancedFilters(prev => ({...prev, dateFrom: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך עד:</label>
                  <input
                    type="date"
                    value={advancedFilters.dateTo}
                    onChange={(e) => setAdvancedFilters(prev => ({...prev, dateTo: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">פרטי בנק:</label>
                  <select
                    value={advancedFilters.hasBankDetails}
                    onChange={(e) => setAdvancedFilters(prev => ({...prev, hasBankDetails: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="all">הכל</option>
                    <option value="yes">יש פרטי בנק</option>
                    <option value="no">אין פרטי בנק</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">אימייל:</label>
                  <select
                    value={advancedFilters.hasEmail}
                    onChange={(e) => setAdvancedFilters(prev => ({...prev, hasEmail: e.target.value}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="all">הכל</option>
                    <option value="yes">יש אימייל</option>
                    <option value="no">אין אימייל</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">מספר עוסק מ:</label>
                  <input
                    type="number"
                    value={advancedFilters.businessTaxRange.min}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev, 
                      businessTaxRange: {...prev.businessTaxRange, min: e.target.value}
                    }))}
                    className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="מינימום"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">עד:</label>
                  <input
                    type="number"
                    value={advancedFilters.businessTaxRange.max}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev, 
                      businessTaxRange: {...prev.businessTaxRange, max: e.target.value}
                    }))}
                    className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="מקסימום"
                  />
                </div>
                
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  <X size={16} />
                  נקה פילטרים
                </button>
              </div>
            </div>

            {/* הצגת תוצאות */}
            <div className="mb-4 text-sm text-slate-600">
              מציג {sortedSuppliers.length} ספקים מתוך {suppliers.length}
            </div>

            {/* טבלת ספקים */}
            {Array.isArray(suppliers) && suppliers.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-l">
                      <th className="px-6 py-4 text-right">שם הספק</th>
                      <th className="px-6 py-4 text-right">מספר עוסק</th>
                      <th className="px-6 py-4 text-right">טלפון</th>
                      <th className="px-6 py-4 text-center">אימייל</th>
                      <th className="px-6 py-4 text-center">שם בנק</th>
                      <th className="px-6 py-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSuppliers.map((supplier) => (
                      <tr
                        key={supplier._id}
                        onClick={() => handleView(supplier._id)}
                        className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium">{supplier.name}</td>
                        <td className="px-6 py-4 font-medium">{supplier.business_tax}</td>
                        <td className="px-6 py-4 font-medium">{supplier.phone}</td>
                        <td className="px-6 py-4 font-medium">{supplier.email}</td>
                        <td className="px-6 py-4 font-medium">{supplier.bankDetails?.bankName || 'אין חשבון בנק'}</td>
                        <td className="px-6 py-4 font-medium">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(supplier._id);
                              }}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors duration-150"
                            >
                              <Edit2 size={25} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSupplierToDelete(supplier._id);
                                setShowModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
                            >
                              <Trash2 size={25} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-medium text-slate-600">אין ספקים להציג</h2>
                <p className="text-slate-500 mt-2">לחץ על "הוסף ספק חדש" כדי להתחיל</p>
              </div>
            )}
          </div>
        </div>

        {/* מודל מחולל דוחות */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">מחולל דוחות ספקים</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-bold mb-4">בחר עמודות לייצוא:</h4>
                
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={selectAllColumns}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={deselectAllColumns}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    בטל הכל
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableColumns.map(column => (
                    <label key={column.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportColumns[column.key]}
                        onChange={() => toggleColumn(column.key)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold mb-2">סיכום הדוח:</h4>
                <p className="text-sm">
                  <strong>מספר ספקים:</strong> {sortedSuppliers.length} <br/>
                  <strong>עמודות נבחרות:</strong> {Object.values(exportColumns).filter(v => v).length} <br/>
                  <strong>פילטרים פעילים:</strong> {
                    [
                      searchTerm && "חיפוש טקסט",
                      advancedFilters.dateFrom && "תאריך התחלה", 
                      advancedFilters.dateTo && "תאריך סיום",
                      advancedFilters.hasBankDetails !== "all" && "פרטי בנק",
                      advancedFilters.hasEmail !== "all" && "אימייל",
                      (advancedFilters.businessTaxRange.min || advancedFilters.businessTaxRange.max) && "טווח מספר עוסק"
                    ].filter(Boolean).join(", ") || "ללא"
                  }
                </p>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={exportCustomReport}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <DownloadCloud size={20} />
                  ייצא דוח
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל מחיקה */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="mb-6">
                <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
                  <h3 className="text-3xl font-bold text-center">האם אתה בטוח?</h3>
                  <p className="mt-1 text-l text-center">שים לב! פעולה זו תמחק את הספק לצמיתות.</p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-l font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150"
                >
                  מחק ספק
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-l font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuppliersPage;