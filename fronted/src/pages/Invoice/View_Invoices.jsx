import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import api from "../../api/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { DownloadCloud, Edit2, Trash2, Filter, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import MoveInvoiceModal from "../../components/MoveInvoiceModal"; // נתיב בהתאם לפרויקט
import PaymentCaptureModal from "../../Components/PaymentCaptureModal.jsx"; // עדכן נתיב נכון



const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [moveModal, setMoveModal] = useState({ open: false, invoice: null });
  const [paymentDateModal, setPaymentDateModal] = useState({
  open: false,
  invoice: null,
  date: new Date().toISOString().slice(0,10), // YYYY-MM-DD
});
const [paymentCapture, setPaymentCapture] = useState({
  open: false,
  invoice: null,
  defaultDate: new Date().toISOString().slice(0,10),
  defaultMethod: "",
});
// const dateOnlyToUtcIso = (yyyy_mm_dd) => {
//   if (!yyyy_mm_dd) return null;
//   const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
//   return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
// };

  
  // פילטרים בסיסיים
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // פילטרים מתקדמים למחולל דוחות
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    paymentDateFrom: "",
    paymentDateTo: "",
    amountMin: "",
    amountMax: "",
    projectName: "",
    supplierName: "",
    invoiceNumberFrom: "",
    invoiceNumberTo: "",
    hasSupplier: "all", // all, yes, no
    paymentStatus: "all", // all, paid, unpaid
    submissionStatus: "all", // all, submitted, inProgress, notSubmitted
  });

  // עמודות לייצוא
  const [exportColumns, setExportColumns] = useState({
    invoiceNumber: true,
    projectName: true,
    supplierName: true,
    invitingName: true,
    sum: true,
    status: true,
    paid: true,
    createdAt: true,
    paymentDate: false,
    detail: false,
    supplierPhone: false,
    supplierEmail: false,
    supplierBankName: false,
    supplierBranchNumber: false,
    supplierAccountNumber: false
  });

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString('he-IL');
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // רשימת עמודות זמינות
  const availableColumns = [
    { key: 'invoiceNumber', label: 'מספר חשבונית', selected: exportColumns.invoiceNumber },
    { key: 'projectName', label: 'שם פרויקט', selected: exportColumns.projectName },
    { key: 'supplierName', label: 'שם ספק', selected: exportColumns.supplierName },
    { key: 'invitingName', label: 'שם מזמין', selected: exportColumns.invitingName },
    { key: 'sum', label: 'סכום', selected: exportColumns.sum },
    { key: 'status', label: 'סטטוס הגשה', selected: exportColumns.status },
    { key: 'paid', label: 'סטטוס תשלום', selected: exportColumns.paid },
    { key: 'createdAt', label: 'תאריך יצירה', selected: exportColumns.createdAt },
    { key: 'paymentDate', label: 'תאריך תשלום', selected: exportColumns.paymentDate },
    { key: 'detail', label: 'פירוט', selected: exportColumns.detail },
    { key: 'supplierPhone', label: 'טלפון ספק', selected: exportColumns.supplierPhone },
    { key: 'supplierEmail', label: 'אימייל ספק', selected: exportColumns.supplierEmail },
    { key: 'supplierBankName', label: 'שם בנק ספק', selected: exportColumns.supplierBankName },
    { key: 'supplierBranchNumber', label: 'מספר סניף ספק', selected: exportColumns.supplierBranchNumber },
    { key: 'supplierAccountNumber', label: 'מספר חשבון ספק', selected: exportColumns.supplierAccountNumber }
  ];

  // פילטור חשבוניות עם פילטרים מתקדמים
  const getFilteredInvoices = () => {
    let filtered = [...allInvoices];

    // פילטרים בסיסיים
    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filtered = filtered.filter(invoice => 
        (isPaid && invoice.paid === "כן") || (!isPaid && invoice.paid !== "כן")
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "submitted") {
        filtered = filtered.filter(invoice => invoice.status === "הוגש");
      } else if (statusFilter === "inProgress") {
        filtered = filtered.filter(invoice => invoice.status === "בעיבוד");
      } else if (statusFilter === "notSubmitted") {
        filtered = filtered.filter(invoice => invoice.status === "לא הוגש");
      }
    }

    // פילטרים מתקדמים (רק עבור מחולל הדוחות)
    if (showReportModal) {
      // תאריכי יצירה
      if (advancedFilters.dateFrom) {
        filtered = filtered.filter(invoice => 
          new Date(invoice.createdAt) >= new Date(advancedFilters.dateFrom)
        );
      }
      if (advancedFilters.dateTo) {
        filtered = filtered.filter(invoice => 
          new Date(invoice.createdAt) <= new Date(advancedFilters.dateTo)
        );
      }

      // תאריכי תשלום
      if (advancedFilters.paymentDateFrom) {
        filtered = filtered.filter(invoice => 
          invoice.paymentDate && new Date(invoice.paymentDate) >= new Date(advancedFilters.paymentDateFrom)
        );
      }
      if (advancedFilters.paymentDateTo) {
        filtered = filtered.filter(invoice => 
          invoice.paymentDate && new Date(invoice.paymentDate) <= new Date(advancedFilters.paymentDateTo)
        );
      }

      // טווח סכומים
      if (advancedFilters.amountMin) {
        filtered = filtered.filter(invoice => 
          invoice.sum >= parseInt(advancedFilters.amountMin)
        );
      }
      if (advancedFilters.amountMax) {
        filtered = filtered.filter(invoice => 
          invoice.sum <= parseInt(advancedFilters.amountMax)
        );
      }

      // שם פרויקט
      if (advancedFilters.projectName) {
        filtered = filtered.filter(invoice => 
          invoice.projectName?.toLowerCase().includes(advancedFilters.projectName.toLowerCase())
        );
      }

      // שם ספק
      if (advancedFilters.supplierName) {
        filtered = filtered.filter(invoice => 
          invoice.supplier?.name?.toLowerCase().includes(advancedFilters.supplierName.toLowerCase()) ||
          invoice.invitingName?.toLowerCase().includes(advancedFilters.supplierName.toLowerCase())
        );
      }

      // טווח מספרי חשבוניות
      if (advancedFilters.invoiceNumberFrom) {
        filtered = filtered.filter(invoice => 
          parseInt(invoice.invoiceNumber) >= parseInt(advancedFilters.invoiceNumberFrom)
        );
      }
      if (advancedFilters.invoiceNumberTo) {
        filtered = filtered.filter(invoice => 
          parseInt(invoice.invoiceNumber) <= parseInt(advancedFilters.invoiceNumberTo)
        );
      }

      // קיום ספק
      if (advancedFilters.hasSupplier === "yes") {
        filtered = filtered.filter(invoice => 
          invoice.supplier && typeof invoice.supplier === 'object'
        );
      } else if (advancedFilters.hasSupplier === "no") {
        filtered = filtered.filter(invoice => 
          !invoice.supplier || typeof invoice.supplier !== 'object'
        );
      }

      // סטטוס תשלום מתקדם
      if (advancedFilters.paymentStatus === "paid") {
        filtered = filtered.filter(invoice => invoice.paid === "כן");
      } else if (advancedFilters.paymentStatus === "unpaid") {
        filtered = filtered.filter(invoice => invoice.paid !== "כן");
      }

      // סטטוס הגשה מתקדם
      if (advancedFilters.submissionStatus === "submitted") {
        filtered = filtered.filter(invoice => invoice.status === "הוגש");
      } else if (advancedFilters.submissionStatus === "inProgress") {
        filtered = filtered.filter(invoice => invoice.status === "בעיבוד");
      } else if (advancedFilters.submissionStatus === "notSubmitted") {
        filtered = filtered.filter(invoice => invoice.status === "לא הוגש");
      }
    }

    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  // פונקציה לסינון החשבוניות לפי המסננים הבסיסיים
  const applyFilters = () => {
    let filteredResults = [...allInvoices];
    
    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filteredResults = filteredResults.filter(invoice => 
        (isPaid && invoice.paid === "כן") || (!isPaid && invoice.paid !== "כן")
      );
    }
    
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

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      paymentDateFrom: "",
      paymentDateTo: "",
      amountMin: "",
      amountMax: "",
      projectName: "",
      supplierName: "",
      invoiceNumberFrom: "",
      invoiceNumberTo: "",
      hasSupplier: "all",
      paymentStatus: "all",
      submissionStatus: "all",
    });
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

  // ייצוא מותאם אישית
  const exportCustomReport = () => {
    const dataToExport = filteredInvoices;
    
    if (!dataToExport || dataToExport.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const columnMapping = {
      invoiceNumber: "מספר חשבונית",
      projectName: "שם פרויקט",
      supplierName: "שם ספק",
      invitingName: "שם מזמין",
      sum: "סכום",
      status: "סטטוס הגשה",
      paid: "סטטוס תשלום",
      createdAt: "תאריך יצירה",
      paymentDate: "תאריך תשלום",
      detail: "פירוט",
      supplierPhone: "טלפון ספק",
      supplierEmail: "אימייל ספק",
      supplierBankName: "שם בנק ספק",
      supplierBranchNumber: "מספר סניף ספק",
      supplierAccountNumber: "מספר חשבון ספק"
    };

    const selectedColumns = Object.keys(exportColumns).filter(key => exportColumns[key]);
    
    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const invoicesData = dataToExport.map((invoice) => {
      const row = {};
      
      selectedColumns.forEach(col => {
        switch(col) {
          case 'invoiceNumber':
            row[columnMapping.invoiceNumber] = invoice.invoiceNumber || '';
            break;
          case 'projectName':
            row[columnMapping.projectName] = invoice.projectName || '';
            break;
          case 'supplierName':
            row[columnMapping.supplierName] = invoice.supplier?.name || invoice.invitingName || 'אין ספק מוגדר';
            break;
          case 'invitingName':
            row[columnMapping.invitingName] = invoice.invitingName || '';
            break;
          case 'sum':
            row[columnMapping.sum] = invoice.sum || 0;
            break;
          case 'status':
            row[columnMapping.status] = invoice.status || '';
            break;
          case 'paid':
            row[columnMapping.paid] = invoice.paid === "כן" ? "שולם" : "לא שולם";
            break;
          case 'createdAt':
            row[columnMapping.createdAt] = formatDate(invoice.createdAt);
            break;
          case 'paymentDate':
            row[columnMapping.paymentDate] = invoice.paid === "כן" && invoice.paymentDate ? formatDate(invoice.paymentDate) : "לא שולם";
            break;
          case 'detail':
            row[columnMapping.detail] = invoice.detail || '';
            break;
          case 'supplierPhone':
            row[columnMapping.supplierPhone] = invoice.supplier?.phone || 'לא זמין';
            break;
          case 'supplierEmail':
            row[columnMapping.supplierEmail] = invoice.supplier?.email || 'לא זמין';
            break;
          case 'supplierBankName':
            row[columnMapping.supplierBankName] = invoice.supplier?.bankDetails?.bankName || 'לא זמין';
            break;
          case 'supplierBranchNumber':
            row[columnMapping.supplierBranchNumber] = invoice.supplier?.bankDetails?.branchNumber || 'לא זמין';
            break;
          case 'supplierAccountNumber':
            row[columnMapping.supplierAccountNumber] = invoice.supplier?.bankDetails?.accountNumber || 'לא זמין';
            break;
        }
      });
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(invoicesData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח חשבוניות");

    const fileName = `דוח_חשבוניות_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
    
    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${invoicesData.length} חשבוניות`, { className: "sonner-toast success rtl" });
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

  // ייצוא פשוט (הקיים)
  const exportToExcelWithSuppliers = () => {
    const invoicesWithSupplier = sortedInvoices.filter(invoice => 
      invoice.supplier && typeof invoice.supplier === 'object'
    );
    
    const totalInvoices = sortedInvoices.length;
    const supplierInvoices = invoicesWithSupplier.length;
    
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
      
      if (invoice.supplier && typeof invoice.supplier === 'object') {
        return {
          ...baseData,
          "שם ספק": invoice.supplier.name || 'לא זמין',
          "טלפון ספק": invoice.supplier.phone || 'לא זמין',
          "שם הבנק": invoice.supplier.bankDetails?.bankName || 'לא זמין',
          "מספר סניף": invoice.supplier.bankDetails?.branchNumber || 'לא זמין',
          "מספר חשבון": invoice.supplier.bankDetails?.accountNumber || 'לא זמין'
        };
      } else {
        return {
          ...baseData,
          "שם ספק": 'אין ספק מוגדר',
          "טלפון ספק": 'אין ספק מוגדר',
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

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get('/invoices');
        setAllInvoices(response.data);
        setInvoices(response.data);
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
        
        const updatedInvoices = allInvoices.filter((invoice) => invoice._id !== invoiceToDelete._id);
        setAllInvoices(updatedInvoices);
        setInvoices(updatedInvoices.filter(invoice => {
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

        setInvoiceToDelete(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("שגיאה במחיקת החשבונית", {
        className: "sonner-toast error rtl"
      });
    }
  };

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
    // אם מסמנים לשולם – פתח מודל בחירה
    if (invoice.paid !== "כן") {
      setPaymentCapture({
        open: true,
        invoice,
        defaultDate: new Date().toISOString().slice(0,10),
        defaultMethod: "",
      });
      return;
    }

    // אם מורידים מ"כן" ל"לא"
    const { data: updated } = await api.put(
      `/invoices/${invoice._id}/status`,
      { paid: "לא", paymentDate: null, paymentMethod: "" }
    );
    setInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? updated : inv));
    setAllInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? updated : inv));
    toast.success("סטטוס התשלום עודכן ל - לא", { className: "sonner-toast success rtl" });
  } catch (err) {
    console.error(err);
    toast.error("שגיאה בעדכון סטטוס התשלום", { className: "sonner-toast error rtl" });
  }
};

const handleSavePaymentCapture = async ({ paymentDate, paymentMethod }) => {
  const invoice = paymentCapture.invoice;
  if (!invoice) return;

  try {
    const { data: updated } = await api.put(
      `/invoices/${invoice._id}/status`,
      { paid: "כן", paymentDate, paymentMethod }
    );

    setInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? updated : inv));
    setAllInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? updated : inv));
    toast.success(`עודכן לשולם (${paymentMethod === "check" ? "צ׳ק" : "העברה"})`, {
      className: "sonner-toast success rtl",
    });
  } catch (err) {
    console.error(err);
    toast.error("שגיאה בשמירת פרטי התשלום", { className: "sonner-toast error rtl" });
  } finally {
    setPaymentCapture({ open: false, invoice: null, defaultDate: "", defaultMethod: "" });
  }
};


const savePaymentDate = async () => {
  try {
    const { invoice, date } = paymentDateModal;
    if (!invoice) return;

    // מעדכנים שרת עם paid="כן" + תאריך תשלום
    await api.put(`/invoices/${invoice._id}/date`, { paid: "כן", paymentDate: date });

    const updated = { ...invoice, paid: "כן", paymentDate: date };

    setInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? updated : inv));
    setAllInvoices((prev) => prev.map((inv) => inv._id === invoice._id ? updated : inv));

    setPaymentDateModal({ open: false, invoice: null, date: new Date().toISOString().slice(0,10) });
    toast.success(`סטטוס עודכן לשולם • תאריך: ${new Date(date).toLocaleDateString('he-IL')}`, {
      className: "sonner-toast success rtl",
    });
  } catch (error) {
    console.error(error);
    toast.error("שגיאה בשמירת תאריך התשלום", { className: "sonner-toast error rtl" });
  }
};

const cancelPaymentDate = () => {
  // המשתמש חזר בו; לא משנים כלום
  setPaymentDateModal({ open: false, invoice: null, date: new Date().toISOString().slice(0,10) });
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
                    <option value="invoiceNumber" className="font-bold">מספר חשבונית</option>
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
                  
                  <select
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    value={paymentFilter}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="all" className="font-bold">כל התשלומים</option>
                    <option value="paid" className="font-bold">שולמו</option>
                    <option value="unpaid" className="font-bold">לא שולמו</option>
                  </select>
                  
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

              <div className="flex gap-4">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 bg-slate-300 text-black px-6 py-2.5 rounded-3xl hover:bg-slate-900 hover:text-white transition-colors duration-200 font-medium"
                >
                  <FileSpreadsheet size={20} />
                  <span>מחולל דוחות</span>
                </button>

                <button
                  onClick={exportToExcelWithSuppliers}
                  className="flex items-center gap-2 bg-slate-300 text-black px-6 py-2.5 rounded-3xl hover:bg-slate-900 hover:text-white transition-colors duration-200 font-medium"
                >
                  <DownloadCloud size={20} />
                  <span>ייצוא מהיר</span>
                </button>
              </div>
            </div>

            {/* הצגת תוצאות */}
            <div className="mb-4 text-sm text-slate-600">
              מציג {sortedInvoices.length} חשבוניות מתוך {allInvoices.length}
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
                      <th className="px-6 py-4 text-center">שם הספק</th>
                      <th className="px-6 py-4 text-right">מספר חשבונית</th>
                      <th className="px-6 py-4 text-right">סכום</th>
                      <th className="mx-auto text-right">תאריך חשבונית</th>
                      <th className="px-6 py-4 text-center">סטטוס</th>
                      <th className="px-6 py-4 text-right">שם פרוייקט</th>
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
                          if (!e.target.closest('label')) {
                            handleView(invoice._id);
                          }
                        }}    
                      >
                        <td className="px-6 py-4 font-medium text-center">{invoice.supplier?.name}</td>
                        <td className="px-6 py-4 font-medium text-center">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4 font-medium">{formatNumber(invoice.sum)} ₪</td>
                        <td className="px-2 py-4 font-medium">{formatDate(invoice.createdAt)}</td>
                        <td className="px-6 py-4 font-medium">{invoice.status}</td>
                        <td className="px-6 py-4 font-medium">{invoice.projectName}</td>
                        <td className="px-6 py-4 font-medium">
                          {invoice.paid === "כן" ? (
                            <p className="bg-green-300 font-bold text-center p-1 rounded-md">שולם</p>
                          ) : (
                            <p className="bg-red-300 font-bold text-center p-1 rounded-md">לא שולם</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <label className="relative inline-block cursor-pointer">
                            <input
                              type="checkbox"
                              checked={invoice.paid === "כן"}
                              onChange={(e) => {
                                e.stopPropagation();
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
                            <button
  onClick={(e) => {
    e.stopPropagation();
    setMoveModal({ open: true, invoice });
  }}
  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors duration-150"
  title="העבר לפרויקט"
>
  {/* אייקון תיקייה/העברה – אפשר להשתמש ב- FolderCog או ArrowRightLeft */}
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 3h5v5" />
    <path d="M10 14L21 3" />
    <path d="M8 21H3v-5" />
    <path d="M3 21l11-11" />
  </svg>
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

        {/* מודל מחולל דוחות */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setShowReportModal(false)}

>
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">מחולל דוחות חשבוניות</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              {/* פילטרים מתקדמים */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Filter size={20} />
                  פילטרים מתקדמים
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">תאריך יצירה מ:</label>
                    <input
                      type="date"
                      value={advancedFilters.dateFrom}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, dateFrom: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">תאריך יצירה עד:</label>
                    <input
                      type="date"
                      value={advancedFilters.dateTo}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, dateTo: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">תאריך תשלום מ:</label>
                    <input
                      type="date"
                      value={advancedFilters.paymentDateFrom}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, paymentDateFrom: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">תאריך תשלום עד:</label>
                    <input
                      type="date"
                      value={advancedFilters.paymentDateTo}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, paymentDateTo: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">סכום מינימלי:</label>
                    <input
                      type="number"
                      value={advancedFilters.amountMin}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, amountMin: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">סכום מקסימלי:</label>
                    <input
                      type="number"
                      value={advancedFilters.amountMax}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, amountMax: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">שם פרויקט:</label>
                    <input
                      type="text"
                      value={advancedFilters.projectName}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, projectName: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="חיפוש חלקי..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">שם ספק:</label>
                    <input
                      type="text"
                      value={advancedFilters.supplierName}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, supplierName: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="חיפוש חלקי..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">מספר חשבונית מ:</label>
                    <input
                      type="number"
                      value={advancedFilters.invoiceNumberFrom}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, invoiceNumberFrom: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">מספר חשבונית עד:</label>
                    <input
                      type="number"
                      value={advancedFilters.invoiceNumberTo}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, invoiceNumberTo: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">יש ספק:</label>
                    <select
                      value={advancedFilters.hasSupplier}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, hasSupplier: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">הכל</option>
                      <option value="yes">יש ספק</option>
                      <option value="no">אין ספק</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">סטטוס תשלום:</label>
                    <select
                      value={advancedFilters.paymentStatus}
                      onChange={(e) => setAdvancedFilters(prev => ({...prev, paymentStatus: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">הכל</option>
                      <option value="paid">שולם</option>
                      <option value="unpaid">לא שולם</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={clearAdvancedFilters}
                    className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    <X size={16} />
                    נקה פילטרים
                  </button>
                </div>
              </div>

              {/* בחירת עמודות */}
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

              {/* סיכום הדוח */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold mb-2">סיכום הדוח:</h4>
                <p className="text-sm">
                  <strong>מספר חשבוניות:</strong> {filteredInvoices.length} <br/>
                  <strong>עמודות נבחרות:</strong> {Object.values(exportColumns).filter(v => v).length} <br/>
                  <strong>סכום כולל:</strong> {filteredInvoices.reduce((sum, inv) => sum + (inv.sum || 0), 0).toLocaleString('he-IL')} ₪ <br/>
                  <strong>חשבוניות שולמו:</strong> {filteredInvoices.filter(inv => inv.paid === "כן").length} <br/>
                  <strong>חשבוניות עם ספק:</strong> {filteredInvoices.filter(inv => inv.supplier && typeof inv.supplier === 'object').length}
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

    {paymentDateModal.open && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelPaymentDate}>
    <div
      className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-2xl font-bold mb-4 text-slate-800 text-center">בחר תאריך תשלום</h3>
      <p className="text-center text-slate-600 mb-4">
        חשבונית #{paymentDateModal.invoice?.invoiceNumber} • {paymentDateModal.invoice?.supplier?.name || paymentDateModal.invoice?.invitingName}
      </p>

      <div className="flex items-center justify-center mb-6">
        <input
          type="date"
          value={paymentDateModal.date}
          onChange={(e) => setPaymentDateModal((prev) => ({ ...prev, date: e.target.value }))}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={savePaymentDate}
          className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition"
        >
          שמור
        </button>
        <button
          onClick={cancelPaymentDate}
          className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
        >
          ביטול
        </button>
      </div>
    </div>
  </div>
)}
<MoveInvoiceModal
  open={moveModal.open}
  invoice={moveModal.invoice}
  onClose={() => setMoveModal({ open: false, invoice: null })}
  onMoved={(updatedInvoice) => {
    // עדכון במערכים
    setInvoices((prev) => prev.map(inv => inv._id === updatedInvoice._id ? updatedInvoice : inv));
    setAllInvoices((prev) => prev.map(inv => inv._id === updatedInvoice._id ? updatedInvoice : inv));
  }}
/>

<PaymentCaptureModal
  open={paymentCapture.open}
  onClose={() => setPaymentCapture({ open: false, invoice: null, defaultDate: "", defaultMethod: "" })}
  onSave={handleSavePaymentCapture}
  defaultDate={paymentCapture.defaultDate}
  defaultMethod={paymentCapture.defaultMethod}
/>

      </div>
    </div>
  );
};

export default InvoicesPage;