import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { ClipLoader } from "react-spinners";
import api from "../../api/api.js";
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
  ArrowLeftRight,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import MoveInvoiceModal from "../../Components/MoveInvoiceModal.jsx";
import PaymentCaptureModal from "../../Components/PaymentCaptureModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { FileText, Paperclip, Link } from "lucide-react";
import MasavModal from "../../Components/MasavModal.jsx";
import MasavHistoryModal from "../../Components/MasavHistoryModal.jsx";
import MultiSelectDropdown from "../../Components/MultiSelectDropdown.jsx";
import QuickFileUploadModal from "../../Components/QuickFileUploadModal.jsx";


// פונקציית עזר לסידור עברי נכון (א'-ב')

const hebrewSort = (strA, strB) => {
  const a = (strA || "").trim();
  const b = (strB || "").trim();

  // השווה תו אחר תו לפי Unicode של תווים עבריים
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const codeA = a.charCodeAt(i);
    const codeB = b.charCodeAt(i);

    // בדוק אם שני התווים הם עבריים (Unicode range: 0x05D0-0x05EA)
    const isHebrewA = codeA >= 0x05D0 && codeA <= 0x05EA;
    const isHebrewB = codeB >= 0x05D0 && codeB <= 0x05EA;

    if (isHebrewA && isHebrewB) {
      if (codeA !== codeB) {
        return codeA - codeB; // סידור לפי Unicode של אותיות עבריות (א=1488, ב=1489...)
      }
    }
    // אם רק אחד עברי, העברי לפני
    else if (isHebrewA) return -1;
    else if (isHebrewB) return 1;
    // אם שניהם לא עבריים, השווה רגיל
    else if (codeA !== codeB) {
      return codeA - codeB;
    }
  }

  // אם כל התווים זהים, הקצר יותר לפני
  return a.length - b.length;
};


// פונקציית עזר להצגת שמות פרויקטים ללא מילגה

const getPaymentStatusText = (invoice) => {
  if (invoice.paid !== "כן") return invoice.paid === "יצא לתשלום" ? "יצא לתשלום" : "לא שולם";
  if (invoice.paymentMethod === "check") return "שולם בצ'ק";
  if (invoice.paymentMethod === "credit_card") return "שולם באשראי";
  return "שולם";
};

const getProjectNamesWithoutMilga = (projects) => {
  const milga = projects.find((p) => p.projectName === "מילגה");
  if (milga) return "מילגה";
  return projects.map((p) => p.projectName).join(", ");
};

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
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
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [showPaymentExportModal, setShowPaymentExportModal] = useState(false);
  const [exportPaymentStatusFilter, setExportPaymentStatusFilter] = useState("unpaid"); // לא שולם, שולם, יצא לתשלום, הכל

  const [paymentFilter, setPaymentFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [uploadModal, setUploadModal] = useState({ open: false, invoice: null });

  const [selectedProjectForPrint, setSelectedProjectForPrint] = useState([]);
  const [selectedSupplierForPrint, setSelectedSupplierForPrint] = useState([]);
  const [fromDatePrint, setFromDatePrint] = useState("");
  const [toDatePrint, setToDatePrint] = useState("");
  const [fromPaymentDatePrint, setFromPaymentDatePrint] = useState("");
  const [toPaymentDatePrint, setToPaymentDatePrint] = useState("");
  const [projectsForPrint, setProjectsForPrint] = useState([]);
  const [suppliersForPrint, setSuppliersForPrint] = useState([]);
  const [projectSearchForPrint, setProjectSearchForPrint] = useState("");
  const [supplierSearchForPrint, setSupplierSearchForPrint] = useState("");

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
    documentStatus: "all",
  });

  // ✅ Ref למניעת שמירה בפעם הראשונה
  const isFirstRender = useRef(true);

  const [exportColumns, setExportColumns] = useState({
    invoiceNumber: true,
    projectName: true,
    supplierName: true,
    invitingName: true,
    totalAmount: true,
    status: true,
    paid: true,
    invoiceDate: true,
    createdAt: true,
    paymentDate: true,
    documentType: true,
    paymentMethod: true,
    detail: true,
    supplierPhone: true,
    supplierEmail: true,
    supplierBankName: true,
    supplierBranchNumber: true,
    supplierAccountNumber: true,
  });
  const [masavModal, setMasavModal] = useState(false);
  const [masavHistoryModal, setMasavHistoryModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [showBulkSubmissionModal, setShowBulkSubmissionModal] = useState(false);
  const [bulkPaymentDate, setBulkPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState("");
  const [bulkCheckNumber, setBulkCheckNumber] = useState("");
  const [bulkCheckDate, setBulkCheckDate] = useState("");
  const [documentStatusFilter, setDocumentStatusFilter] = useState([]);

  const { user, isAdmin, isLimited, canEditModule, canViewModule } = useAuth();
  const navigate = useNavigate();

  // קבל את הפרויקט הנוכחי
  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedProjectId = authUser?.selectedProject;

  // ✅ בדיקת הרשאה לצפות בחשבוניות
  const canViewInvoices = () => {
    if (isAdmin) return true;
    if (user?.role === "accountant") return true; // רואת חשבון יכולה לצפות
    if (user?.role === "limited") return true; // משתמש מוגבל יכול לצפות בחשבוניות (מוגבל ל-20)
    if (!user?.permissions) return false;

    // בדוק אם יש לו הרשאת view או edit לחשבוניות באיזשהו פרויקט
    return user.permissions.some((p) => {
      const level = p.modules?.invoices;
      return level === "view" || level === "edit";
    });
  };

  // ✅ קבל רשימת פרויקטים מורשים
  const getAllowedProjectIds = () => {
    if (isAdmin) return null; // אדמין רואה הכל
    if (user?.role === "accountant") return null; // רואת חשבון רואה הכל
    if (!user?.permissions) return [];

    return user.permissions
      .filter((p) => {
        const level = p.modules?.invoices;
        return level === "view" || level === "edit";
      })
      .map((p) => String(p.project?._id || p.project))
      .filter(Boolean);
  };

  // ✅ הפנה לדף "אין גישה" אם אין הרשאה
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (!canViewInvoices()) {
      toast.error("אין לך הרשאה לצפות בחשבוניות", {
        className: "sonner-toast error rtl",
      });
      navigate("/");
    }
  }, [loading, user, navigate]);

  // 🔄 Restore filter state from localStorage when returning from invoice details
  useEffect(() => {
    const savedFilters = localStorage.getItem('invoiceFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        // רק אם באנו מרשימת החשבוניות (יש לנו את הסימן)
        if (filters._fromInvoiceList) {
          if (filters.searchTerm !== undefined) setSearchTerm(filters.searchTerm);
          if (filters.paymentFilter !== undefined) setPaymentFilter(filters.paymentFilter);
          if (filters.statusFilter !== undefined) setStatusFilter(filters.statusFilter);
          if (filters.documentStatusFilter !== undefined) setDocumentStatusFilter(filters.documentStatusFilter);
          if (filters.advancedFilters !== undefined) setAdvancedFilters(filters.advancedFilters);
          if (filters.sortBy !== undefined) setSortBy(filters.sortBy);
          if (filters.sortOrder !== undefined) setSortOrder(filters.sortOrder);

          // 🔥 לא מוחקים את הסינון - ככה הוא נשמר גם אחרי יצירת חשבונית
          // localStorage.removeItem('invoiceFilters');
        }
      } catch (error) {
        console.error('Error restoring invoice filters:', error);
      }
    }
  }, []);

  // 💾 שמור סינונים אוטומטית כל פעם שהם משתנים
  useEffect(() => {
    // ✅ דלג על שמירה בפעם הראשונה (כדי לא לדרוס את הסינונים השמורים)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const filterState = {
      searchTerm,
      paymentFilter,
      statusFilter,
      documentStatusFilter,
      advancedFilters,
      sortBy,
      sortOrder,
      _fromInvoiceList: true,
    };
    localStorage.setItem('invoiceFilters', JSON.stringify(filterState));
  }, [searchTerm, paymentFilter, statusFilter, documentStatusFilter, advancedFilters, sortBy, sortOrder]);

  // בדיקות הרשאות
  const canEditInvoices =
    isAdmin || canEditModule(selectedProjectId, "invoices");

  const availableColumns = [
    { key: "invoiceNumber", label: "מספר חשבונית" },
    { key: "projectName", label: "שם הפרוייקט" },
    { key: "supplierName", label: "שם ספק" }, // ✅ הוסף את זה
    { key: "invitingName", label: "שם המזמין" },
    { key: "totalAmount", label: "סכום" },
    { key: "status", label: "סטטוס הגשה" },
    { key: "invoiceDate", label: "תאריך חשבונית" },
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "detail", label: "פירוט" },
    { key: "paid", label: "סטטוס תשלום" },
    { key: "paymentDate", label: "תאריך תשלום" },
    { key: "documentType", label: "סוג מסמך" },
    { key: "paymentMethod", label: "אמצעי תשלום" },
    // ✅ הוסף את כל עמודות הספק:
    { key: "supplierPhone", label: "טלפון ספק" },
    { key: "supplierEmail", label: "אימייל ספק" },
    { key: "supplierBankName", label: "שם בנק ספק" },
    { key: "supplierBranchNumber", label: "מספר סניף ספק" },
    { key: "supplierAccountNumber", label: "מספר חשבון ספק" },
  ];

  const formatNumber = (num) => num?.toLocaleString("he-IL");
  const formatDate = (dateTime) => {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // פונקציה לתרגום צורת תשלום לעברית
  const translatePaymentMethod = (method) => {
    const translations = {
      "check": "צ'ק",
      "bank_transfer": "העברה בנקאית",
      "credit_card": "כרטיס אשראי",
      "": "לא זמין"
    };
    return translations[method] || method || "לא זמין";
  };

  // 🆕 פונקציה לספירת קבצים בחשבונית
  const getInvoiceFilesCount = (invoice) => {
    let count = 0;

    // ספור files (מערך)
    if (Array.isArray(invoice.files) && invoice.files.length > 0) {
      count += invoice.files.length;
    }

    // ספור file יחיד (חשבוניות ישנות)
    if (
      invoice.file &&
      typeof invoice.file === "string" &&
      invoice.file.trim() !== "" &&
      invoice.file.startsWith("http")
    ) {
      count += 1;
    }

    return count;
  };

  const normalizeDate = (d) => {
    if (!d) return null;
    const raw = d?.$date || d;
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const INTERIM_TYPES = new Set(["ח. עסקה", "ה. עבודה", "ד. תשלום"]);
  const FINAL_TYPES = new Set([
    "חשבונית מס/קבלה",
    "חשבונית מס / קבלה",
    "חשבונית מס-קבלה",
    "חשבונית מס קבלה",
    "אין צורך",  // 🆕 אין צורך גם נחשב כהושלם
  ]);

  const normalizeType = (t) =>
    String(t || "")
      .replace(/\s+/g, " ")
      .replace(/\s*\/\s*/g, "/")
      .trim();

  const getActionState = (invoice) => {
    // ✅ בדיקה ראשונה - אם החשבונית יצאה לתשלום
    if (invoice.paid === "יצא לתשלום") {
      return {
        status: "יצא",
        label: "לתשלום",
        color: "bg-blue-100 text-blue-700 border-blue-300"
      };
    }

    const t = normalizeType(invoice?.documentType);
    const okF = FINAL_TYPES.has(t);
    const okI = INTERIM_TYPES.has(t);

    const status = okF ? "הושלם" : "חסר";
    // ✅ אם זה "אין צורך" - תציג "אין צורך", אחרת "חשבונית מס/קבלה"
    const label = okF
      ? (t === "אין צורך" ? "אין צורך" : "חשבונית מס/קבלה")
      : okI ? t : "—";
    const color = okF
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

    return { status, label, color };
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
    const fetchProjectsAndSuppliers = async () => {
      try {
        const [projectsRes, suppliersRes] = await Promise.all([
          api.get("/projects"),
          api.get("/suppliers"),
        ]);

        const projectsData = Array.isArray(projectsRes.data?.data)
          ? projectsRes.data.data
          : Array.isArray(projectsRes.data)
            ? projectsRes.data
            : [];

        const suppliersData = Array.isArray(suppliersRes.data?.data)
          ? suppliersRes.data.data
          : Array.isArray(suppliersRes.data)
            ? suppliersRes.data
            : [];

        setProjectsForPrint(projectsData);
        setSuppliersForPrint(suppliersData);
      } catch (error) {
        console.error("Error fetching projects/suppliers:", error);
      }
    };

    fetchProjectsAndSuppliers();
  }, []);

  const getFilteredInvoices = () => {
    let filtered = [...allInvoices];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();

      filtered = filtered.filter((invoice) => {
        // חיפוש במספר חשבונית
        if (invoice.invoiceNumber?.toString().includes(searchTerm)) return true;

        // חיפוש בשמות פרויקטים
        if ((invoice.projects || []).some((p) => p.projectName?.toLowerCase().includes(q))) return true;

        // חיפוש בשם ספק או עובד
        const supplierOrEmployee = invoice.type === "salary"
          ? invoice.salaryEmployeeName
          : invoice.supplierId?.name || "";
        if (supplierOrEmployee.toLowerCase().includes(q)) return true;

        // חיפוש בשם מזמין
        if ((invoice.invitingName || "").toLowerCase().includes(q)) return true;

        // חיפוש בפירוט
        if ((invoice.detail || "").toLowerCase().includes(q)) return true;

        // חיפוש בסכום כולל
        if (invoice.totalAmount?.toString().includes(searchTerm)) return true;

        // חיפוש בסטטוס
        if ((invoice.status || "").toLowerCase().includes(q)) return true;

        // חיפוש בסוג מסמך
        if ((invoice.documentType || "").toLowerCase().includes(q)) return true;

        // חיפוש בתאריך (פורמט עברי)
        if (invoice.createdAt) {
          const dateStr = new Date(invoice.createdAt).toLocaleDateString('he-IL');
          if (dateStr.includes(searchTerm)) return true;
        }

        return false;
      });
    }

    // סינון לפי סטטוס תשלום (multi-select)
    if (paymentFilter.length > 0) {
      filtered = filtered.filter((invoice) => {
        if (paymentFilter.includes("paid") && invoice.paid === "כן") return true;
        if (paymentFilter.includes("sent_to_payment") && invoice.paid === "יצא לתשלום") return true;
        if (paymentFilter.includes("unpaid") && invoice.paid === "לא") return true;
        if (paymentFilter.includes("not_for_payment") && invoice.paid === "לא לתשלום") return true;
        return false;
      });
    }

    // סינון לפי סטטוס הגשה (multi-select)
    if (statusFilter.length > 0) {
      filtered = filtered.filter((invoice) => {
        if (statusFilter.includes("submitted") && invoice.status === "הוגש") return true;
        if (statusFilter.includes("inProgress") && invoice.status === "בעיבוד") return true;
        if (statusFilter.includes("notSubmitted") && invoice.status === "לא הוגש") return true;
        return false;
      });
    }

    // סינון לפי תאריך תשלום (תמיד פעיל)
    if (advancedFilters.paymentDateFrom) {
      const paidFrom = normalizeDate(advancedFilters.paymentDateFrom);
      if (paidFrom) {
        filtered = filtered.filter((inv) => {
          const d = normalizeDate(inv.paymentDate);
          return d && d >= paidFrom;
        });
      }
    }
    if (advancedFilters.paymentDateTo) {
      const paidTo = normalizeDate(advancedFilters.paymentDateTo);
      if (paidTo) {
        filtered = filtered.filter((inv) => {
          const d = normalizeDate(inv.paymentDate);
          return d && d <= paidTo;
        });
      }
    }

    if (showReportModal) {
      const createdFrom = normalizeDate(advancedFilters.dateFrom);
      const createdTo = normalizeDate(advancedFilters.dateTo);
      const paidFrom = normalizeDate(advancedFilters.paymentDateFrom);
      const paidTo = normalizeDate(advancedFilters.paymentDateTo);

      if (createdFrom) {
        filtered = filtered.filter((inv) => {
          const d = normalizeDate(inv.createdAt);
          return d && d >= createdFrom;
        });
      }
      if (createdTo) {
        filtered = filtered.filter((inv) => {
          const d = normalizeDate(inv.createdAt);
          return d && d <= createdTo;
        });
      }
      if (paidFrom) {
        filtered = filtered.filter((inv) => {
          const d = normalizeDate(inv.paymentDate);
          return d && d >= paidFrom;
        });
      }
      if (paidTo) {
        filtered = filtered.filter((inv) => {
          const d = normalizeDate(inv.paymentDate);
          return d && d <= paidTo;
        });
      }

      if (advancedFilters.amountMin) {
        filtered = filtered.filter(
          (inv) => Number(inv.totalAmount) >= Number(advancedFilters.amountMin)
        );
      }
      if (advancedFilters.amountMax) {
        filtered = filtered.filter(
          (inv) => Number(inv.totalAmount) <= Number(advancedFilters.amountMax)
        );
      }

      if (advancedFilters.projectName) {
        const q = advancedFilters.projectName.toLowerCase();
        filtered = filtered.filter((inv) =>
          inv.projects?.some((p) => p.projectName?.toLowerCase().includes(q))
        );
      }

      if (advancedFilters.supplierName) {
        const q = advancedFilters.supplierName.toLowerCase();
        filtered = filtered.filter((inv) =>
          (inv.supplierId?.name || "").toLowerCase().includes(q)
        );
      }

      if (advancedFilters.invoiceNumberFrom) {
        filtered = filtered.filter(
          (inv) =>
            Number(inv.invoiceNumber) >=
            Number(advancedFilters.invoiceNumberFrom)
        );
      }
      if (advancedFilters.invoiceNumberTo) {
        filtered = filtered.filter(
          (inv) =>
            Number(inv.invoiceNumber) <= Number(advancedFilters.invoiceNumberTo)
        );
      }

      if (advancedFilters.hasSupplier === "yes") {
        filtered = filtered.filter(
          (inv) => inv.supplier && typeof inv.supplier === "object"
        );
      } else if (advancedFilters.hasSupplier === "no") {
        filtered = filtered.filter(
          (inv) => !inv.supplier || typeof inv.supplier !== "object"
        );
      }

      if (advancedFilters.paymentStatus === "paid") {
        filtered = filtered.filter((inv) => inv.paid === "כן");
      } else if (advancedFilters.paymentStatus === "unpaid") {
        filtered = filtered.filter((inv) => inv.paid === "לא");
      } else if (advancedFilters.paymentStatus === "sent_to_payment") {
        filtered = filtered.filter((inv) => inv.paid === "יצא לתשלום");
      } else if (advancedFilters.paymentStatus === "not_for_payment") {
        filtered = filtered.filter((inv) => inv.paid === "לא לתשלום");
      }

      if (advancedFilters.submissionStatus === "submitted") {
        filtered = filtered.filter((inv) => inv.status === "הוגש");
      } else if (advancedFilters.submissionStatus === "inProgress") {
        filtered = filtered.filter((inv) => inv.status === "בעיבוד");
      } else if (advancedFilters.submissionStatus === "notSubmitted") {
        filtered = filtered.filter((inv) => inv.status === "לא הוגש");
      }

      if (advancedFilters.documentType) {
        const wanted = advancedFilters.documentType.trim();
        filtered = filtered.filter(
          (inv) => (inv.documentType || "").trim() === wanted
        );
      }

      if (advancedFilters.paymentMethod) {
        const wanted = advancedFilters.paymentMethod.trim();
        filtered = filtered.filter(
          (inv) => (inv.paymentMethod || "").trim() === wanted
        );
      }
      if (advancedFilters.documentStatus === "completed") {
        filtered = filtered.filter((inv) => {
          const state = getActionState(inv);
          return state.status === "הושלם";
        });
      } else if (advancedFilters.documentStatus === "missing") {
        filtered = filtered.filter((inv) => {
          const state = getActionState(inv);
          return state.status === "חסר";
        });
      }
    }
    // סינון לפי סטטוס מסמך (חסר/הושלם) - multi-select
    if (documentStatusFilter.length > 0) {
      filtered = filtered.filter((invoice) => {
        const state = getActionState(invoice);
        if (documentStatusFilter.includes("completed") && state.status === "הושלם") return true;
        if (documentStatusFilter.includes("missing") && state.status === "חסר") return true;
        return false;
      });
    }

    // הגבלת 20 חשבוניות אחרונות למשתמש limited
    if (isLimited) {
      filtered = filtered
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
    }

    return filtered;
  };

  const filteredInvoices = useMemo(() => getFilteredInvoices(),
    [allInvoices, invoices, searchTerm, paymentFilter, statusFilter, documentStatusFilter, advancedFilters, showReportModal, isLimited]);

  const applyFilters = () => {
    let filteredResults = [...allInvoices];

    // סינון לפי סטטוס תשלום (multi-select)
    if (paymentFilter.length > 0) {
      filteredResults = filteredResults.filter((invoice) => {
        if (paymentFilter.includes("paid") && invoice.paid === "כן") return true;
        if (paymentFilter.includes("sent_to_payment") && invoice.paid === "יצא לתשלום") return true;
        if (paymentFilter.includes("unpaid") && invoice.paid === "לא") return true;
        if (paymentFilter.includes("not_for_payment") && invoice.paid === "לא לתשלום") return true;
        return false;
      });
    }

    // סינון לפי סטטוס הגשה (multi-select)
    if (statusFilter.length > 0) {
      filteredResults = filteredResults.filter((invoice) => {
        if (statusFilter.includes("submitted") && invoice.status === "הוגש") return true;
        if (statusFilter.includes("inProgress") && invoice.status === "בעיבוד") return true;
        if (statusFilter.includes("notSubmitted") && invoice.status === "לא הוגש") return true;
        return false;
      });
    }

    setInvoices(filteredResults);
  };

  const resetFilters = useCallback(() => {
    setPaymentFilter([]);
    setStatusFilter([]);
    setSearchTerm("");
    setInvoices(allInvoices);
    setDocumentStatusFilter([]);
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
      documentStatus: "all",
    });
    localStorage.removeItem('invoiceFilters');
  }, [allInvoices]);

  const clearAdvancedFilters = useCallback(() => {
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
      documentStatus: "all",
    });
    localStorage.removeItem('invoiceFilters');
  }, []);

  useEffect(() => {
    if (allInvoices.length > 0) {
      applyFilters();
    }
  }, [paymentFilter, statusFilter]);

  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e) => e.key === "Escape" && setShowReportModal(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const sortedInvoices = useMemo(() => [...filteredInvoices].sort((a, b) => {
    if (sortBy === "totalAmount") {
      return sortOrder === "asc"
        ? a.totalAmount - b.totalAmount
        : b.totalAmount - a.totalAmount;
    }
    if (sortBy === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === "paymentDate") {
      const aDate = a.paymentDate ? new Date(a.paymentDate) : new Date(0);
      const bDate = b.paymentDate ? new Date(b.paymentDate) : new Date(0);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }
    if (sortBy === "invoiceNumber") {
      return sortOrder === "asc"
        ? a.invoiceNumber - b.invoiceNumber
        : b.invoiceNumber - a.invoiceNumber;
    }
    if (sortBy === "projectName") {
      const aName = a.projects?.[0]?.projectName || "";
      const bName = b.projects?.[0]?.projectName || "";

      return sortOrder === "asc"
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }
    if (sortBy === "supplierName") {
      const aName = a.supplierId?.name || "";
      const bName = b.supplierId?.name || "";

      return sortOrder === "asc"
        ? hebrewSort(aName, bName)
        : hebrewSort(bName, aName);
    }

    return 0;
  }), [filteredInvoices, sortBy, sortOrder]);

  // מיפוי הוצאות לחשבוניות (reverse lookup)
  const invoiceToExpenseMap = useMemo(() => {
    const map = {};
    allExpenses.forEach(expense => {
      if (expense.linkedInvoices && expense.linkedInvoices.length > 0) {
        expense.linkedInvoices.forEach(invoiceRef => {
          const invoiceId = invoiceRef._id || invoiceRef;
          if (!map[invoiceId]) {
            map[invoiceId] = [];
          }
          map[invoiceId].push(expense);
        });
      }
    });
    return map;
  }, [allExpenses]);

  // רשימה שטוחה של החשבוניות בסדר התצוגה בפועל (לשימוש ב-Shift selection)
  const displayOrderInvoices = useMemo(() => {
    const grouped = sortedInvoices.reduce((acc, invoice) => {
      if (!invoice.createdAt) return acc;
      const date = new Date(invoice.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!acc[key]) {
        acc[key] = { year: date.getFullYear(), month: date.getMonth(), invoices: [] };
      }
      acc[key].invoices.push(invoice);
      return acc;
    }, {});

    return Object.values(grouped)
      .map(group => ({
        ...group,
        // שמור על סדר המיון שנבחר - לא למיין מחדש בתוך הקבוצה
        invoices: group.invoices,
      }))
      .sort((a, b) => new Date(b.year, b.month) - new Date(a.year, a.month))
      .flatMap(group => group.invoices);
  }, [sortedInvoices]);

  const generateInvoicesPrint = () => {
    let filteredForPrint = [...allInvoices];

    if (selectedProjectForPrint.length > 0) {
      filteredForPrint = filteredForPrint.filter((inv) =>
        inv.projects?.some((p) => selectedProjectForPrint.includes(String(p.projectId)))
      );
    }

    if (selectedSupplierForPrint.length > 0) {
      filteredForPrint = filteredForPrint.filter(
        (inv) => selectedSupplierForPrint.includes(String(inv.supplierId?._id))
      );
    }

    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filteredForPrint = filteredForPrint.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate >= fromDate;
      });
    }

    if (toDatePrint) {
      const toDate = new Date(toDatePrint);
      filteredForPrint = filteredForPrint.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate <= toDate;
      });
    }

    // סינון לפי תאריך תשלום
    if (fromPaymentDatePrint) {
      const fromDate = new Date(fromPaymentDatePrint);
      filteredForPrint = filteredForPrint.filter((inv) => {
        if (!inv.paymentDate) return false;
        const paymentDate = new Date(inv.paymentDate);
        return paymentDate >= fromDate;
      });
    }

    if (toPaymentDatePrint) {
      const toDate = new Date(toPaymentDatePrint);
      filteredForPrint = filteredForPrint.filter((inv) => {
        if (!inv.paymentDate) return false;
        const paymentDate = new Date(inv.paymentDate);
        return paymentDate <= toDate;
      });
    }

    if (filteredForPrint.length === 0) {
      toast.error("לא נמצאו חשבוניות מתאימות לפילטרים שנבחרו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // ✅ סידור החשבוניות לפי שם ספק בסדר א'-ב'
    filteredForPrint.sort((a, b) => {
      const supplierA = a.supplierId?.name || a.invitingName || "";
      const supplierB = b.supplierId?.name || b.invitingName || "";
      return hebrewSort(supplierA, supplierB);
    });

    const totalSum = filteredForPrint.reduce(
      (totalAmount, inv) => totalAmount + (inv.totalAmount || 0),
      0
    );
    const paidSum = filteredForPrint
      .filter((inv) => inv.paid === "כן")
      .reduce((totalAmount, inv) => totalAmount + (inv.totalAmount || 0), 0);
    const unpaidSum = totalSum - paidSum;

    const selectedProjectNames = selectedProjectForPrint.length > 0
      ? selectedProjectForPrint.map(id =>
        projectsForPrint.find((p) => p._id === id)?.name
      ).filter(Boolean).join(", ")
      : "כל הפרויקטים";
    const selectedSupplierNames = selectedSupplierForPrint.length > 0
      ? selectedSupplierForPrint.map(id =>
        suppliersForPrint.find((s) => s._id === id)?.name
      ).filter(Boolean).join(", ")
      : "כל הספקים";

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("הדפדפן חסם את חלון ההדפסה — תאפשר פופאפים", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <title>דוח חשבוניות - ניהולון</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              padding: 30px;
              background: #fff;
              color: #1f2937;
            }

            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #f97316;
            }

            .logo {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              margin-bottom: 15px;
            }

            .logo-text {
              font-size: 36px;
              font-weight: 700;
              color: #6b7280;
              letter-spacing: 2px;
            }

            .logo-icon {
              width: 45px;
              height: 45px;
              background: #f97316;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .logo-icon::before {
              content: "⚙";
              font-size: 28px;
              color: white;
            }

            .header h1 {
              font-size: 24px;
              color: #1f2937;
              margin-bottom: 10px;
              font-weight: 600;
            }

            .header .date {
              color: #6b7280;
              font-size: 14px;
            }

            .filters {
              background: #fff7ed;
              padding: 15px 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              border-right: 4px solid #f97316;
            }

            .filters h3 {
              color: #f97316;
              margin-bottom: 10px;
              font-size: 16px;
            }

            .filters p {
              color: #6b7280;
              font-size: 14px;
              margin: 5px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 30px;
            }

            thead {
              background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
              color: white;
            }

            thead th {
              padding: 15px 12px;
              font-weight: 600;
              font-size: 13px;
              text-align: center;
            }

            tbody tr {
              border-bottom: 1px solid #e5e7eb;
            }

            tbody tr:nth-child(even) {
              background: #f9fafb;
            }

            tbody tr:hover {
              background: #fff7ed;
            }

            tbody td {
              padding: 12px;
              font-size: 12px;
              color: #374151;
              text-align: center;
            }

            .status-paid {
              background: #d1fae5;
              color: #065f46;
              padding: 4px 12px;
              border-radius: 12px;
              font-weight: bold;
              display: inline-block;
            }

            .status-unpaid {
              background: #fee2e2;
              color: #991b1b;
              padding: 4px 12px;
              border-radius: 12px;
              font-weight: bold;
              display: inline-block;
            }

            .totalAmountmary {
              background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
              border: 2px solid #fdba74;
              border-radius: 12px;
              padding: 20px;
              margin-top: 30px;
            }

            .totalAmountmary h3 {
              color: #f97316;
              margin-bottom: 15px;
              font-size: 20px;
            }

            .totalAmountmary-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #fdba74;
              font-size: 15px;
            }

            .totalAmountmary-row:last-child {
              border-bottom: none;
            }

            .totalAmountmary-row.total {
              font-size: 18px;
              font-weight: bold;
              color: #ea580c;
              margin-top: 10px;
            }

            .totalAmountmary-row.paid {
              color: #16a34a;
              font-weight: 600;
            }

            .totalAmountmary-row.unpaid {
              color: #dc2626;
              font-weight: 600;
            }

            .footer {
              margin-top: 40px;
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }

            @media print {
              body {
                padding: 15mm;
              }

              table {
                page-break-inside: auto;
              }

              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }

              thead {
                display: table-header-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <div class="logo-icon"></div>
              <div class="logo-text">ניהולון</div>
            </div>
            <h1>📋 דוח חשבוניות</h1>
            <div class="date">תאריך הפקה: ${new Date().toLocaleDateString(
      "he-IL",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    )}</div>
          </div>

          ${selectedProjectForPrint.length > 0 ||
        selectedSupplierForPrint.length > 0 ||
        fromDatePrint ||
        toDatePrint
        ? `
          <div class="filters">
            <h3>🔍 פילטרים</h3>
            ${selectedProjectForPrint.length > 0
          ? `<p><strong>פרויקטים:</strong> ${selectedProjectNames}</p>`
          : ""
        }
            ${selectedSupplierForPrint.length > 0
          ? `<p><strong>ספקים:</strong> ${selectedSupplierNames}</p>`
          : ""
        }
            ${fromDatePrint
          ? `<p><strong>מתאריך:</strong> ${new Date(
            fromDatePrint
          ).toLocaleDateString("he-IL")}</p>`
          : ""
        }
            ${toDatePrint
          ? `<p><strong>עד תאריך:</strong> ${new Date(
            toDatePrint
          ).toLocaleDateString("he-IL")}</p>`
          : ""
        }
          </div>
          `
        : ""
      }

          <table>
            <thead>
              <tr>
                <th>מס׳</th>
                <th>מספר חשבונית</th>
                <th>ספק/מזמין</th>
                <th>פרויקט</th>
                <th>סכום</th>
                <th>תאריך</th>
                <th>סטטוס הגשה</th>
                <th>תשלום</th>
              </tr>
            </thead>
            <tbody>
              ${filteredForPrint
        .map(
          (invoice, idx) => `
                <tr>
                  <td><strong>${idx + 1}</strong></td>
                  <td><strong>${invoice.invoiceNumber || "-"}</strong></td>
                  <td>${invoice.supplierId?.name || invoice.invitingName || "לא צוין"}</td>
                  <td>${invoice.projects?.length
              ? getProjectNamesWithoutMilga(invoice.projects)
              : "-"
            }</td>
                  <td><strong>${formatNumber(
              invoice.totalAmount
            )} ₪</strong></td>
                  <td>${formatDate(invoice.createdAt)}</td>
                  <td>${invoice.status || "-"}</td>
                  <td>
                    <span class="${invoice.paid === "כן" ? "status-paid" : "status-unpaid"
            }">
                      ${invoice.paid === "כן" ? "✓ שולם" : "✗ לא שולם"}
                    </span>
                  </td>
                </tr>`
        )
        .join("")}
            </tbody>
          </table>

          <div class="totalAmountmary">
            <h3>📊 סיכום</h3>
            <div class="totalAmountmary-row">
              <span>סה"כ חשבוניות:</span>
              <strong>${filteredForPrint.length}</strong>
            </div>
            <div class="totalAmountmary-row total">
              <span>סה"כ סכום כולל:</span>
              <strong>${formatNumber(totalSum)} ₪</strong>
            </div>
            <div class="totalAmountmary-row paid">
              <span>✓ סכום ששולם:</span>
              <strong>${formatNumber(paidSum)} ₪</strong>
            </div>
            <div class="totalAmountmary-row unpaid">
              <span>✗ סכום שטרם שולם:</span>
              <strong>${formatNumber(unpaidSum)} ₪</strong>
            </div>
          </div>

          <div class="footer">
            <p>מסמך זה הופק אוטומטית ממערכת ניהולון</p>
            <p>© ${new Date().getFullYear()} כל הזכויות שמורות</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => window.print(), 250);
            }
          </script>
        </body>
        </html>
      `);

    printWindow.document.close();

    toast.success(`נפתח חלון הדפסה עם ${filteredForPrint.length} חשבוניות!`, {
      className: "sonner-toast success rtl",
      duration: 3000,
    });

    setShowPrintModal(false);
    setSelectedProjectForPrint([]);
    setSelectedSupplierForPrint([]);
    setFromDatePrint("");
    setToDatePrint("");
  };

  const getSupplier = (invoice) => {
    // אם זה populated
    if (invoice.supplierId && typeof invoice.supplierId === "object") {
      return invoice.supplierId;
    }
    // אם זה בשדה supplier (ישן) ✅ זה החסר!
    if (invoice.supplier && typeof invoice.supplier === "object") {
      return invoice.supplier;
    }
    // אם זה מחרוזת → אין מידע
    return null;
  };

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
      totalAmount: "סכום",
      status: "סטטוס הגשה",
      paid: "סטטוס תשלום",
      invoiceDate: "תאריך חשבונית",
      createdAt: "תאריך יצירה",
      paymentDate: "תאריך תשלום",
      detail: "פירוט",
      supplierPhone: "טלפון ספק",
      supplierEmail: "אימייל ספק",
      supplierBankName: "שם בנק ספק",
      supplierBranchNumber: "מספר סניף ספק",
      supplierAccountNumber: "מספר חשבון ספק",
      documentType: "סוג מסמך",
      paymentMethod: "אמצעי תשלום",
    };

    const selectedColumns = Object.keys(exportColumns).filter(
      (key) => exportColumns[key]
    );

    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    const invoicesData = dataToExport.map((invoice) => {
      // ✅ תיקון - בדוק אם הספק הוא אובייקט
      const supplier = getSupplier(invoice);

      const row = {};
      selectedColumns.forEach((col) => {
        switch (col) {
          case "invoiceNumber":
            row[columnMapping.invoiceNumber] = invoice.invoiceNumber || "";
            break;
          case "projectName":
            row[columnMapping.projectName] =
              getProjectNamesWithoutMilga(invoice.projects || []);
            break;
          case "invitingName":
            row[columnMapping.invitingName] = invoice.invitingName || "";
            break;
          case "totalAmount":
            row[columnMapping.totalAmount] = invoice.totalAmount || 0;
            break;
          case "status":
            row[columnMapping.status] = invoice.status || "";
            break;
          case "paid":
            row[columnMapping.paid] = getPaymentStatusText(invoice);
            break;
          case "invoiceDate":
            row[columnMapping.invoiceDate] = formatDate(invoice.invoiceDate || invoice.createdAt);
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
          case "documentType":
            row[columnMapping.documentType] = invoice.documentType || "";
            break;
          case "paymentMethod":
            row[columnMapping.paymentMethod] = translatePaymentMethod(invoice.paymentMethod);
            break;
          // ✅ עמודות הספק - עכשיו יעבוד נכון
          case "supplierName":
            row[columnMapping.supplierName] = supplier?.name || "לא זמין";
            break;
          case "supplierPhone":
            row[columnMapping.supplierPhone] = supplier?.phone || "לא זמין";
            break;
          case "supplierEmail":
            row[columnMapping.supplierEmail] = supplier?.email || "לא זמין";
            break;
          case "supplierBankName":
            row[columnMapping.supplierBankName] =
              supplier?.bankDetails?.bankName || "לא זמין";
            break;
          case "supplierBranchNumber":
            row[columnMapping.supplierBranchNumber] =
              supplier?.bankDetails?.branchNumber || "לא זמין";
            break;
          case "supplierAccountNumber":
            row[columnMapping.supplierAccountNumber] =
              supplier?.bankDetails?.accountNumber || "לא זמין";
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
    const invoices = sortedInvoices || [];

    if (!invoices.length) {
      toast.error("אין חשבוניות לייצוא", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    const formatSupplierAddress = (supplier) => {
      if (supplier.address) return supplier.address;

      const parts = [
        supplier.city,
        supplier.street,
        supplier.houseNumber,
      ].filter(Boolean);

      return parts.length ? parts.join(" ") : "לא זמין";
    };

    const invoicesWithHeaders = invoices.map((invoice) => {
      const supplier = getSupplier(invoice);

      // ✅ שמות פרויקטים ממערך projects (לחשבונית מרובת פרויקטים)
      const projectNames = invoice.projects?.length
        ? getProjectNamesWithoutMilga(invoice.projects)
        : invoice.projectName || "לא זמין";

      const baseData = {
        "מספר חשבונית": invoice.invoiceNumber || "",
        "שם פרוייקט": projectNames,
        "שם ספק": supplier?.name || "לא זמין",
        "שם מזמין": invoice.invitingName || "לא זמין",
        "שם איש קשר": invoice.projectId?.Contact_person || invoice.projects?.[0]?.projectId?.Contact_person || "לא זמין",
        "תאריך חשבונית": formatDate(invoice.invoiceDate || invoice.createdAt),
        "תאריך יצירה": formatDate(invoice.createdAt),
        סכום: formatNumber(Number(invoice.totalAmount) || 0),
        "סטטוס הגשה": invoice.status || "",
        "סטטוס תשלום": getPaymentStatusText(invoice),
        "תאריך תשלום":
          invoice.paid === "כן" && invoice.paymentDate
            ? formatDate(invoice.paymentDate)
            : "לא שולם",
        פירוט: invoice.detail || "",
      };

      // ✅ פשט את הקוד - אין צורך ב-if
      return {
        ...baseData,
        "ח.פ/ע.מ":
          supplier?.businessNumber || supplier?.business_tax || "לא זמין",
        "טלפון ספק": supplier?.phone || "לא זמין",
        "אימייל ספק": supplier?.email || "לא זמין",
        "כתובת ספק": supplier ? formatSupplierAddress(supplier) : "לא זמין",
        "שם בנק ספק": supplier?.bankDetails?.bankName || "לא זמין",
        "מספר סניף": supplier?.bankDetails?.branchNumber || "לא זמין",
        "מספר חשבון": supplier?.bankDetails?.accountNumber || "לא זמין",
      };
    });

    const totalInvoices = invoices.length;
    const supplierInvoices = invoicesWithHeaders.filter(
      (i) => i["שם ספק"] !== "לא זמין"
    ).length;

    const worksheet = XLSX.utils.json_to_sheet(invoicesWithHeaders);

    worksheet["!cols"] = Object.keys(invoicesWithHeaders[0]).map(() => ({
      wpx: 140,
    }));
    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "חשבוניות");

    const fileName = `חשבוניות_${supplierInvoices}_עם_ספקים_מתוך_${totalInvoices}_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    toast.success(
      `הקובץ יוצא בהצלחה! ${supplierInvoices} מתוך ${totalInvoices} חשבוניות כוללות פרטי ספק`,
      {
        className: "sonner-toast success rtl",
        duration: 4000,
      }
    );
  };

  const downloadAttachedFiles = async () => {
    try {
      // ✅ השתמש בחשבוניות המסוננות הנוכחיות במסך
      let filtered = [...filteredInvoices];

      // ✅ סידור החשבוניות לפי שם ספק בסדר א'-ב' לפני הורדת הקבצים
      filtered.sort((a, b) => {
        const supplierA = a.supplierId?.name || a.invitingName || "";
        const supplierB = b.supplierId?.name || b.invitingName || "";
        return hebrewSort(supplierA, supplierB);
      });

      const allFiles = [];

      filtered.forEach((invoice) => {
        if (Array.isArray(invoice.files)) {
          invoice.files.forEach((file) => {
            if (file.url) {
              const supplierName = invoice.type === "salary"
                ? invoice.salaryEmployeeName
                : (invoice.supplierId?.name || invoice.invitingName || "ללא_ספק");

              allFiles.push({
                url: file.url,
                name: file.name || "file",
                invoiceNumber: invoice.invoiceNumber || "ללא",
                projectName:
                  getProjectNamesWithoutMilga(invoice.projects || []) ||
                  "ללא_פרויקט",
                supplierName: supplierName,
              });
            }
          });
        }
      });

      // ✅ סידור כל הקבצים לפי שם ספק בסדר א'-ב'
      allFiles.sort((a, b) => {
        const supplierA = a.supplierName || "";
        const supplierB = b.supplierName || "";
        return hebrewSort(supplierA, supplierB);
      });

      if (allFiles.length === 0) {
        toast.error("לא נמצאו קבצים להורדה");
        return;
      }

      toast.info("מכין ZIP להורדה...");

      // 🔥 שולחים לשרת את רשימת הקבצים
      const response = await api.post(
        "/upload/download-zip", // תואם ל-router שלך
        { files: allFiles },
        { responseType: "blob" }
      );

      // 🔥 השרת מחזיר ZIP – עכשיו רק שומרים אותו
      saveAs(
        new Blob([response.data], { type: "application/zip" }),
        `קבצים_מצורפים_${new Date()
          .toLocaleDateString("he-IL")
          .replace(/\./g, "_")}.zip`
      );

      toast.success("קובץ ZIP הורד בהצלחה!");

      setShowPrintModal(false);
      setSelectedProjectForPrint("");
      setSelectedSupplierForPrint("");
      setFromDatePrint("");
      setToDatePrint("");
    } catch (error) {
      console.error("ZIP error:", error);
      toast.error("שגיאה בהורדה: " + error.message);
    }
  };
  const normalizeId = (val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (val._id) return String(val._id);
    return String(val);
  };

  // ✅ טעינת חשבוניות עם סינון לפי הרשאות
  const fetchInvoices = async () => {
    try {
      const [invoicesRes, expensesRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/expenses")
      ]);

      const allData = arr(invoicesRes.data.data);
      // ✅ סנן חשבוניות לפי הרשאות
      const allowedProjectIds = getAllowedProjectIds();

      let filteredData = allData;
      if (allowedProjectIds !== null) {
        filteredData = allData.filter((invoice) => {

          if (!Array.isArray(invoice.projects)) return false;

          return invoice.projects.some((p) =>
            allowedProjectIds.includes(
              normalizeId(p.projectId)
            )
          );
        });
      }

      setAllInvoices(filteredData);
      setAllExpenses(expensesRes.data?.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const lastSelectedIdRef = useRef(null);

  const toggleSelectInvoice = (invoice, event) => {
    const currentId = invoice._id;

    const currentIndex = displayOrderInvoices.findIndex(
      i => i._id === currentId
    );

    const lastId = lastSelectedIdRef.current;
    const lastIndex = lastId
      ? displayOrderInvoices.findIndex(i => i._id === lastId)
      : -1;

    // 🔹 בחירה רגילה — מעגנים
    if (!event.shiftKey || lastIndex === -1) {
      setSelectedInvoices(prev => {
        const exists = prev.some(i => i._id === currentId);
        return exists
          ? prev.filter(i => i._id !== currentId)
          : [...prev, invoice];
      });

      // ⭐ anchor נקבע רק פה
      lastSelectedIdRef.current = currentId;
      return;
    }

    // 🔹 Shift selection — טווח אמיתי
    const start = Math.min(lastIndex, currentIndex);
    const end = Math.max(lastIndex, currentIndex);

    const range = displayOrderInvoices.slice(start, end + 1);

    setSelectedInvoices(prev => {
      const map = new Map(prev.map(i => [i._id, i]));
      range.forEach(i => map.set(i._id, i));
      return Array.from(map.values());
    });

    // ❌ לא מעדכנים anchor כאן
  };


  const toggleSelectAll = () => {
    if (selectedInvoices.length === sortedInvoices.length) {
      setSelectedInvoices([]);
      lastSelectedIdRef.current = null;

    } else {
      setSelectedInvoices(sortedInvoices);
    }
  };

  const selectNone = () => {
    setSelectedInvoices([]);
    lastSelectedIdRef.current = null;

  };

  const handleBulkDelete = async () => {
    try {
      for (const invoice of selectedInvoices) {
        try {
          await api.delete(`/invoices/${invoice._id}`);
        } catch (err) {
          console.error("❌ Error deleting invoice:", invoice._id, err);
        }
      }

      // עדכון ה־state אחרי שהכול נמחק
      const remainingInvoices = allInvoices.filter(
        (invoice) => !selectedInvoices.some((sel) => sel._id === invoice._id)
      );

      setAllInvoices(remainingInvoices);
      setInvoices(remainingInvoices);
      setSelectedInvoices([]);
      setShowBulkDeleteModal(false);

      toast.success(`${selectedInvoices.length} חשבוניות נמחקו בהצלחה`, {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error(error);
      toast.error("שגיאה במחיקת החשבוניות", {
        className: "sonner-toast error rtl",
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (invoiceToDelete) {
        await api.delete(`/invoices/${invoiceToDelete._id}`);

        const updatedInvoices = allInvoices.filter(
          (invoice) => invoice._id !== invoiceToDelete._id
        );
        setAllInvoices(updatedInvoices);
        setInvoices(
          updatedInvoices.filter((invoice) => {
            let matchesPaymentFilter =
              paymentFilter.length === 0 ||
              (paymentFilter.includes("paid") && invoice.paid === "כן") ||
              (paymentFilter.includes("sent_to_payment") && invoice.paid === "יצא לתשלום") ||
              (paymentFilter.includes("unpaid") && invoice.paid === "לא") ||
              (paymentFilter.includes("not_for_payment") && invoice.paid === "לא לתשלום");

            let matchesStatusFilter =
              statusFilter.length === 0 ||
              (statusFilter.includes("submitted") && invoice.status === "הוגש") ||
              (statusFilter.includes("inProgress") && invoice.status === "בעיבוד") ||
              (statusFilter.includes("notSubmitted") && invoice.status === "לא הוגש");

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
    // הסינונים כבר נשמרים אוטומטית ב-useEffect, לא צריך לשמור שוב
    navigate(`/invoices/${id}`);
  };

  const togglePaymentStatus = async (invoice) => {
    try {
      // אם לא שולם - פתח חלון להזנת פרטי תשלום
      if (invoice.paid === "לא") {
        setPaymentCapture({
          open: true,
          invoice,
          defaultDate: new Date().toISOString().slice(0, 10),
          defaultMethod: "",
        });
        return;
      }

      // אם שולם או יצא לתשלום - החזר ללא שולם
      const response = await api.put(`/invoices/${invoice._id}/status`, {
        status: "לא",
        paymentDate: null,
        paymentMethod: null,
      });

      // ✅ השתמש בנתונים מה-Backend
      const updatedInvoice = response.data.data || response.data;

      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updatedInvoice : inv))
      );

      setAllInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updatedInvoice : inv))
      );

      const previousStatus = invoice.paid === "כן" ? "שולם" : "יצא לתשלום";
      toast.success(`סטטוס התשלום עודכן מ-${previousStatus} ל-לא שולם`, {
        className: "sonner-toast success rtl",
      });
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בעדכון סטטוס התשלום", {
        className: "sonner-toast error rtl",
      });
    }
  };
  const handleSavePaymentCapture = async ({
    paymentDate,
    paymentMethod,
    checkNumber,
    checkDate,
  }) => {
    const invoice = paymentCapture.invoice;
    if (!invoice) return;

    try {
      // ✅ קבל את החשבונית המעודכנת מה-Backend
      const response = await api.put(`/invoices/${invoice._id}/status`, {
        status: "כן",
        paymentDate,
        paymentMethod,
        checkNumber,
        checkDate,
      });

      // ✅ השתמש בנתונים שחזרו מה-Backend
      const updatedInvoice = response.data.data || response.data;

      // ✅ עדכן את ה-state עם הנתונים האמיתיים מה-Backend
      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updatedInvoice : inv))
      );

      setAllInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updatedInvoice : inv))
      );

      const paymentInfo =
        paymentMethod === "check" ? `צ'ק ${checkNumber}` : paymentMethod === "bank_transfer" ? "העברה בנקאית" : paymentMethod === "credit_card" ? "כרטיס אשראי" : "-";

      toast.success(`עודכן לשולם (${paymentInfo})`, {
        className: "sonner-toast success rtl",
      });
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירת פרטי התשלום", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setPaymentCapture({
        open: false,
        invoice: null,
        defaultDate: "",
        defaultMethod: "",
      });
    }
  };

  const handleBulkSubmission = async () => {
    try {
      const invoiceIds = selectedInvoices.map(inv => inv._id);

      await api.put("/invoices/bulk/update-submission-status", {
        invoiceIds,
        status: "הוגש",
      });

      setInvoices(prev =>
        prev.map(inv => invoiceIds.includes(inv._id) ? { ...inv, status: "הוגש" } : inv)
      );
      setAllInvoices(prev =>
        prev.map(inv => invoiceIds.includes(inv._id) ? { ...inv, status: "הוגש" } : inv)
      );

      toast.success(`${selectedInvoices.length} חשבוניות סומנו כהוגש`, {
        className: "sonner-toast success rtl",
      });

      setShowBulkSubmissionModal(false);
      setSelectedInvoices([]);
    } catch (error) {
      console.error(error);
      toast.error("שגיאה בעדכון סטטוס הגשה", {
        className: "sonner-toast error rtl",
      });
    }
  };

  const handleBulkPayment = async () => {
    if (!bulkPaymentDate) {
      toast.error("יש לבחור תאריך תשלום", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    if (!bulkPaymentMethod) {
      toast.error("יש לבחור אמצעי תשלום", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    if (bulkPaymentMethod === "check" && !bulkCheckNumber) {
      toast.error("יש למלא מספר צ'ק", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    try {
      const invoiceIds = selectedInvoices.map(inv => inv._id);

      await api.put("/invoices/bulk/update-status", {
        invoiceIds,
        status: "כן",
        paymentDate: bulkPaymentDate,
        paymentMethod: bulkPaymentMethod,
        checkNumber: bulkPaymentMethod === "check" ? bulkCheckNumber : null,
        checkDate: bulkPaymentMethod === "check" ? bulkCheckDate : null,
      });

      // עדכון המצב המקומי
      setInvoices(prev =>
        prev.map(inv =>
          invoiceIds.includes(inv._id)
            ? {
              ...inv,
              paid: "כן",
              paymentDate: bulkPaymentDate,
              paymentMethod: bulkPaymentMethod,
              checkNumber: bulkPaymentMethod === "check" ? bulkCheckNumber : null,
              checkDate: bulkPaymentMethod === "check" ? bulkCheckDate : null,
            }
            : inv
        )
      );
      setAllInvoices(prev =>
        prev.map(inv =>
          invoiceIds.includes(inv._id)
            ? {
              ...inv,
              paid: "כן",
              paymentDate: bulkPaymentDate,
              paymentMethod: bulkPaymentMethod,
              checkNumber: bulkPaymentMethod === "check" ? bulkCheckNumber : null,
              checkDate: bulkPaymentMethod === "check" ? bulkCheckDate : null,
            }
            : inv
        )
      );

      const paymentInfo = bulkPaymentMethod === "check"
        ? `צ'ק ${bulkCheckNumber}`
        : bulkPaymentMethod === "bank_transfer" ? "העברה בנקאית" : bulkPaymentMethod === "credit_card" ? "כרטיס אשראי" : "";

      toast.success(`${selectedInvoices.length} חשבוניות סומנו כשולמו בתאריך ${new Date(bulkPaymentDate).toLocaleDateString('he-IL')} (${paymentInfo})`, {
        className: "sonner-toast success rtl",
      });

      setShowBulkPaymentModal(false);
      setSelectedInvoices([]);
      setBulkPaymentDate(new Date().toISOString().slice(0, 10));
      setBulkPaymentMethod("");
      setBulkCheckNumber("");
      setBulkCheckDate("");
    } catch (error) {
      console.error(error);
      toast.error("שגיאה בעדכון סטטוס התשלומים", {
        className: "sonner-toast error rtl",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען רשימת חשבוניות...
        </h1>
      </div>
    );
  }

  // ייצוא מרוכז לפי ספק
  const exportPaymentBySupplier = async () => {
    let filtered = [...sortedInvoices];

    if (selectedProjectForPrint) {
      filtered = filtered.filter((inv) => {
        // בדוק אם הפרויקט קיים במערך הפרויקטים של החשבונית
        return inv.projects?.some(
          (p) =>
            p.projectId === selectedProjectForPrint ||
            p.projectId?._id === selectedProjectForPrint
        );
      });
    }

    if (selectedSupplierForPrint) {
      filtered = filtered.filter(
        (inv) => inv.supplierId?._id === selectedSupplierForPrint
      );
    }

    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filtered = filtered.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate >= fromDate;
      });
    }

    if (toDatePrint) {
      const toDate = new Date(toDatePrint);
      filtered = filtered.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate <= toDate;
      });
    }

    // 🔥 סינון לפי סטטוס תשלום
    let invoicesToExport = filtered;

    if (exportPaymentStatusFilter === "unpaid") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "לא");
    } else if (exportPaymentStatusFilter === "paid") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "כן");
    } else if (exportPaymentStatusFilter === "sent_to_payment") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "יצא לתשלום");
    } else if (exportPaymentStatusFilter === "not_for_payment") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "לא לתשלום");
    }
    // אם "all" - מייצאים הכל ללא סינון

    if (invoicesToExport.length === 0) {
      const statusText =
        exportPaymentStatusFilter === "unpaid" ? "שלא שולמו" :
          exportPaymentStatusFilter === "paid" ? "ששולמו" :
            exportPaymentStatusFilter === "sent_to_payment" ? "שיצאו לתשלום" :
              exportPaymentStatusFilter === "not_for_payment" ? "שלא לתשלום" :
                "";
      toast.error(`לא נמצאו חשבוניות ${statusText} לייצוא`, {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // ✅ שמירת מזהי החשבוניות לעדכון הסטטוס
    const invoiceIdsToUpdate = invoicesToExport.map(inv => inv._id);

    // קיבוץ לפי ספק
    const groupedBySupplier = {};

    invoicesToExport.forEach((invoice) => {
      const supplier =
        invoice.supplierId && typeof invoice.supplierId === "object"
          ? invoice.supplierId
          : null;

      if (!supplier) return;

      const supplierId = supplier._id;

      if (!groupedBySupplier[supplierId]) {
        groupedBySupplier[supplierId] = {
          supplierName: supplier.name || "לא זמין",
          bankName: supplier.bankDetails?.bankName || "לא זמין",
          branchNumber: supplier.bankDetails?.branchNumber || "לא זמין",
          accountNumber: supplier.bankDetails?.accountNumber || "לא זמין",
          totalAmount: 0,
          invoiceNumbers: [],
          projects: new Set(),
        };
      }

      groupedBySupplier[supplierId].totalAmount += invoice.totalAmount || 0;
      groupedBySupplier[supplierId].invoiceNumbers.push(
        invoice.invoiceNumber || ""
      );

      // 🟢 כאן היה הבאג — עכשיו מתוקן:
      groupedBySupplier[supplierId].projects.add(
        getProjectNamesWithoutMilga(invoice.projects || [])
      );
    });

    const excelData = Object.values(groupedBySupplier).map((group) => ({
      "שם ספק": group.supplierName,
      "שם בנק": group.bankName,
      "מספר סניף": group.branchNumber,
      "מספר חשבון": group.accountNumber,
      'סה"כ לתשלום': group.totalAmount,
      "מספרי חשבוניות": group.invoiceNumbers.join(", "),
      פרויקטים: Array.from(group.projects).join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [
      { wpx: 150 },
      { wpx: 120 },
      { wpx: 100 },
      { wpx: 120 },
      { wpx: 100 },
      { wpx: 200 },
      { wpx: 200 },
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "תשלומים לספקים");

    const fileName = `תשלומים_מרוכז_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    // ✅ עדכון סטטוס החשבוניות ל"יצא לתשלום"
    try {
      await api.put("/invoices/bulk/update-status", {
        invoiceIds: invoiceIdsToUpdate,
        status: "יצא לתשלום"
      });

      // עדכון המצב המקומי
      setInvoices(prev =>
        prev.map(inv =>
          invoiceIdsToUpdate.includes(inv._id)
            ? { ...inv, paid: "יצא לתשלום" }
            : inv
        )
      );
      setAllInvoices(prev =>
        prev.map(inv =>
          invoiceIdsToUpdate.includes(inv._id)
            ? { ...inv, paid: "יצא לתשלום" }
            : inv
        )
      );

      toast.success(`יוצא קובץ עם ${excelData.length} ספקים וסטטוס עודכן ל"יצא לתשלום"`, {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס:", error);
      toast.error("הקובץ יוצא אך הייתה שגיאה בעדכון הסטטוס", {
        className: "sonner-toast error rtl",
      });
    }

    setShowPaymentExportModal(false);
    setShowPrintModal(false);
  };

  // ייצוא משכורות ל-Excel
  const exportSalaries = () => {
    // סינון רק חשבוניות משכורת
    const salaryInvoices = sortedInvoices.filter(inv => inv.type === "salary");

    if (salaryInvoices.length === 0) {
      toast.error("לא נמצאו חשבוניות משכורת", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // קיבוץ לפי פרויקט
    const groupedByProject = {};

    salaryInvoices.forEach((invoice) => {
      // הפרויקט המקורי שממנו יורד התקציב
      const sourceProject = invoice.fundedFromProjectId?.name ||
        invoice.projects?.find(p => p.projectName !== "משכורות")?.projectName ||
        "לא ידוע";

      if (!groupedByProject[sourceProject]) {
        groupedByProject[sourceProject] = [];
      }

      groupedByProject[sourceProject].push({
        "פרויקט מקור": sourceProject,
        "שם עובד": invoice.salaryEmployeeName || "-",
        "סכום בסיס": invoice.salaryBaseAmount || 0,
        "תקורה (%)": invoice.salaryOverheadPercent || 0,
        "סכום סופי": invoice.salaryFinalAmount || invoice.totalAmount || 0,
        "תאריך": formatDate(invoice.createdAt),
        "מספר חשבונית": invoice.invoiceNumber || "-",
      });
    });

    // יצירת גיליון אקסל
    const allRows = [];

    Object.keys(groupedByProject).sort().forEach(projectName => {
      const projectSalaries = groupedByProject[projectName];

      // הוסף שורת כותרת לפרויקט
      allRows.push({
        "פרויקט מקור": `=== ${projectName} ===`,
        "שם עובד": "",
        "סכום בסיס": "",
        "תקורה (%)": "",
        "סכום סופי": "",
        "תאריך": "",
        "מספר חשבונית": "",
      });

      // הוסף את כל המשכורות של הפרויקט
      projectSalaries.forEach(salary => {
        allRows.push(salary);
      });

      // הוסף שורת סיכום
      const totalBase = projectSalaries.reduce((sum, s) => sum + Number(s["סכום בסיס"]), 0);
      const totalFinal = projectSalaries.reduce((sum, s) => sum + Number(s["סכום סופי"]), 0);

      allRows.push({
        "פרויקט מקור": `סה"כ ${projectName}`,
        "שם עובד": "",
        "סכום בסיס": totalBase,
        "תקורה (%)": "",
        "סכום סופי": totalFinal,
        "תאריך": "",
        "מספר חשבונית": "",
      });

      // שורה ריקה להפרדה
      allRows.push({
        "פרויקט מקור": "",
        "שם עובד": "",
        "סכום בסיס": "",
        "תקורה (%)": "",
        "סכום סופי": "",
        "תאריך": "",
        "מספר חשבונית": "",
      });
    });

    // סיכום כללי
    const grandTotalBase = salaryInvoices.reduce((sum, inv) => sum + Number(inv.salaryBaseAmount || 0), 0);
    const grandTotalFinal = salaryInvoices.reduce((sum, inv) => sum + Number(inv.salaryFinalAmount || inv.totalAmount || 0), 0);

    allRows.push({
      "פרויקט מקור": "=== סה\"כ כללי ===",
      "שם עובד": "",
      "סכום בסיס": grandTotalBase,
      "תקורה (%)": "",
      "סכום סופי": grandTotalFinal,
      "תאריך": "",
      "מספר חשבונית": `${salaryInvoices.length} משכורות`,
    });

    const worksheet = XLSX.utils.json_to_sheet(allRows);

    // עיצוב עמודות
    worksheet["!cols"] = [
      { wpx: 150 }, // פרויקט מקור
      { wpx: 150 }, // שם עובד
      { wpx: 100 }, // סכום בסיס
      { wpx: 80 },  // תקורה
      { wpx: 100 }, // סכום סופי
      { wpx: 100 }, // תאריך
      { wpx: 120 }, // מספר חשבונית
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "משכורות");

    const fileName = `סיכום_משכורות_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    toast.success(`יוצא קובץ עם ${salaryInvoices.length} משכורות מקובצות לפי פרויקטים`, {
      className: "sonner-toast success rtl",
      duration: 4000,
    });
  };

  // ייצוא מפורט לפי חשבונית
  const exportPaymentDetailed = async () => {
    let filtered = [...sortedInvoices];

    if (selectedProjectForPrint) {
      filtered = filtered.filter((inv) => {
        // בדוק אם הפרויקט קיים במערך הפרויקטים של החשבונית
        return inv.projects?.some(
          (p) =>
            p.projectId === selectedProjectForPrint ||
            p.projectId?._id === selectedProjectForPrint
        );
      });
    }

    if (selectedSupplierForPrint) {
      filtered = filtered.filter(
        (inv) => inv.supplierId?._id === selectedSupplierForPrint
      );
    }

    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filtered = filtered.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate >= fromDate;
      });
    }

    if (toDatePrint) {
      const toDate = new Date(toDatePrint);
      filtered = filtered.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate <= toDate;
      });
    }

    // 🔥 סינון לפי סטטוס תשלום
    let invoicesToExport = filtered;

    if (exportPaymentStatusFilter === "unpaid") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "לא");
    } else if (exportPaymentStatusFilter === "paid") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "כן");
    } else if (exportPaymentStatusFilter === "sent_to_payment") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "יצא לתשלום");
    } else if (exportPaymentStatusFilter === "not_for_payment") {
      invoicesToExport = invoicesToExport.filter(inv => inv.paid === "לא לתשלום");
    }
    // אם "all" - מייצאים הכל ללא סינון

    if (invoicesToExport.length === 0) {
      const statusText =
        exportPaymentStatusFilter === "unpaid" ? "שלא שולמו" :
          exportPaymentStatusFilter === "paid" ? "ששולמו" :
            exportPaymentStatusFilter === "sent_to_payment" ? "שיצאו לתשלום" :
              exportPaymentStatusFilter === "not_for_payment" ? "שלא לתשלום" :
                "";
      toast.error(`לא נמצאו חשבוניות ${statusText} לייצוא`, {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // ✅ שמירת מזהי החשבוניות לעדכון הסטטוס
    const invoiceIdsToUpdate = invoicesToExport.map(inv => inv._id);

    const excelData = invoicesToExport.map((invoice) => {
      const supplier =
        invoice.supplierId && typeof invoice.supplierId === "object"
          ? invoice.supplierId
          : null;

      return {
        "שם ספק": supplier?.name || "לא זמין",
        "מספר חשבונית": invoice.invoiceNumber || "",
        "שם פרויקט":
          getProjectNamesWithoutMilga(invoice.projects || []),
        סכום: invoice.totalAmount || 0,
        "סוג מסמך": invoice.documentType || "לא זמין",
        "תאריך חשבונית": formatDate(invoice.invoiceDate || invoice.createdAt),
        "תאריך תשלום": invoice.paymentDate ? formatDate(invoice.paymentDate) : "לא שולם",
        "צורת תשלום": translatePaymentMethod(invoice.paymentMethod),
        "שם בנק": supplier?.bankDetails?.bankName || "לא זמין",
        "מספר סניף": supplier?.bankDetails?.branchNumber || "לא זמין",
        "מספר חשבון": supplier?.bankDetails?.accountNumber || "לא זמין",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [
      { wpx: 150 }, // שם ספק
      { wpx: 120 }, // מספר חשבונית
      { wpx: 150 }, // שם פרויקט
      { wpx: 100 }, // סכום
      { wpx: 100 }, // סוג מסמך
      { wpx: 120 }, // תאריך חשבונית
      { wpx: 120 }, // תאריך תשלום
      { wpx: 120 }, // צורת תשלום
      { wpx: 120 }, // שם בנק
      { wpx: 100 }, // מספר סניף
      { wpx: 120 }, // מספר חשבון
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "חשבוניות לתשלום");

    const fileName = `תשלומים_מפורט_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    // ✅ עדכון סטטוס החשבוניות ל"יצא לתשלום"
    try {
      await api.put("/invoices/bulk/update-status", {
        invoiceIds: invoiceIdsToUpdate,
        status: "יצא לתשלום"
      });

      // עדכון המצב המקומי
      setInvoices(prev =>
        prev.map(inv =>
          invoiceIdsToUpdate.includes(inv._id)
            ? { ...inv, paid: "יצא לתשלום" }
            : inv
        )
      );
      setAllInvoices(prev =>
        prev.map(inv =>
          invoiceIdsToUpdate.includes(inv._id)
            ? { ...inv, paid: "יצא לתשלום" }
            : inv
        )
      );

      toast.success(`יוצא קובץ עם ${excelData.length} חשבוניות וסטטוס עודכן ל"יצא לתשלום"`, {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס:", error);
      toast.error("הקובץ יוצא אך הייתה שגיאה בעדכון הסטטוס", {
        className: "sonner-toast error rtl",
      });
    }

    setShowPaymentExportModal(false);
    setShowPrintModal(false);
  };

  const groupInvoicesByMonth = (invoices) => {
    return invoices.reduce((acc, invoice) => {
      if (!invoice.createdAt) return acc;

      const date = new Date(invoice.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!acc[key]) {
        acc[key] = {
          year: date.getFullYear(),
          month: date.getMonth(),
          invoices: [],
        };
      }

      acc[key].invoices.push(invoice);
      return acc;
    }, {});
  };


  const HEBREW_MONTHS = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];
  const groupedInvoices = groupInvoicesByMonth(sortedInvoices);

  // מיון חודשים – מהחדש לישן
  const groupedByMonthSorted = Object.values(groupedInvoices)
    .map(group => ({
      ...group,
      // שמור על סדר המיון שנבחר - לא למיין מחדש בתוך הקבוצה
      invoices: group.invoices,
    }))
    .sort(
      (a, b) => new Date(b.year, b.month) - new Date(a.year, a.month)
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Receipt className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                    רשימת חשבוניות
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-1 sm:mt-2">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                    <span className="text-xs sm:text-sm font-medium text-slate-600">
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
          {/* Bulk Actions Row - shown only when items are selected */}
          {selectedInvoices.length > 0 && canEditInvoices && isAdmin && (
            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-200">
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>מחק {selectedInvoices.length} נבחרות</span>
              </button>
              <button
                onClick={() => setShowBulkPaymentModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-md"
              >
                <CheckSquare className="w-4 h-4" />
                <span>סמן {selectedInvoices.length} לתשלום</span>
              </button>
              <button
                onClick={() => setShowBulkSubmissionModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
              >
                <CheckSquare className="w-4 h-4" />
                <span>סמן {selectedInvoices.length} כהוגש</span>
              </button>
            </div>
          )}

          {/* Sort & Filter Controls Row */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">מיין לפי:</span>
              </div>
              <select
                onChange={(e) => setSortBy(e.target.value)}
                value={sortBy}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="totalAmount">סכום</option>
                <option value="createdAt">תאריך יצירה</option>
                <option value="paymentDate">תאריך תשלום</option>
                <option value="invoiceNumber">מספר חשבונית</option>
                <option value="projectName">שם פרוייקט</option>
                <option value="supplierName">שם ספק (א-ב)</option>
              </select>
              <select
                onChange={(e) => setSortOrder(e.target.value)}
                value={sortOrder}
                className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              >
                <option value="asc">עולה</option>
                <option value="desc">יורד</option>
              </select>

              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="text-orange-600 w-5 h-5" />
                <span className="font-bold text-slate-700">סינון:</span>
                <MultiSelectDropdown
                  label="תשלום"
                  options={[
                    { value: "paid", label: "שולמו" },
                    { value: "sent_to_payment", label: "יצא לתשלום" },
                    { value: "unpaid", label: "לא שולמו" },
                    { value: "not_for_payment", label: "לא לתשלום" },
                  ]}
                  selected={paymentFilter}
                  onChange={setPaymentFilter}
                />
                <MultiSelectDropdown
                  label="סטטוס הגשה"
                  options={[
                    { value: "submitted", label: "הוגשו" },
                    { value: "inProgress", label: "בעיבוד" },
                    { value: "notSubmitted", label: "לא הוגשו" },
                  ]}
                  selected={statusFilter}
                  onChange={setStatusFilter}
                />
                <MultiSelectDropdown
                  label="סטטוס מסמך"
                  options={[
                    { value: "completed", label: "הושלם" },
                    { value: "missing", label: "חסר" },
                  ]}
                  selected={documentStatusFilter}
                  onChange={setDocumentStatusFilter}
                />

                {/* Payment Date Quick Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">תאריך תשלום:</span>
                  <input
                    type="date"
                    value={advancedFilters.paymentDateFrom}
                    onChange={(e) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        paymentDateFrom: e.target.value,
                      }))
                    }
                    className="px-2 py-1 border-2 border-orange-200 rounded-lg bg-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                  />
                  <span className="text-xs text-slate-600">עד</span>
                  <input
                    type="date"
                    value={advancedFilters.paymentDateTo}
                    onChange={(e) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        paymentDateTo: e.target.value,
                      }))
                    }
                    className="px-2 py-1 border-2 border-orange-200 rounded-lg bg-white text-sm focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {(paymentFilter.length > 0 ||
                statusFilter.length > 0 ||
                documentStatusFilter.length > 0 ||
                advancedFilters.paymentDateFrom ||
                advancedFilters.paymentDateTo ||
                searchTerm) && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-bold"
                  >
                    נקה סינון
                  </button>
                )}
          </div>

          {/* Export Buttons Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setMasavModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">ייצוא מס״ב</span>
              </button>

              <button
                onClick={() => setMasavHistoryModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold rounded-full hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">היסטוריית מס״ב</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">הדפסת מסמכים</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
              >
                <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">מחולל דוחות</span>
              </button>

              <button
                onClick={exportToExcelWithSuppliers}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
              >
                <DownloadCloud className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">ייצוא מהיר</span>
              </button>

              <button
                onClick={exportSalaries}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
              >
                <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">ייצוא משכורות</span>
              </button>

              {/* כפתור יצירת חשבונית - לא מוצג לרואת חשבון */}
              {user?.role !== "accountant" && (
                <button
                  onClick={() => navigate("/create-invoice")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
                >
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">יצירת חשבונית</span>
                </button>
              )}
          </div>
          {/* Results Count */}
          <div className="text-sm text-slate-600 font-medium flex items-center gap-4 flex-wrap">
            <span>
              מציג {sortedInvoices.length} חשבוניות מתוך {allInvoices.length}
            </span>
            {selectedInvoices.length > 0 && (
              <>
                <span className="text-orange-600">•</span>
                <span className="text-orange-600 font-bold">
                  {selectedInvoices.length} נבחרו
                </span>
              </>
            )}

            {/* כפתורי סמן הכל / בטל הכל */}
            {canEditInvoices && isAdmin && sortedInvoices.length > 0 && (
              <div className="flex items-center gap-2 mr-auto">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-all text-xs font-bold"
                >
                  <CheckSquare className="w-4 h-4" />
                  סמן הכל
                </button>
                <button
                  onClick={selectNone}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-xs font-bold"
                >
                  <Square className="w-4 h-4" />
                  בטל הכל
                </button>
                <span className="text-xs text-slate-400">
                  (לחץ Shift + לחיצה לבחירת טווח)
                </span>
              </div>
            )}
          </div>
        </div>

        {console.log(sortedInvoices)}
        {/* Invoices Table */}
        {sortedInvoices.length > 0 ? (

          <div className="space-y-8">

            {groupedByMonthSorted.map((group) => (
              <div key={`${group.year}-${group.month}`} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
                {/* כותרת חודש ושנה */}
                <h2 className="text-xl font-bold text-slate-900 mb-6 ">
                  {HEBREW_MONTHS[group.month]} {group.year} <span className="text-sm"> ({group.invoices.length})</span>
                </h2>

                {/* טבלה לחשבוניות בחודש זה */}
                <div className="w-full overflow-hidden rounded-t-xl">
                  <table className="w-full">
                    <thead>
                      <tr
                        className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                        style={{
                          display: "grid",
                          gap: "2px",
                          gridTemplateColumns:
                            canEditInvoices && isAdmin
                              ? "0.4fr 0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.7fr 0.9fr 1.1fr"
                              : canEditInvoices
                                ? "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.7fr 1.1fr"
                                : "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.7fr",
                        }}
                      >
                        {/* עמודה 1: Checkbox - רק לאדמין */}
                        {canEditInvoices && isAdmin && (
                          <th className="px-4 py-4 text-sm font-bold text-center text-white">
                            <div className="flex flex-col items-center gap-1">
                              {/* <input
                          type="checkbox"
                          checked={
                            selectedInvoices.length === sortedInvoices.length &&
                            sortedInvoices.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="w-5 h-5 accent-white cursor-pointer"
                        /> */}
                              <span className="text-xs">סמן למחיקה</span>
                            </div>
                          </th>
                        )}

                        {/* עמודה 2/1: סטטוס מסמך */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          סטטוס מסמך
                        </th>

                        {/* עמודה 3/2: שם הספק */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          שם הספק
                        </th>

                        {/* עמודה 4/3: מספר חשבונית */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          מס׳ חשבונית
                        </th>

                        {/* עמודה 5/3: סכום */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          סכום
                        </th>

                        {/* עמודה 6/4: תאריך */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          תאריך
                        </th>

                        {/* עמודה 7/5: סטטוס הגשה */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          סטטוס הגשה
                        </th>

                        {/* עמודה 8/6: שם פרוייקט */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          שם פרוייקט
                        </th>

                        {/* עמודה 9/7: תשלום */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          תשלום
                        </th>

                        {/* עמודה 10/8: קבצים */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          קבצים
                        </th>

                        {/* עמודה: שויך */}
                        <th className="px-4 py-4 text-sm font-bold text-center text-white">
                          שויך
                        </th>

                        {/* עמודה 11: סימון תשלום - רק לאדמין */}
                        {canEditInvoices && isAdmin && (
                          <th className="px-4 py-4 text-sm font-bold text-center text-white">
                            סימון תשלום
                          </th>
                        )}

                        {/* עמודה 12/11/10: פעולות - רק למי שיכול לערוך */}
                        {canEditInvoices && (
                          <th className="px-4 py-4 text-sm font-bold text-center text-white">
                            פעולות
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {group.invoices.map((invoice) => (
                        <tr
                          key={invoice._id}
                          className={`cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors ${selectedInvoices.some((inv) => inv._id === invoice._id)
                            ? "bg-orange-100"
                            : ""
                            }`}
                          style={{
                            display: "grid",
                            gap: "2px",
                            gridTemplateColumns:
                              canEditInvoices && isAdmin
                                ? "0.4fr 0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.7fr 0.9fr 1.1fr"
                                : canEditInvoices
                                  ? "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.7fr 1.1fr"
                                  : "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.7fr",
                          }}
                          onClick={(e) => {
                            if (
                              !e.target.closest("label") &&
                              !e.target.closest("input[type='checkbox']") &&
                              !e.target.closest("button")
                            ) {
                              handleView(invoice._id);
                            }
                          }}
                        >
                          {/* עמודה 1: Checkbox - רק לאדמין */}
                          {canEditInvoices && isAdmin && (
                            <td className="px-2 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedInvoices.some(inv => inv._id === invoice._id)}
                                onClick={(e) => toggleSelectInvoice(invoice, e)}
                                onChange={() => { }} // אופציונלי כדי למנוע אזהרות, לא חובה
                                className="w-5 h-5 cursor-pointer"
                              />


                            </td>

                          )}

                          {/* עמודה 2/1: סטטוס מסמך */}
                          <td className="px-2 py-4 text-center">
                            {(() => {
                              const a = getActionState(invoice);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${a.color}`}
                                >
                                  <span>{a.status}</span>
                                  <span className="opacity-70">•</span>
                                  <span className="hidden lg:inline">{a.label}</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* עמודה 3/2: שם הספק */}
                          <td className="px-2 py-4 text-xs font-bold text-center text-slate-900">
                            {invoice.type === "salary" ? invoice.salaryEmployeeName : invoice.supplierId?.name || "-"}
                          </td>

                          {/* עמודה 4/3: מספר חשבונית */}
                          <td className="px-2 py-4 text-xs font-bold text-center text-slate-900">
                            <div className="flex items-center justify-center gap-2">
                              <span>
                                {invoice.invoiceNumber || (
                                  <span className="text-red-500 italic">חסר</span>
                                )}
                              </span>
                              {/* תגית מילגה */}
                              {(invoice.fundedFromProjectId || invoice.projects?.some(p => p.projectName === "מילגה")) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-md">
                                  מילגה
                                </span>
                              )}
                              {/* תגית משכורת */}
                              {invoice.type === "salary" && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
                                  משכורת
                                </span>
                              )}
                            </div>
                          </td>

                          {/* עמודה 5/4: סכום */}
                          <td className="px-2 py-4 text-xs font-bold text-center text-slate-900">
                            {invoice.totalAmount ? (
                              `${formatNumber(invoice.totalAmount)} ₪`
                            ) : (
                              <span className="text-red-500 italic">חסר</span>
                            )}
                          </td>

                          {/* עמודה 6/5: תאריך */}
                          <td className="px-2 py-4 text-xs text-slate-600 text-center">
                            {formatDate(invoice.createdAt)}
                          </td>

                          {/* עמודה 7/6: סטטוס הגשה */}
                          <td className="px-2 py-4 text-xs font-medium text-center text-slate-900">
                            {invoice.status || (
                              <span className="text-red-500 italic">חסר</span>
                            )}
                          </td>

                          {/* עמודה 8/7: שם פרוייקט */}
                          <td className="px-2 py-4 text-xs text-center font-medium text-slate-900">
                            {invoice.projects?.length
                              ? invoice.projects
                                .map(
                                  (p) =>
                                    p.projectName || p.projectId?.name || "ללא שם"
                                )
                                .join(", ")
                              : "—"}
                          </td>

                          {/* עמודה 9/8: תשלום */}
                          <td className="px-2 py-4 text-center">
                            {invoice.paid === "כן" ? (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200 whitespace-nowrap">
                                {getPaymentStatusText(invoice)}
                              </span>
                            ) : invoice.paid === "יצא לתשלום" ? (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold border border-blue-200 whitespace-nowrap">
                                יצא לתשלום
                              </span>
                            ) : invoice.paid === "לא לתשלום" ? (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-bold border border-gray-300 whitespace-nowrap">
                                לא לתשלום
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200 whitespace-nowrap">
                                לא שולם
                              </span>
                            )}
                          </td>

                          {/* עמודה 10/9: קבצים + העלאה */}
                          <td className="px-2 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadModal({ open: true, invoice });
                              }}
                              className="flex items-center justify-center gap-1 hover:bg-orange-50 rounded-lg p-1 transition-colors mx-auto"
                              title="העלה קובץ לחשבונית"
                            >
                              <Paperclip className="w-4 h-4 text-orange-500" />
                              <span className="font-bold text-slate-900 text-xs">
                                {getInvoiceFilesCount(invoice)}
                              </span>
                            </button>
                          </td>

                          {/* עמודה: שויך */}
                          <td className="px-2 py-4 text-center">
                            {invoiceToExpenseMap[invoice._id]?.length > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <Link className="w-3 h-3" />
                                <span className="text-xs font-bold">
                                  {invoiceToExpenseMap[invoice._id].length} הוצאות
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">לא שויך</span>
                            )}
                          </td>

                          {/* עמודה 11: סימון תשלום - רק לאדמין */}
                          {canEditInvoices && isAdmin && (
                            <td className="px-2 py-4 text-center">
                              <label className="relative inline-block cursor-pointer" title={
                                invoice.paid === "כן" ? "לחץ להחזרה ללא שולם" :
                                  invoice.paid === "יצא לתשלום" ? "לחץ להחזרה ללא שולם" :
                                    invoice.paid === "לא לתשלום" ? "לחץ להחזרה ללא שולם" :
                                      "לחץ לסימון כשולם"
                              }>
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
                                  className={`w-6 h-6 inline-block border-2 rounded-full transition-all ${invoice.paid === "כן"
                                    ? "bg-emerald-500 border-emerald-500"
                                    : invoice.paid === "יצא לתשלום"
                                      ? "bg-blue-500 border-blue-500"
                                      : invoice.paid === "לא לתשלום"
                                        ? "bg-gray-500 border-gray-500"
                                        : "bg-gray-200 border-gray-400"
                                    } flex items-center justify-center`}
                                >
                                  {invoice.paid === "כן" && (
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="w-4 h-4"
                                      stroke="white"
                                      fill="none"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                  )}
                                  {invoice.paid === "יצא לתשלום" && (
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="w-4 h-4"
                                      stroke="white"
                                      fill="white"
                                      strokeWidth="2"
                                    >
                                      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z" />
                                    </svg>
                                  )}
                                  {invoice.paid === "לא לתשלום" && (
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="w-4 h-4"
                                      stroke="white"
                                      fill="none"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                  )}
                                </span>
                              </label>
                            </td>
                          )}

                          {/* עמודה 12/11/10: פעולות */}
                          {canEditInvoices && (
                            <td className="px-2 py-4">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(invoice._id);
                                  }}
                                  className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                                  title="ערוך"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {isAdmin && invoice.type != "salary" ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMoveModal({ open: true, invoice });
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                      title="העבר לפרויקט אחר"
                                    >
                                      <ArrowLeftRight className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmDelete(invoice);
                                      }}
                                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                      title="מחק"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : <></>}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">
              {searchTerm || paymentFilter.length > 0 || statusFilter.length > 0 || documentStatusFilter.length > 0
                ? "לא נמצאו תוצאות"
                : "עדיין אין חשבוניות"}
            </h2>
          </div>
        )}

        {/* הייתי ממשיך עם שאר הקוד אבל הוא זהה לגמרי למה ששלחת, רק צריך להוסיף את הקוד המלא של ה-modals */}
        {/* המשך הקוד הקיים שלך עם כל המודלים... */}

        <MoveInvoiceModal
          open={moveModal.open}
          invoice={moveModal.invoice}
          onClose={() => setMoveModal({ open: false, invoice: null })}
          onMoved={(updatedInvoice) => {
            setInvoices((prev) =>
              prev.map((inv) =>
                inv._id === updatedInvoice._id ? updatedInvoice : inv
              )
            );
            setAllInvoices((prev) =>
              prev.map((inv) =>
                inv._id === updatedInvoice._id ? updatedInvoice : inv
              )
            );
          }}
        />

        <PaymentCaptureModal
          open={paymentCapture.open}
          onClose={() =>
            setPaymentCapture({
              open: false,
              invoice: null,
              defaultDate: "",
              defaultMethod: "",
            })
          }
          onSave={handleSavePaymentCapture}
          defaultDate={paymentCapture.defaultDate}
          defaultMethod={paymentCapture.defaultMethod}
        />
      </div>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50">
          {/* רקע + סגירה בלחיצה בחוץ */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          />

          {/* מעטפת עם גלילה */}
          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
            {/* קופסת המודאל */}
            <div
              className="relative w-full max-w-4xl mt-16"
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
                      <h3 className="text-2xl font-bold">מחולל דוחות מתקדם</h3>
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
                  {/* Advanced Filters Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-orange-500" />
                        סינון מתקדם
                      </h4>
                      <button
                        onClick={clearAdvancedFilters}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        נקה הכל
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Date From */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          תאריך יצירה מ-
                        </label>
                        <input
                          type="date"
                          value={advancedFilters.dateFrom}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              dateFrom: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Date To */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          תאריך יצירה עד-
                        </label>
                        <input
                          type="date"
                          value={advancedFilters.dateTo}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              dateTo: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Payment Date From */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          תאריך תשלום מ-
                        </label>
                        <input
                          type="date"
                          value={advancedFilters.paymentDateFrom}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              paymentDateFrom: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Payment Date To */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          תאריך תשלום עד-
                        </label>
                        <input
                          type="date"
                          value={advancedFilters.paymentDateTo}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              paymentDateTo: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Amount Min */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          סכום מינימום
                        </label>
                        <input
                          type="number"
                          value={advancedFilters.amountMin}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              amountMin: e.target.value,
                            })
                          }
                          placeholder="הזן סכום מינימום"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Amount Max */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          סכום מקסימום
                        </label>
                        <input
                          type="number"
                          value={advancedFilters.amountMax}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              amountMax: e.target.value,
                            })
                          }
                          placeholder="הזן סכום מקסימום"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          שם פרויקט
                        </label>
                        <input
                          type="text"
                          value={advancedFilters.projectName}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              projectName: e.target.value,
                            })
                          }
                          placeholder="חפש שם פרויקט"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Supplier Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          שם ספק/מזמין
                        </label>
                        <input
                          type="text"
                          value={advancedFilters.supplierName}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              supplierName: e.target.value,
                            })
                          }
                          placeholder="חפש ספק או מזמין"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      </div>

                      {/* Payment Status */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          סטטוס תשלום
                        </label>
                        <select
                          value={advancedFilters.paymentStatus}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              paymentStatus: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="all">הכל</option>
                          <option value="paid">שולם</option>
                          <option value="sent_to_payment">יצא לתשלום</option>
                          <option value="unpaid">לא שולם</option>
                          <option value="not_for_payment">לא לתשלום</option>
                        </select>
                      </div>

                      {/* Document Status */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          סטטוס מסמך
                        </label>
                        <select
                          value={advancedFilters.documentStatus}
                          onChange={(e) =>
                            setAdvancedFilters({
                              ...advancedFilters,
                              documentStatus: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="all">הכל</option>
                          <option value="completed">הושלם</option>
                          <option value="missing">חסר</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter Summary */}
                    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                      <p className="text-sm font-bold text-gray-700">
                        מסננים: {filteredInvoices.length} חשבוניות מתוך{" "}
                        {allInvoices.length}
                      </p>
                    </div>
                  </div>

                  {/* Column Selection Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">
                        בחר עמודות לייצוא
                      </h4>
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

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {availableColumns.map((column) => (
                        <label
                          key={column.key}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${exportColumns[column.key]
                            ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400"
                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={exportColumns[column.key]}
                            onChange={() => toggleColumn(column.key)}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                          <span
                            className={`text-sm font-medium ${exportColumns[column.key]
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

                  {/* כפתורי פעולה */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-bold"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={exportCustomReport}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg font-bold"
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

      {/* Print Modal - כמו בפרויקטים */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50">
          {/* רקע כהה */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowPrintModal(false);
              setSelectedProjectForPrint([]);
              setSelectedSupplierForPrint([]);
              setFromDatePrint("");
              setToDatePrint("");
              setFromPaymentDatePrint("");
              setToPaymentDatePrint("");
              setProjectSearchForPrint("");
              setSupplierSearchForPrint("");
            }}
          />

          {/* עיטוף מרכזי */}
          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="relative w-full max-w-4xl mt-20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* זוהר */}
              <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-xl"></div>

              {/* תוכן המודל */}
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-7 h-7 text-white" />
                    <h3 className="text-2xl font-bold">הפקת מסמכים</h3>
                  </div>

                  <button
                    onClick={() => {
                      setShowPrintModal(false);
                      setSelectedProjectForPrint([]);
                      setSelectedSupplierForPrint([]);
                      setFromDatePrint("");
                      setToDatePrint("");
                      setFromPaymentDatePrint("");
                      setToPaymentDatePrint("");
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* תוכן גולל */}
                <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">
                  {/* בחירת פרויקטים */}
                  <div className="mb-6">
                    <label className="block font-semibold text-slate-700 mb-3">
                      בחירת פרויקטים
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="חיפוש פרויקט..."
                        value={projectSearchForPrint}
                        onChange={(e) => setProjectSearchForPrint(e.target.value)}
                        className="w-full border-2 border-orange-200 rounded-xl py-2 pr-9 pl-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border-2 border-orange-200 rounded-xl p-3 space-y-2">
                      {projectsForPrint.filter(p => !projectSearchForPrint || p.name?.includes(projectSearchForPrint)).map((p) => (
                        <label key={p._id} className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded-lg transition">
                          <input
                            type="checkbox"
                            checked={selectedProjectForPrint.includes(p._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProjectForPrint([...selectedProjectForPrint, p._id]);
                              } else {
                                setSelectedProjectForPrint(selectedProjectForPrint.filter(id => id !== p._id));
                              }
                            }}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <span className="text-sm font-medium">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* בחירת ספקים */}
                  <div className="mb-6">
                    <label className="block font-semibold text-slate-700 mb-3">
                      בחירת ספקים
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="חיפוש ספק..."
                        value={supplierSearchForPrint}
                        onChange={(e) => setSupplierSearchForPrint(e.target.value)}
                        className="w-full border-2 border-orange-200 rounded-xl py-2 pr-9 pl-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border-2 border-orange-200 rounded-xl p-3 space-y-2">
                      {suppliersForPrint.filter(s => !supplierSearchForPrint || s.name?.includes(supplierSearchForPrint)).map((s) => (
                        <label key={s._id} className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded-lg transition">
                          <input
                            type="checkbox"
                            checked={selectedSupplierForPrint.includes(s._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSupplierForPrint([...selectedSupplierForPrint, s._id]);
                              } else {
                                setSelectedSupplierForPrint(selectedSupplierForPrint.filter(id => id !== s._id));
                              }
                            }}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <span className="text-sm font-medium">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* טווח תאריכי יצירה */}
                  <label className="block font-semibold text-slate-700 mb-2">
                    טווח תאריכי יצירה
                  </label>
                  <div className="flex gap-3 mb-6">
                    <input
                      type="date"
                      className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer"
                      placeholder="מתאריך"
                      value={fromDatePrint}
                      onChange={(e) => setFromDatePrint(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    />
                    <input
                      type="date"
                      className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer"
                      placeholder="עד תאריך"
                      value={toDatePrint}
                      onChange={(e) => setToDatePrint(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    />
                  </div>

                  {/* טווח תאריכי תשלום */}
                  <label className="block font-semibold text-slate-700 mb-2">
                    טווח תאריכי תשלום
                  </label>
                  <div className="flex gap-3 mb-10">
                    <input
                      type="date"
                      className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer"
                      placeholder="מתאריך תשלום"
                      value={fromPaymentDatePrint}
                      onChange={(e) => setFromPaymentDatePrint(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    />
                    <input
                      type="date"
                      className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer"
                      placeholder="עד תאריך תשלום"
                      value={toPaymentDatePrint}
                      onChange={(e) => setToPaymentDatePrint(e.target.value)}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    />
                  </div>

                  {/* כפתורי פעולה */}
                  <div className="flex flex-col gap-3">
                    <button
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                      onClick={downloadAttachedFiles}
                    >
                      <DownloadCloud className="w-5 h-5" />
                      📦 הורד קבצים מצורפים (ZIP)
                    </button>

                    <button
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg"
                      onClick={generateInvoicesPrint}
                    >
                      <FileText className="w-5 h-5" />
                      🖨️ הפק דוח PDF
                    </button>

                    <button
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg"
                      onClick={() => setShowPaymentExportModal(true)}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                      💳 ייצוא לתשלום (Excel)
                    </button>

                    <button
                      className="w-full px-6 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
                      onClick={() => {
                        setShowPrintModal(false);
                        setSelectedProjectForPrint("");
                        setSelectedSupplierForPrint("");
                        setFromDatePrint("");
                        setToDatePrint("");
                        setFromPaymentDatePrint("");
                        setToPaymentDatePrint("");
                        setProjectSearchForPrint("");
                        setSupplierSearchForPrint("");
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Payment Export Modal - בחירת סוג ייצוא */}
      {showPaymentExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white p-8 rounded-3xl w-[500px] shadow-2xl">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  בחר סוג ייצוא לתשלום
                </h3>
                <p className="text-slate-600 text-sm">
                  כיצד תרצה לארגן את הנתונים?
                </p>
              </div>

              {/* סינון סטטוס תשלום */}
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  סטטוס תשלום:
                </label>
                <select
                  value={exportPaymentStatusFilter}
                  onChange={(e) => setExportPaymentStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-medium"
                >
                  <option value="unpaid">לא שולם</option>
                  <option value="sent_to_payment">יצא לתשלום</option>
                  <option value="paid">שולם</option>
                  <option value="not_for_payment">לא לתשלום</option>
                  <option value="all">הכל</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  בחר איזה חשבוניות לייצא לפי סטטוס התשלום
                </p>
              </div>

              <div className="space-y-4">
                {/* אופציה 1: מרוכז */}
                <button
                  onClick={exportPaymentBySupplier}
                  className="w-full group p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                      <svg
                        className="w-6 h-6 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">
                        מרוכז לפי ספק
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        כל ספק בשורה אחת עם סכום כולל, רשימת חשבוניות ופרויקטים
                      </p>
                      <div className="mt-3 text-xs text-emerald-600 font-medium">
                        ✓ מומלץ להעברות בנקאיות
                      </div>
                    </div>
                  </div>
                </button>

                {/* אופציה 2: מפורט */}
                <button
                  onClick={exportPaymentDetailed}
                  className="w-full group p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-right"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 10h16M4 14h16M4 18h16"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">
                        מפורט לפי חשבונית
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        כל חשבונית בשורה נפרדת עם כל הפרטים המלאים
                      </p>
                      <div className="mt-3 text-xs text-blue-600 font-medium">
                        ✓ מומלץ למעקב מפורט
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* כפתור ביטול */}
              <button
                onClick={() => setShowPaymentExportModal(false)}
                className="w-full mt-6 px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      <MasavModal
        open={masavModal}
        onClose={() => setMasavModal(false)}
        invoices={sortedInvoices}
        onInvoicesUpdated={(invoiceIds) => {
          // עדכון המצב המקומי
          setInvoices(prev =>
            prev.map(inv =>
              invoiceIds.includes(inv._id)
                ? { ...inv, paid: "יצא לתשלום" }
                : inv
            )
          );
          setAllInvoices(prev =>
            prev.map(inv =>
              invoiceIds.includes(inv._id)
                ? { ...inv, paid: "יצא לתשלום" }
                : inv
            )
          );
        }}
      />

      {/* MASAV History Modal */}
      <MasavHistoryModal
        open={masavHistoryModal}
        onClose={() => setMasavHistoryModal(false)}
      />

      {/* Quick File Upload Modal */}
      <QuickFileUploadModal
        open={uploadModal.open}
        onClose={() => setUploadModal({ open: false, invoice: null })}
        invoice={uploadModal.invoice}
        onSuccess={() => fetchInvoices()}
      />

      {/* Delete Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                  האם אתה בטוח?
                </h3>
                <p className="text-slate-600">
                  שים לב! פעולה זו תמחק את החשבונית לצמיתות.
                </p>
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

      {/* הוסף את מודאל המחיקה הקבוצתית בסוף הקומפוננטה */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                  האם אתה בטוח?
                </h3>
                <p className="text-slate-600 mb-4">
                  שים לב! פעולה זו תמחק{" "}
                  <span className="font-bold text-red-600">
                    {selectedInvoices.length} חשבוניות
                  </span>{" "}
                  לצמיתות.
                </p>

                {/* רשימת החשבוניות שנבחרו */}
                <div className="max-h-48 overflow-y-auto bg-red-50 rounded-xl p-4 mb-4">
                  <div className="text-right space-y-2">
                    {selectedInvoices.map((inv) => (
                      <div
                        key={inv._id}
                        className="text-sm text-slate-700 flex justify-between items-center border-b border-red-200 pb-2"
                      >
                        <span className="font-medium">
                          חשבונית #{inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-slate-500">
                          {getProjectNamesWithoutMilga(inv.projects || [])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                >
                  מחק הכל
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkSubmissionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl opacity-20 blur-2xl"></div>
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">סימון כהוגש</h3>
                <p className="text-slate-600 mb-4">
                  האם לסמן{" "}
                  <span className="font-bold text-blue-600">{selectedInvoices.length} חשבוניות</span>{" "}
                  כ-<span className="font-bold">הוגש</span>?
                </p>
                <div className="max-h-48 overflow-y-auto bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="text-right space-y-2">
                    {selectedInvoices.map((inv) => (
                      <div key={inv._id} className="text-sm text-slate-700 flex justify-between items-center border-b border-blue-200 pb-2">
                        <span className="font-medium">חשבונית #{inv.invoiceNumber}</span>
                        <span className="text-xs text-slate-500">{getProjectNamesWithoutMilga(inv.projects || [])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkSubmission}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg"
                >
                  אשר הגשה
                </button>
                <button
                  onClick={() => setShowBulkSubmissionModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-h-[90vh] flex flex-col">
            <div className="absolute -inset-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                  סימון חשבוניות לתשלום
                </h3>
                <p className="text-slate-600 mb-4">
                  פעולה זו תסמן{" "}
                  <span className="font-bold text-green-600">
                    {selectedInvoices.length} חשבוניות
                  </span>{" "}
                  כשולמו באותו תאריך.
                </p>

                {/* בחירת תאריך תשלום */}
                <div className="mb-4">
                  <label className="block text-right font-bold mb-2 text-slate-700">
                    תאריך תשלום
                  </label>
                  <input
                    type="date"
                    value={bulkPaymentDate}
                    onChange={(e) => setBulkPaymentDate(e.target.value)}
                    className="w-full p-3 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none"
                  />
                </div>

                {/* בחירת אמצעי תשלום */}
                <div className="mb-4">
                  <label className="block text-right font-bold mb-2 text-slate-700">
                    אמצעי תשלום <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bulkPaymentMethod}
                    onChange={(e) => {
                      setBulkPaymentMethod(e.target.value);
                      // אם משנים לא צ'ק - נקה את שדות הצ'ק
                      if (e.target.value !== "check") {
                        setBulkCheckNumber("");
                        setBulkCheckDate("");
                      }
                    }}
                    className="w-full p-3 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none"
                  >
                    <option value="">בחר אמצעי תשלום...</option>
                    <option value="bank_transfer">העברה בנקאית</option>
                    <option value="check">צ'ק</option>
                    <option value="credit_card">כרטיס אשראי</option>

                  </select>
                </div>

                {/* שדות צ'ק - מופיעים רק אם בחרו צ'ק */}
                {bulkPaymentMethod === "check" && (
                  <>
                    <div className="mb-4">
                      <label className="block text-right font-bold mb-2 text-slate-700">
                        מספר צ'ק <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bulkCheckNumber}
                        onChange={(e) => setBulkCheckNumber(e.target.value)}
                        placeholder="הזן מספר צ'ק"
                        className="w-full p-3 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-right font-bold mb-2 text-slate-700">
                        תאריך פירעון צ'ק (אופציונלי)
                      </label>
                      <input
                        type="date"
                        value={bulkCheckDate}
                        onChange={(e) => setBulkCheckDate(e.target.value)}
                        className="w-full p-3 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* רשימת החשבוניות שנבחרו */}
                <div className="max-h-48 overflow-y-auto bg-green-50 rounded-xl p-4 mb-4">
                  <div className="text-right space-y-2">
                    {selectedInvoices.map((inv) => (
                      <div
                        key={inv._id}
                        className="text-sm text-slate-700 flex justify-between items-center border-b border-green-200 pb-2"
                      >
                        <span className="font-medium">
                          חשבונית #{inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatNumber(inv.totalAmount)} ₪
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-green-800 font-medium">
                    סה"כ לתשלום:{" "}
                    <span className="text-lg font-bold">
                      {formatNumber(
                        selectedInvoices.reduce(
                          (sum, inv) => sum + (inv.totalAmount || 0),
                          0
                        )
                      )}{" "}
                      ₪
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBulkPayment}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
                >
                  אשר תשלום
                </button>
                <button
                  onClick={() => setShowBulkPaymentModal(false)}
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
  );
};

export default InvoicesPage;
