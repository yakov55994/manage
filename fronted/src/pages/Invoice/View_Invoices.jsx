import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import api from "../../api/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Link, useNavigate } from "react-router-dom";
import { DownloadCloud, Edit2, Trash2, Filter } from "lucide-react"; // הוספת אייקון פילטר
import { toast } from "sonner";


const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]); // מאחסן את כל החשבוניות לפני הסינון
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  // פילטרים חדשים
  const [paymentFilter, setPaymentFilter] = useState("all"); // all, paid, unpaid
  const [statusFilter, setStatusFilter] = useState("all"); // all, submitted, inProgress, notSubmitted

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString('he-IL');
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // פונקציה לסינון החשבוניות לפי המסננים
  const applyFilters = () => {
    let filteredResults = [...allInvoices];
    
    // סינון לפי סטטוס תשלום
    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filteredResults = filteredResults.filter(invoice => 
        (isPaid && invoice.paid === "כן") || (!isPaid && invoice.paid !== "כן")
      );
    }
    
    // סינון לפי סטטוס הגשה
    if (statusFilter !== "all") {
      if (statusFilter === "submitted") {
        filteredResults = filteredResults.filter(invoice => invoice.status === "הוגש");
      } else if (statusFilter === "inProgress") {
        filteredResults = filteredResults.filter(invoice => invoice.status === "בעיבוד");
      } else if (statusFilter === "notSubmitted") {
        filteredResults = filteredResults.filter(invoice => invoice.status === "לא הוגש");
      }
    }
    
    setInvoices(filteredResults);
  };

  // איפוס כל המסננים
  const resetFilters = () => {
    setPaymentFilter("all");
    setStatusFilter("all");
    setInvoices(allInvoices);
  };

  // הפעלת סינון בעת שינוי באחד המסננים
  useEffect(() => {
    if (allInvoices.length > 0) {
      applyFilters();
    }
  }, [paymentFilter, statusFilter]);

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (sortBy === "sum") {
      return sortOrder === "asc" ? a.sum - b.sum : b.sum - a.sum;
    }
    if (sortBy === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === "invoiceNumber") {
      return sortOrder === "asc"
        ? a.invoiceNumber - b.invoiceNumber
        : b.invoiceNumber - a.invoiceNumber;
    }
    if (sortBy === "projectName") {
      return sortOrder === "asc"
        ? a.projectName.localeCompare(b.projectName)
        : b.projectName.localeCompare(a.projectName);
    }
    return 0;
  });

  console.log("First invoice:", allInvoices);

const exportToExcelWithSuppliers = () => {
  console.log('🔍 First invoice supplier data:', sortedInvoices[0]?.supplier);
  
  const invoicesWithSupplier = sortedInvoices.filter(invoice => 
    invoice.supplier && typeof invoice.supplier === 'object'
  );
  
  const totalInvoices = sortedInvoices.length;
  const supplierInvoices = invoicesWithSupplier.length;
  
  console.log(`📊 סטטיסטיקה: ${supplierInvoices}/${totalInvoices} חשבוניות יש להן ספק`);
  
  const invoicesWithHeaders = sortedInvoices.map((invoice) => {
    const baseData = {
      "מספר חשבונית": invoice.invoiceNumber,
      "שם המזמין": invoice.invitingName,
      "שם הפרוייקט": invoice.projectName,
      "תאריך יצירה": formatDate(invoice.createdAt),
      "סכום": formatNumber(invoice.sum),
      "סטטוס": invoice.status,
      "פירוט": invoice.detail,
      "שולם": invoice.paid === "כן" ? "כן" : "לא",
      "תאריך תשלום": invoice.paid === "כן" ? formatDate(invoice.paymentDate) : "לא שולם"
    };
    
    // ✅ עכשיו זה אמור לעבוד אם השרת עושה populate נכון
    if (invoice.supplier && typeof invoice.supplier === 'object') {
      return {
        ...baseData,
        // "יש ספק": "כן",
        "שם ספק": invoice.supplier.name || 'לא זמין',
        "טלפון ספק": invoice.supplier.phone || 'לא זמין',
        // "אימייל ספק": invoice.supplier.email || 'לא זמין',
        // "כתובת ספק": invoice.supplier.address || 'לא זמין',
        // "מס עסקים ספק": invoice.supplier.business_tax || 'לא זמין',
        "שם הבנק": invoice.supplier.bankDetails?.bankName || 'לא זמין',
        "מספר סניף": invoice.supplier.bankDetails?.branchNumber || 'לא זמין',
        "מספר חשבון": invoice.supplier.bankDetails?.accountNumber || 'לא זמין'
      };
    } else {
      // ✅ עבור חשבוניות ישנות בלי ספק
      return {
        ...baseData,
        // "יש ספק": "לא",
        "שם ספק": 'אין ספק מוגדר',
        "טלפון ספק": 'אין ספק מוגדר',
        // "אימייל ספק": 'אין ספק מוגדר',
        // "כתובת ספק": 'אין ספק מוגדר',
        // "מס עסקים ספק": 'אין ספק מוגדר',
        "שם הבנק": 'אין ספק מוגדר',
        "מספר סניף": 'אין ספק מוגדר',
        "מספר חשבון": 'אין ספק מוגדר'
      };
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(invoicesWithHeaders);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "חשבוניות");

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }), 
    `חשבוניות_${supplierInvoices}_מתוך_${totalInvoices}_עם_ספקים.xlsx`
  );
  
  toast.success(
    `הקובץ יוצא בהצלחה! ${supplierInvoices} מתוך ${totalInvoices} חשבוניות כוללות פרטי ספק`, 
    {
      className: "sonner-toast success rtl",
      duration: 4000
    }
  );
};

// 🔍 בדיקה בקליינט - הוסף את זה זמנית לתחילת הקומפוננט:
useEffect(() => {
  console.log('🔍 All invoices from server:', allInvoices);
  console.log('🔍 First invoice supplier:', allInvoices[0]?.supplier);
}, [allInvoices]);


  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get('/invoices');
        setAllInvoices(response.data); // שמירת כל החשבוניות
        setInvoices(response.data); // הצגת כל החשבוניות בתחילה
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const handleDelete = async () => {
    try {
      if (invoiceToDelete) {
        await api.delete(`/invoices/${invoiceToDelete._id}`, {
          data: {
            invoiceNumber: invoiceToDelete.invoiceNumber,
            projectName: invoiceToDelete.projectName,
          },
        });
        
        // עדכון שתי הרשימות - כל החשבוניות והחשבוניות המסוננות
        const updatedInvoices = allInvoices.filter((invoice) => invoice._id !== invoiceToDelete._id);
        setAllInvoices(updatedInvoices);
        setInvoices(updatedInvoices.filter(invoice => {
          // החלת הסינון הנוכחי על הרשימה המעודכנת
          let matchesPaymentFilter = paymentFilter === "all" || 
            (paymentFilter === "paid" && invoice.paid === "כן") || 
            (paymentFilter === "unpaid" && invoice.paid !== "כן");
            
          let matchesStatusFilter = statusFilter === "all" || 
            (statusFilter === "submitted" && invoice.status === "הוגש") || 
            (statusFilter === "inProgress" && invoice.status === "בעיבוד") ||
            (statusFilter === "notSubmitted" && invoice.status === "לא הוגש");
            
          return matchesPaymentFilter && matchesStatusFilter;
        }));
        
        setShowModal(false);
        toast.success("החשבונית נמחקה בהצלחה", {
          className: "sonner-toast success rtl"
        });

        // Reset invoiceToDelete after successful deletion
        setInvoiceToDelete(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("שגיאה במחיקת החשבונית", {
        className: "sonner-toast error rtl"
      });
    }
  };

  // בקטע זה, אתה מציב את החשבונית למחיקה לפני שאתה פותח את המודל:
  const handleConfirmDelete = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowModal(true);
  };

  const handleEdit = (id) => {
    navigate(`/update-invoice/${id}`);
  };

  const handleView = (id) => {
    navigate(`/invoice/${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען רשימת חשבוניות . . .</h1>
      </div>
    );
  }
  
  const togglePaymentStatus = async (invoice) => {
    try {
      const updatedInvoice = { ...invoice, paid: invoice.paid === "כן" ? "לא" : "כן" };
      
      await api.put(`/invoices/${invoice._id}/status`, { paid: updatedInvoice.paid });
  
      // עדכון הסטייט כדי שהשינוי יופיע ישירות בטבלה
      setInvoices((prevInvoices) =>
        prevInvoices.map((inv) => (inv._id === invoice._id ? updatedInvoice : inv))
      );
      setAllInvoices((prevAllInvoices) =>
        prevAllInvoices.map((inv) => (inv._id === invoice._id ? updatedInvoice : inv))
      );
  
      toast.success(`סטטוס התשלום עודכן ל - ${updatedInvoice.paid}`, {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("שגיאה בעדכון סטטוס התשלום", {
        className: "sonner-toast error rtl",
      });
    }
  };
  
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="bg-slate-100 rounded-lg shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-800">רשימת חשבוניות</h1>
              <div className="h-1 w-24 bg-slate-800 rounded-full mt-2 mx-auto"></div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="flex flex-wrap items-end gap-4">
                {/* אזור המיון */}
                <div className="flex items-center gap-2">
                  <label className="mr-4 font-bold">מיין לפי:</label>
                  <select
                    onChange={(e) => setSortBy(e.target.value)}
                    value={sortBy}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 ml-3"
                  >
                    <option value="sum" className="font-bold">סכום</option>
                    <option value="createdAt" className="font-bold">תאריך יצירה</option>
                    <option value="invoiceNumber" className="font-bold">מספר הזמנה</option>
                    <option value="projectName" className="font-bold">שם פרוייקט</option>
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
                
                {/* אזור הסינון */}
                <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center">
                    <Filter size={18} className="text-slate-600 mr-2" />
                    <label className="mr-1 text-lg font-bold">סינון:</label>
                  </div>
                  
                  {/* סינון לפי סטטוס תשלום */}
                  <select
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    value={paymentFilter}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="all" className="font-bold">כל התשלומים</option>
                    <option value="paid" className="font-bold">שולמו</option>
                    <option value="unpaid" className="font-bold">לא שולמו</option>
                  </select>
                  
                  {/* סינון לפי סטטוס הגשה */}
                  <select
                    onChange={(e) => setStatusFilter(e.target.value)}
                    value={statusFilter}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="all" className="font-bold">כל הסטטוסים</option>
                    <option value="submitted" className="font-bold">הוגשו</option>
                    <option value="inProgress" className="font-bold">בעיבוד</option>
                    <option value="notSubmitted" className="font-bold">לא הוגשו</option>
                  </select>
                  
                  {/* כפתור איפוס סינון */}
                  {(paymentFilter !== "all" || statusFilter !== "all") && (
                    <button
                      onClick={resetFilters}
                      className="bg-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-400 transition-colors duration-200 text-sm font-medium"
                    >
                      נקה סינון
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={exportToExcelWithSuppliers}
                className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium"
              >
                <DownloadCloud size={20} />
                <span>ייצוא לאקסל</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <ClipLoader size={50} color="#4b5563" />
              </div>
            ) : invoices.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-300 text-slate-800 text-l">
                      <th className="px-6 py-4 text-right">מספר חשבונית</th>
                      <th className="px-6 py-4 text-right">סכום</th>
                      <th className="px-6 py-4 text-right">סטטוס</th>
                      <th className="px-6 py-4 text-center">שם פרוייקט</th>
                      <th className="px-6 py-4 text-center">תשלום</th>
                      <th className="px-6 py-4 text-center">סימון תשלום</th>
                      <th className="px-6 py-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
  {sortedInvoices.map((invoice) => (
    <tr
      key={invoice._id}
      className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
      onClick={(e) => {
        if (!e.target.closest('label')) { // אם לא נלחץ על ה-checkbox
          handleView(invoice._id);
        }
      }}    
    >
     

      <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
      <td className="px-6 py-4 font-medium">{formatNumber(invoice.sum)} ₪</td>
      <td className="px-6 py-4 font-medium">{invoice.status}</td>
      <td className="px-6 py-4 font-medium">{invoice.projectName}</td>
      <td className="px-6 py-4 font-medium">
        {invoice.paid === "כן" ? (
          <p className="bg-green-300 font-bold text-center p-1 rounded-md">שולם</p>
        ) : (
          <p className="bg-red-300 font-bold text-center p-1 rounded-md">לא שולם</p>
        )}
      </td>
       {/* עמודת סימון */}
       <td className="px-6 py-4 text-center">
       <td className="px-6 py-4 text-center">
       <td className="px-6 py-4 text-center">
  <label className="relative inline-block cursor-pointer">
    <input
      type="checkbox"
      checked={invoice.paid === "כן"}
      onChange={(e) => {
        e.stopPropagation(); // מונע את פעולת ה-click על השורה
        togglePaymentStatus(invoice);
      }}
      className="absolute opacity-0 cursor-pointer"
    />
    <span
      className={`w-7 h-7 inline-block border-2 rounded-full transition-all duration-300 
        ${invoice.paid === "כן" ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-400'}
        flex items-center justify-center relative`}
    >
      {invoice.paid === "כן" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          className="w-6 h-6"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  </label>
</td>

</td>

</td>
      <td className="px-6 py-4 font-medium">
        <div className="flex justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(invoice._id);
            }}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors duration-150"
          >
            <Edit2 size={25} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConfirmDelete(invoice);
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors duration-150"
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
              <div className="text-center py-12 text-slate-600">
                {(paymentFilter !== "all" || statusFilter !== "all") ? 
                  "אין חשבוניות תואמות לסינון שנבחר" : 
                  "אין נתונים להצגה"}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-center text-red-600">האם אתה בטוח?</h3>
                <p className="mt-1 text-l text-center">שים לב! פעולה זו תמחק את החשבונית לצמיתות.</p>
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={handleDelete} className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition">
                  מחק
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150">
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

export default InvoicesPage;