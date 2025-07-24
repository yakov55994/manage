import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { DownloadCloud, Edit2, Trash2, Users } from "lucide-react";
import api from "../../api/api";
import { toast } from "sonner";

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString('he-IL');

  // סינון ספקים לפי חיפוש
  const filteredSuppliers = React.useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    
    if (!searchTerm) return suppliers;
    
    return suppliers.filter(supplier => 
      supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.business_tax?.toString().includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

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

  const exportToExcel = () => {
    if (!Array.isArray(sortedSuppliers) || sortedSuppliers.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }
    
    const suppliersWithHeaders = sortedSuppliers.map((supplier) => ({
      "שם הספק": supplier.name,
      "מספר עוסק": supplier.business_tax,
      "כתובת": supplier.address,
      "טלפון": supplier.phone,
      "אימייל": supplier.email,
      "שם הבנק": supplier.bankDetails?.bankName || '',
      "מספר סניף": supplier.bankDetails?.branchNumber || '',
      "מספר חשבון": supplier.bankDetails?.accountNumber || '',
      "תאריך יצירה": new Date(supplier.createdAt).toLocaleDateString('he-IL')
    }));

    const worksheet = XLSX.utils.json_to_sheet(suppliersWithHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ספקים");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "ספקים.xlsx");
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/suppliers/getAllSuppliers`);

if (response.data && response.data.success && Array.isArray(response.data.data)) {
  setSuppliers(response.data.data); // ✅ שמר רק את המערך
} else {
  setSuppliers([]);
}  
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        setSuppliers([]); // וידוא שזה מערך במקרה של שגיאה
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
      await api.delete(`/supplier/${supplierToDelete}`);
      setSuppliers((prevSuppliers) => prevSuppliers.filter(supplier => supplier._id !== supplierToDelete));
      setShowModal(false);
      toast.success("הספק נמחק בהצלחה", { className: "sonner-toast success rtl" });
    } catch (error) {
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
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
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium"
                >
                  <DownloadCloud size={20} />
                  <span>ייצוא לאקסל</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <ClipLoader size={50} color="#4b5563" />
              </div>
                          ) : (Array.isArray(suppliers) && suppliers.length > 0) ? (
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
                    {Array.isArray(sortedSuppliers) && sortedSuppliers.map((supplier) => (
                      <tr
                        key={supplier._id}
                        onClick={() => handleView(supplier._id)}
                        className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium">{supplier.name}</td>
                        <td className="px-6 py-4 font-medium">{formatNumber(supplier.business_tax)}</td>
                        <td className="px-6 py-4 font-medium">{supplier.phone}</td>
                        <td className="px-6 py-4 font-medium">{supplier.email}</td>
                        <td className="px-6 py-4 font-medium">{supplier.bankDetails?.bankName || 'לא זמין'}</td>
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

        {/* Confirmation Modal */}
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