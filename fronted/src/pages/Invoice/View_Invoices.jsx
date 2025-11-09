import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import api from "../../api/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import {
  DownloadCloud,
  Edit2,
  Trash2,
  Filter,
  FileSpreadsheet,
  X,
  Receipt,
  Sparkles,
  Search,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import MoveInvoiceModal from "../../Components/MoveInvoiceModal.jsx";
import PaymentCaptureModal from "../../Components/PaymentCaptureModal.jsx";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentCapture, setPaymentCapture] = useState({
    open: false,
    invoice: null,
    defaultDate: new Date().toISOString().slice(0, 10),
    defaultMethod: "",
  });

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
    hasSupplier: "all",
    paymentStatus: "all",
    submissionStatus: "all",
  });

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
    supplierAccountNumber: false,
  });

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString("he-IL");
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const availableColumns = [
    { key: "invoiceNumber", label: "מספר חשבונית" },
    { key: "projectName", label: "שם פרויקט" },
    { key: "supplierName", label: "שם ספק" },
    { key: "invitingName", label: "שם מזמין" },
    { key: "sum", label: "סכום" },
    { key: "status", label: "סטטוס הגשה" },
    { key: "paid", label: "סטטוס תשלום" },
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "paymentDate", label: "תאריך תשלום" },
    { key: "detail", label: "פירוט" },
    { key: "supplierPhone", label: "טלפון ספק" },
    { key: "supplierEmail", label: "אימייל ספק" },
    { key: "supplierBankName", label: "שם בנק ספק" },
    { key: "supplierBranchNumber", label: "מספר סניף ספק" },
    { key: "supplierAccountNumber", label: "מספר חשבון ספק" },
  ];

  const getFilteredInvoices = () => {
    let filtered = [...allInvoices];

    // חיפוש כללי
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber?.toString().includes(searchTerm) ||
          invoice.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.invitingName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filtered = filtered.filter(
        (invoice) => (isPaid && invoice.paid === "כן") || (!isPaid && invoice.paid !== "כן")
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "submitted") {
        filtered = filtered.filter((invoice) => invoice.status === "הוגש");
      } else if (statusFilter === "inProgress") {
        filtered = filtered.filter((invoice) => invoice.status === "בעיבוד");
      } else if (statusFilter === "notSubmitted") {
        filtered = filtered.filter((invoice) => invoice.status === "לא הוגש");
      }
    }

    if (showReportModal) {
      if (advancedFilters.dateFrom) {
        filtered = filtered.filter(
          (invoice) => new Date(invoice.createdAt) >= new Date(advancedFilters.dateFrom)
        );
      }
      if (advancedFilters.dateTo) {
        filtered = filtered.filter(
          (invoice) => new Date(invoice.createdAt) <= new Date(advancedFilters.dateTo)
        );
      }
      if (advancedFilters.paymentDateFrom) {
        filtered = filtered.filter(
          (invoice) =>
            invoice.paymentDate &&
            new Date(invoice.paymentDate) >= new Date(advancedFilters.paymentDateFrom)
        );
      }
      if (advancedFilters.paymentDateTo) {
        filtered = filtered.filter(
          (invoice) =>
            invoice.paymentDate &&
            new Date(invoice.paymentDate) <= new Date(advancedFilters.paymentDateTo)
        );
      }
      if (advancedFilters.amountMin) {
        filtered = filtered.filter((invoice) => invoice.sum >= parseInt(advancedFilters.amountMin));
      }
      if (advancedFilters.amountMax) {
        filtered = filtered.filter((invoice) => invoice.sum <= parseInt(advancedFilters.amountMax));
      }
      if (advancedFilters.projectName) {
        filtered = filtered.filter((invoice) =>
          invoice.projectName?.toLowerCase().includes(advancedFilters.projectName.toLowerCase())
        );
      }
      if (advancedFilters.supplierName) {
        filtered = filtered.filter(
          (invoice) =>
            invoice.supplier?.name
              ?.toLowerCase()
              .includes(advancedFilters.supplierName.toLowerCase()) ||
            invoice.invitingName?.toLowerCase().includes(advancedFilters.supplierName.toLowerCase())
        );
      }
      if (advancedFilters.invoiceNumberFrom) {
        filtered = filtered.filter(
          (invoice) =>
            parseInt(invoice.invoiceNumber) >= parseInt(advancedFilters.invoiceNumberFrom)
        );
      }
      if (advancedFilters.invoiceNumberTo) {
        filtered = filtered.filter(
          (invoice) => parseInt(invoice.invoiceNumber) <= parseInt(advancedFilters.invoiceNumberTo)
        );
      }
      if (advancedFilters.hasSupplier === "yes") {
        filtered = filtered.filter(
          (invoice) => invoice.supplier && typeof invoice.supplier === "object"
        );
      } else if (advancedFilters.hasSupplier === "no") {
        filtered = filtered.filter(
          (invoice) => !invoice.supplier || typeof invoice.supplier !== "object"
        );
      }
      if (advancedFilters.paymentStatus === "paid") {
        filtered = filtered.filter((invoice) => invoice.paid === "כן");
      } else if (advancedFilters.paymentStatus === "unpaid") {
        filtered = filtered.filter((invoice) => invoice.paid !== "כן");
      }
      if (advancedFilters.submissionStatus === "submitted") {
        filtered = filtered.filter((invoice) => invoice.status === "הוגש");
      } else if (advancedFilters.submissionStatus === "inProgress") {
        filtered = filtered.filter((invoice) => invoice.status === "בעיבוד");
      } else if (advancedFilters.submissionStatus === "notSubmitted") {
        filtered = filtered.filter((invoice) => invoice.status === "לא הוגש");
      }
    }

    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  const applyFilters = () => {
    let filteredResults = [...allInvoices];

    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filteredResults = filteredResults.filter(
        (invoice) => (isPaid && invoice.paid === "כן") || (!isPaid && invoice.paid !== "כן")
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "submitted") {
        filteredResults = filteredResults.filter((invoice) => invoice.status === "הוגש");
      } else if (statusFilter === "inProgress") {
        filteredResults = filteredResults.filter((invoice) => invoice.status === "בעיבוד");
      } else if (statusFilter === "notSubmitted") {
        filteredResults = filteredResults.filter((invoice) => invoice.status === "לא הוגש");
      }
    }

    setInvoices(filteredResults);
  };

  const resetFilters = () => {
    setPaymentFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
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

  useEffect(() => {
    if (allInvoices.length > 0) {
      applyFilters();
    }
  }, [paymentFilter, statusFilter]);

  const sortedInvoices = [...(searchTerm ? filteredInvoices : invoices)].sort((a, b) => {
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
      supplierAccountNumber: "מספר חשבון ספק",
    };

    const selectedColumns = Object.keys(exportColumns).filter((key) => exportColumns[key]);

    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const invoicesData = dataToExport.map((invoice) => {
      const row = {};

      selectedColumns.forEach((col) => {
        switch (col) {
          case "invoiceNumber":
            row[columnMapping.invoiceNumber] = invoice.invoiceNumber || "";
            break;
          case "projectName":
            row[columnMapping.projectName] = invoice.projectName || "";
            break;
          case "supplierName":
            row[columnMapping.supplierName] =
              invoice.supplier?.name || invoice.invitingName || "אין ספק מוגדר";
            break;
          case "invitingName":
            row[columnMapping.invitingName] = invoice.invitingName || "";
            break;
          case "sum":
            row[columnMapping.sum] = invoice.sum || 0;
            break;
          case "status":
            row[columnMapping.status] = invoice.status || "";
            break;
          case "paid":
            row[columnMapping.paid] = invoice.paid === "כן" ? "שולם" : "לא שולם";
            break;
          case "createdAt":
            row[columnMapping.createdAt] = formatDate(invoice.createdAt);
            break;
          case "paymentDate":
            row[columnMapping.paymentDate] =
              invoice.paid === "כן" && invoice.paymentDate
                ? formatDate(invoice.paymentDate)
                : "לא שולם";
            break;
          case "detail":
            row[columnMapping.detail] = invoice.detail || "";
            break;
          case "supplierPhone":
            row[columnMapping.supplierPhone] = invoice.supplier?.phone || "לא זמין";
            break;
          case "supplierEmail":
            row[columnMapping.supplierEmail] = invoice.supplier?.email || "לא זמין";
            break;
          case "supplierBankName":
            row[columnMapping.supplierBankName] =
              invoice.supplier?.bankDetails?.bankName || "לא זמין";
            break;
          case "supplierBranchNumber":
            row[columnMapping.supplierBranchNumber] =
              invoice.supplier?.bankDetails?.branchNumber || "לא זמין";
            break;
          case "supplierAccountNumber":
            row[columnMapping.supplierAccountNumber] =
              invoice.supplier?.bankDetails?.accountNumber || "לא זמין";
            break;
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(invoicesData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח חשבוניות");

    const fileName = `דוח_חשבוניות_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${invoicesData.length} חשבוניות`, {
      className: "sonner-toast success rtl",
    });
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

  const exportToExcelWithSuppliers = () => {
    const invoicesWithSupplier = sortedInvoices.filter(
      (invoice) => invoice.supplier && typeof invoice.supplier === "object"
    );

    const totalInvoices = sortedInvoices.length;
    const supplierInvoices = invoicesWithSupplier.length;

    const invoicesWithHeaders = sortedInvoices.map((invoice) => {
      const baseData = {
        "מספר חשבונית": invoice.invoiceNumber,
        "שם המזמין": invoice.invitingName,
        "שם הפרוייקט": invoice.projectName,
        "תאריך יצירה": formatDate(invoice.createdAt),
        סכום: formatNumber(invoice.sum),
        סטטוס: invoice.status,
        פירוט: invoice.detail,
        שולם: invoice.paid === "כן" ? "כן" : "לא",
        "תאריך תשלום": invoice.paid === "כן" ? formatDate(invoice.paymentDate) : "לא שולם",
      };

      if (invoice.supplier && typeof invoice.supplier === "object") {
        return {
          ...baseData,
          "שם ספק": invoice.supplier.name || "לא זמין",
          "טלפון ספק": invoice.supplier.phone || "לא זמין",
          "שם הבנק": invoice.supplier.bankDetails?.bankName || "לא זמין",
          "מספר סניף": invoice.supplier.bankDetails?.branchNumber || "לא זמין",
          "מספר חשבון": invoice.supplier.bankDetails?.accountNumber || "לא זמין",
        };
      } else {
        return {
          ...baseData,
          "שם ספק": "אין ספק מוגדר",
          "טלפון ספק": "אין ספק מוגדר",
          "שם הבנק": "אין ספק מוגדר",
          "מספר סניף": "אין ספק מוגדר",
          "מספר חשבון": "אין ספק מוגדר",
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
        duration: 4000,
      }
    );
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get("/invoices");
        setAllInvoices(response.data);
        setInvoices(response.data);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl",
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

        const updatedInvoices = allInvoices.filter(
          (invoice) => invoice._id !== invoiceToDelete._id
        );
        setAllInvoices(updatedInvoices);
        setInvoices(
          updatedInvoices.filter((invoice) => {
            let matchesPaymentFilter =
              paymentFilter === "all" ||
              (paymentFilter === "paid" && invoice.paid === "כן") ||
              (paymentFilter === "unpaid" && invoice.paid !== "כן");

            let matchesStatusFilter =
              statusFilter === "all" ||
              (statusFilter === "submitted" && invoice.status === "הוגש") ||
              (statusFilter === "inProgress" && invoice.status === "בעיבוד") ||
              (statusFilter === "notSubmitted" && invoice.status === "לא הוגש");

            return matchesPaymentFilter && matchesStatusFilter;
          })
        );

        setShowModal(false);
        toast.success("החשבונית נמחקה בהצלחה", {
          className: "sonner-toast success rtl",
        });

        setInvoiceToDelete(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("שגיאה במחיקת החשבונית", {
        className: "sonner-toast error rtl",
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

  const togglePaymentStatus = async (invoice) => {
    try {
      if (invoice.paid !== "כן") {
        setPaymentCapture({
          open: true,
          invoice,
          defaultDate: new Date().toISOString().slice(0, 10),
          defaultMethod: "",
        });
        return;
      }

      const { data: updated } = await api.put(`/invoices/${invoice._id}/status`, {
        paid: "לא",
        paymentDate: null,
        paymentMethod: "",
      });
      setInvoices((prev) => prev.map((inv) => (inv._id === invoice._id ? updated : inv)));
      setAllInvoices((prev) => prev.map((inv) => (inv._id === invoice._id ? updated : inv)));
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
      const { data: updated } = await api.put(`/invoices/${invoice._id}/status`, {
        paid: "כן",
        paymentDate,
        paymentMethod,
      });

      setInvoices((prev) => prev.map((inv) => (inv._id === invoice._id ? updated : inv)));
      setAllInvoices((prev) => prev.map((inv) => (inv._id === invoice._id ? updated : inv)));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">טוען רשימת חשבוניות...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Receipt className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">רשימת חשבוניות</h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      ניהול וניתוח חשבוניות
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
                    placeholder="חיפוש לפי מספר חשבונית, פרויקט או ספק..."
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
        <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
            {/* Sort & Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">מיין לפי:</span>
              </div>
              <select
                onChange={(e) => setSortBy(e.target.value)}
                value={sortBy}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="sum">סכום</option>
                <option value="createdAt">תאריך יצירה</option>
                <option value="invoiceNumber">מספר חשבונית</option>
                <option value="projectName">שם פרוייקט</option>
              </select>
              <select
                onChange={(e) => setSortOrder(e.target.value)}
                value={sortOrder}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="asc">עולה</option>
                <option value="desc">יורד</option>
              </select>

              <div className="flex items-center gap-2">
                <Filter className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">סינון:</span>
              </div>
              <select
                onChange={(e) => setPaymentFilter(e.target.value)}
                value={paymentFilter}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="all">כל התשלומים</option>
                <option value="paid">שולמו</option>
                <option value="unpaid">לא שולמו</option>
              </select>
              <select
                onChange={(e) => setStatusFilter(e.target.value)}
                value={statusFilter}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="submitted">הוגשו</option>
                <option value="inProgress">בעיבוד</option>
                <option value="notSubmitted">לא הוגשו</option>
              </select>

              {(paymentFilter !== "all" || statusFilter !== "all" || searchTerm) && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-bold"
                >
                  נקה סינון
                </button>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>מחולל דוחות</span>
              </button>

              <button
                onClick={exportToExcelWithSuppliers}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>ייצוא מהיר</span>
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600 font-medium">
            מציג {sortedInvoices.length} חשבוניות מתוך {allInvoices.length}
          </div>
        </div>

        {/* Invoices Table */}
        {sortedInvoices.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <th className="px-4 py-4 text-sm font-bold text-white">שם הספק</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">מספר חשבונית</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">סכום</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">תאריך חשבונית</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">סטטוס</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">שם פרוייקט</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">תשלום</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">סימון תשלום</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors"
                      onClick={(e) => {
                        if (!e.target.closest("label")) {
                          handleView(invoice._id);
                        }
                      }}
                    >
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                        {invoice.supplier?.name || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-900">
                        {formatNumber(invoice.sum)} ₪
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 text-center">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                        {invoice.status}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">
                        {invoice.projectName}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {invoice.paid === "כן" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            שולם
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            לא שולם
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
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
                                ${
                                  invoice.paid === "כן"
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "bg-gray-200 border-gray-400"
                                }
                                flex items-center justify-center relative`}
                          >
                            {invoice.paid === "כן" && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                className="w-5 h-5"
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(invoice._id);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDelete(invoice);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveModal({ open: true, invoice });
                            }}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="העבר לפרויקט"
                          >
                            <ArrowLeftRight className="w-5 h-5" />
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
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">
              {searchTerm || paymentFilter !== "all" || statusFilter !== "all"
                ? "לא נמצאו תוצאות"
                : "עדיין אין חשבוניות"}
            </h2>
          </div>
        )}

        {/* Delete Modal - keeping existing modals exactly as they were */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">האם אתה בטוח?</h3>
                  <p className="text-slate-600">שים לב! פעולה זו תמחק את החשבונית לצמיתות.</p>
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

        <MoveInvoiceModal
          open={moveModal.open}
          invoice={moveModal.invoice}
          onClose={() => setMoveModal({ open: false, invoice: null })}
          onMoved={(updatedInvoice) => {
            setInvoices((prev) =>
              prev.map((inv) => (inv._id === updatedInvoice._id ? updatedInvoice : inv))
            );
            setAllInvoices((prev) =>
              prev.map((inv) => (inv._id === updatedInvoice._id ? updatedInvoice : inv))
            );
          }}
        />

        <PaymentCaptureModal
          open={paymentCapture.open}
          onClose={() =>
            setPaymentCapture({ open: false, invoice: null, defaultDate: "", defaultMethod: "" })
          }
          onSave={handleSavePaymentCapture}
          defaultDate={paymentCapture.defaultDate}
          defaultMethod={paymentCapture.defaultMethod}
        />
      </div>
    </div>
  );
};

export default InvoicesPage;