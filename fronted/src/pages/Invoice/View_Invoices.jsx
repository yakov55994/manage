import { useEffect, useState } from "react";
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
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import MoveInvoiceModal from "../../Components/MoveInvoiceModal.jsx";
import PaymentCaptureModal from "../../Components/PaymentCaptureModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { FileText, Paperclip } from "lucide-react";
import JSZip from "jszip";
import MasavModal from "../../Components/MasavModal.jsx";

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
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [showPaymentExportModal, setShowPaymentExportModal] = useState(false);

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedProjectForPrint, setSelectedProjectForPrint] = useState("");
  const [selectedSupplierForPrint, setSelectedSupplierForPrint] = useState("");
  const [fromDatePrint, setFromDatePrint] = useState("");
  const [toDatePrint, setToDatePrint] = useState("");
  const [projectsForPrint, setProjectsForPrint] = useState([]);
  const [suppliersForPrint, setSuppliersForPrint] = useState([]);

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
    supplierPhone: true,
    supplierEmail: true,
    supplierBankName: true,
    supplierBranchNumber: true,
    supplierAccountNumber: true,
  });
  const [masavModal, setMasavModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { user, isAdmin, canEditModule, canViewModule } = useAuth();
  const navigate = useNavigate();

  // קבל את הפרויקט הנוכחי
  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedProjectId = authUser?.selectedProject;

  // ✅ בדיקת הרשאה לצפות בחשבוניות
  const canViewInvoices = () => {
    if (isAdmin) return true;
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

  // בדיקות הרשאות
  const canEditInvoices =
    isAdmin || canEditModule(selectedProjectId, "invoices");

  const availableColumns = [
    { key: "invoiceNumber", label: "מספר חשבונית" },
    { key: "projectName", label: "שם הפרוייקט" },
    { key: "supplierName", label: "שם ספק" }, // ✅ הוסף את זה
    { key: "invitingName", label: "שם המזמין" },
    { key: "sum", label: "סכום" },
    { key: "status", label: "סטטוס הגשה" },
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
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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
  ]);

  const normalizeType = (t) =>
    String(t || "")
      .replace(/\s+/g, " ")
      .replace(/\s*\/\s*/g, "/")
      .trim();

  const getActionState = (invoice) => {
    const t = normalizeType(invoice?.documentType);
    const okF = FINAL_TYPES.has(t);
    const okI = INTERIM_TYPES.has(t);

    const status = okF ? "הושלם" : "חסר";
    const label = okF ? "חשבונית מס/קבלה" : okI ? t : "—";
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
      filtered = filtered.filter(
        (invoice) =>
          (invoice.invoiceNumber?.toString() || "").includes(searchTerm) ||
          (invoice.projectName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (invoice.supplierId?.name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (invoice.invitingName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filtered = filtered.filter(
        (invoice) =>
          (isPaid && invoice.paid === "כן") ||
          (!isPaid && invoice.paid !== "כן")
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => {
        if (statusFilter === "submitted") return invoice.status === "הוגש";
        if (statusFilter === "inProgress") return invoice.status === "בעיבוד";
        if (statusFilter === "notSubmitted")
          return invoice.status === "לא הוגש";
        return true;
      });
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
          (inv) => Number(inv.sum) >= Number(advancedFilters.amountMin)
        );
      }
      if (advancedFilters.amountMax) {
        filtered = filtered.filter(
          (inv) => Number(inv.sum) <= Number(advancedFilters.amountMax)
        );
      }

      if (advancedFilters.projectName) {
        filtered = filtered.filter((inv) =>
          (inv.projectName || "")
            .toLowerCase()
            .includes(advancedFilters.projectName.toLowerCase())
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
        filtered = filtered.filter((inv) => inv.paid !== "כן");
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
    }

    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  const applyFilters = () => {
    let filteredResults = [...allInvoices];

    if (paymentFilter !== "all") {
      const isPaid = paymentFilter === "paid";
      filteredResults = filteredResults.filter(
        (invoice) =>
          (isPaid && invoice.paid === "כן") ||
          (!isPaid && invoice.paid !== "כן")
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "submitted") {
        filteredResults = filteredResults.filter(
          (invoice) => invoice.status === "הוגש"
        );
      } else if (statusFilter === "inProgress") {
        filteredResults = filteredResults.filter(
          (invoice) => invoice.status === "בעיבוד"
        );
      } else if (statusFilter === "notSubmitted") {
        filteredResults = filteredResults.filter(
          (invoice) => invoice.status === "לא הוגש"
        );
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

  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e) => e.key === "Escape" && setShowReportModal(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const sortedInvoices = [...(searchTerm ? filteredInvoices : invoices)].sort(
    (a, b) => {
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
    }
  );

  const generateInvoicesPrint = () => {
    let filteredForPrint = [...allInvoices];

    if (selectedProjectForPrint) {
      filteredForPrint = filteredForPrint.filter(
        (inv) =>
          inv.projectId === selectedProjectForPrint ||
          inv.project?._id === selectedProjectForPrint
      );
    }

    if (selectedSupplierForPrint) {
      filteredForPrint = filteredForPrint.filter(
        (inv) => inv.supplierId?._id === selectedSupplierForPrint
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

    if (filteredForPrint.length === 0) {
      toast.error("לא נמצאו חשבוניות מתאימות לפילטרים שנבחרו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    const totalSum = filteredForPrint.reduce(
      (sum, inv) => sum + (inv.sum || 0),
      0
    );
    const paidSum = filteredForPrint
      .filter((inv) => inv.paid === "כן")
      .reduce((sum, inv) => sum + (inv.sum || 0), 0);
    const unpaidSum = totalSum - paidSum;

    const selectedProjectName = selectedProjectForPrint
      ? projectsForPrint.find((p) => p._id === selectedProjectForPrint)?.name ||
        ""
      : "";
    const selectedSupplierName = selectedSupplierForPrint
      ? suppliersForPrint.find((s) => s._id === selectedSupplierForPrint)
          ?.name || ""
      : "";

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

          .summary {
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
            border: 2px solid #fdba74;
            border-radius: 12px;
            padding: 20px;
            margin-top: 30px;
          }

          .summary h3 {
            color: #f97316;
            margin-bottom: 15px;
            font-size: 20px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #fdba74;
            font-size: 15px;
          }

          .summary-row:last-child {
            border-bottom: none;
          }

          .summary-row.total {
            font-size: 18px;
            font-weight: bold;
            color: #ea580c;
            margin-top: 10px;
          }

          .summary-row.paid {
            color: #16a34a;
            font-weight: 600;
          }

          .summary-row.unpaid {
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

        ${
          selectedProjectName ||
          selectedSupplierName ||
          fromDatePrint ||
          toDatePrint
            ? `
        <div class="filters">
          <h3>🔍 פילטרים</h3>
          ${
            selectedProjectName
              ? `<p><strong>פרויקט:</strong> ${selectedProjectName}</p>`
              : ""
          }
          ${
            selectedSupplierName
              ? `<p><strong>ספק:</strong> ${selectedSupplierName}</p>`
              : ""
          }
          ${
            fromDatePrint
              ? `<p><strong>מתאריך:</strong> ${new Date(
                  fromDatePrint
                ).toLocaleDateString("he-IL")}</p>`
              : ""
          }
          ${
            toDatePrint
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
                <td>${invoice.invitingName || "לא צוין"}</td>
                <td>${invoice.projectName || "-"}</td>
                <td><strong>${formatNumber(invoice.sum)} ₪</strong></td>
                <td>${formatDate(invoice.createdAt)}</td>
                <td>${invoice.status || "-"}</td>
                <td>
                  <span class="${
                    invoice.paid === "כן" ? "status-paid" : "status-unpaid"
                  }">
                    ${invoice.paid === "כן" ? "✓ שולם" : "✗ לא שולם"}
                  </span>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <h3>📊 סיכום</h3>
          <div class="summary-row">
            <span>סה"כ חשבוניות:</span>
            <strong>${filteredForPrint.length}</strong>
          </div>
          <div class="summary-row total">
            <span>סה"כ סכום כולל:</span>
            <strong>${formatNumber(totalSum)} ₪</strong>
          </div>
          <div class="summary-row paid">
            <span>✓ סכום ששולם:</span>
            <strong>${formatNumber(paidSum)} ₪</strong>
          </div>
          <div class="summary-row unpaid">
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
    setSelectedProjectForPrint("");
    setSelectedSupplierForPrint("");
    setFromDatePrint("");
    setToDatePrint("");
  };

  const getSupplier = (invoice) => {
    // אם זה populated
    if (invoice.supplierId && typeof invoice.supplierId === "object") {
      return invoice.supplierId;
    }

    // אם זה בשדה supplier (ישן)
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
      const supplier =
        invoice.supplierId && typeof invoice.supplierId === "object"
          ? invoice.supplierId
          : null;

      console.log("📋 Invoice:", invoice.invoiceNumber);
      console.log("👤 invitingName:", invoice.invitingName);
      console.log("🏢 supplierId (raw):", invoice.supplierId);
      console.log("🏢 supplier (resolved):", supplier);
      console.log("✅ supplier.name:", supplier?.name);
      console.log("---");

      const row = {};
      selectedColumns.forEach((col) => {
        switch (col) {
          case "invoiceNumber":
            row[columnMapping.invoiceNumber] = invoice.invoiceNumber || "";
            break;
          case "projectName":
            row[columnMapping.projectName] = invoice.projectName || "";
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
            row[columnMapping.paid] =
              invoice.paid === "כן" ? "שולם" : "לא שולם";
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
            row[columnMapping.paymentMethod] = invoice.paymentMethod || "";
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
      const supplier =
        invoice.supplierId && typeof invoice.supplierId === "object"
          ? invoice.supplierId
          : null;

      const baseData = {
        "מספר חשבונית": invoice.invoiceNumber || "",
        "שם פרוייקט": invoice.projectName || "",
        "שם ספק": supplier?.name || "לא זמין", // ✅ הוסף את זה!
        "שם מזמין": invoice.invitingName || "לא זמין", // ✅ הוסף את זה!
        "שם איש קשר": invoice.projectId?.Contact_person || "לא זמין",
        "תאריך יצירה": formatDate(invoice.invoiceDate || invoice.createdAt),
        סכום: formatNumber(Number(invoice.sum) || 0),
        "סטטוס הגשה": invoice.status || "",
        "סטטוס תשלום": invoice.paid === "כן" ? "שולם" : "לא שולם",
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
      let filtered = invoices;

      if (selectedProjectForPrint) {
        filtered = filtered.filter(
          (inv) => inv.project?._id === selectedProjectForPrint
        );
      }

      if (selectedSupplierForPrint) {
        filtered = filtered.filter(
          (inv) => inv.supplierId?._id === selectedSupplierForPrint
        );
      }

      if (fromDatePrint) {
        filtered = filtered.filter(
          (inv) => new Date(inv.createdAt) >= new Date(fromDatePrint)
        );
      }

      if (toDatePrint) {
        filtered = filtered.filter(
          (inv) => new Date(inv.createdAt) <= new Date(toDatePrint)
        );
      }

      const allFiles = [];

      filtered.forEach((invoice) => {
        if (Array.isArray(invoice.files)) {
          invoice.files.forEach((file) => {
            if (file.url) {
              allFiles.push({
                url: file.url,
                name: file.name || "file",
                invoiceNumber: invoice.invoiceNumber || "ללא",
                projectName: invoice.projectName || "ללא_פרויקט",
                supplierName: invoice.supplierId?.name || "ללא_ספק",
              });
            }
          });
        }
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

  // ✅ טעינת חשבוניות עם סינון לפי הרשאות
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get("/invoices");
        const allData = arr(res.data.data);

        // ✅ סנן חשבוניות לפי הרשאות
        const allowedProjectIds = getAllowedProjectIds();

        let filteredData = allData;
        if (allowedProjectIds !== null) {
          // אם לא אדמין - סנן לפי פרויקטים מורשים
          filteredData = allData.filter((invoice) => {
            const projectId = String(
              invoice.projectId?._id ||
                invoice.projectId ||
                invoice.project?._id ||
                invoice.project
            );
            return allowedProjectIds.includes(projectId);
          });
        }

        setAllInvoices(filteredData);
        setInvoices(filteredData);
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

  // הוסף את הפונקציות האלה:
  const toggleSelectInvoice = (invoice) => {
    setSelectedInvoices((prev) => {
      if (prev.some((inv) => inv._id === invoice._id)) {
        return prev.filter((inv) => inv._id !== invoice._id);
      } else {
        return [...prev, invoice];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === sortedInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(sortedInvoices);
    }
  };

  const handleBulkDelete = async () => {
    try {
      // מחק את כל החשבוניות הנבחרות
      await Promise.all(
        selectedInvoices.map((invoice) =>
          api.delete(`/invoices/${invoice._id}`)
        )
      );

      // עדכן את ה-state
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
    navigate(`/invoices/${id}`);
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

      // ביטול תשלום
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

      toast.success("סטטוס התשלום עודכן ל - לא שולם", {
        className: "sonner-toast success rtl",
      });
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בעדכון סטטוס התשלום", {
        className: "sonner-toast error rtl",
      });
    }
  };
  const handleSavePaymentCapture = async ({ paymentDate, paymentMethod }) => {
    const invoice = paymentCapture.invoice;
    if (!invoice) return;

    try {
      // ✅ קבל את החשבונית המעודכנת מה-Backend
      const response = await api.put(`/invoices/${invoice._id}/status`, {
        status: "כן",
        paymentDate,
        paymentMethod,
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

      toast.success(
        `עודכן לשולם (${paymentMethod === "check" ? "צ'ק" : "העברה"})`,
        { className: "sonner-toast success rtl" }
      );
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
  const exportPaymentBySupplier = () => {
    let filtered = [...allInvoices];

    // החל את אותם פילטרים כמו בהדפסה
    if (selectedProjectForPrint) {
      filtered = filtered.filter(
        (inv) =>
          inv.projectId === selectedProjectForPrint ||
          inv.project?._id === selectedProjectForPrint
      );
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

    // ✅ סנן רק חשבוניות ששולמו
    const unpaidInvoices = filtered.filter((inv) => inv.paid !== "כן");

    if (unpaidInvoices.length === 0) {
      toast.error("לא נמצאו חשבוניות שטרם שולמו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // קבץ לפי ספק
    const groupedBySupplier = {};

    unpaidInvoices.forEach((invoice) => {
      const supplier =
        invoice.supplierId && typeof invoice.supplierId === "object"
          ? invoice.supplierId
          : null;

      if (!supplier) return; // דלג על חשבוניות ללא ספק

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

      groupedBySupplier[supplierId].totalAmount += invoice.sum || 0;
      groupedBySupplier[supplierId].invoiceNumbers.push(
        invoice.invoiceNumber || ""
      );
      groupedBySupplier[supplierId].projects.add(invoice.projectName || "");
    });

    // המר לאקסל
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

    // הגדר רוחב עמודות
    worksheet["!cols"] = [
      { wpx: 150 }, // שם ספק
      { wpx: 120 }, // שם בנק
      { wpx: 100 }, // סניף
      { wpx: 120 }, // חשבון
      { wpx: 100 }, // סכום
      { wpx: 200 }, // חשבוניות
      { wpx: 200 }, // פרויקטים
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "תשלומים לספקים");

    const fileName = `תשלומים_מרוכז_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    toast.success(`יוצא קובץ עם ${excelData.length} ספקים לתשלום`, {
      className: "sonner-toast success rtl",
    });

    setShowPaymentExportModal(false);
    setShowPrintModal(false);
  };

  // ייצוא מפורט לפי חשבונית
  const exportPaymentDetailed = () => {
    let filtered = [...allInvoices];

    // החל פילטרים
    if (selectedProjectForPrint) {
      filtered = filtered.filter(
        (inv) =>
          inv.projectId === selectedProjectForPrint ||
          inv.project?._id === selectedProjectForPrint
      );
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

    // ✅ סנן רק חשבוניות שטרם שולמו
    const unpaidInvoices = filtered.filter((inv) => inv.paid !== "כן");

    if (unpaidInvoices.length === 0) {
      toast.error("לא נמצאו חשבוניות שטרם שולמו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // צור Excel מפורט
    const excelData = unpaidInvoices.map((invoice) => {
      const supplier =
        invoice.supplierId && typeof invoice.supplierId === "object"
          ? invoice.supplierId
          : null;

      return {
        "שם ספק": supplier?.name || "לא זמין",
        "מספר חשבונית": invoice.invoiceNumber || "",
        "שם פרויקט": invoice.projectName || "",
        סכום: invoice.sum || 0,
        "תאריך חשבונית": formatDate(invoice.createdAt),
        "שם בנק": supplier?.bankDetails?.bankName || "לא זמין",
        "מספר סניף": supplier?.bankDetails?.branchNumber || "לא זמין",
        "מספר חשבון": supplier?.bankDetails?.accountNumber || "לא זמין",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // הגדר רוחב עמודות
    worksheet["!cols"] = [
      { wpx: 150 }, // שם ספק
      { wpx: 120 }, // מספר חשבונית
      { wpx: 150 }, // פרויקט
      { wpx: 100 }, // סכום
      { wpx: 120 }, // תאריך
      { wpx: 120 }, // בנק
      { wpx: 100 }, // סניף
      { wpx: 120 }, // חשבון
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "חשבוניות לתשלום");

    const fileName = `תשלומים_מפורט_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    toast.success(`יוצא קובץ עם ${excelData.length} חשבוניות לתשלום`, {
      className: "sonner-toast success rtl",
    });

    setShowPaymentExportModal(false);
    setShowPrintModal(false);
  };

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
                  <h1 className="text-4xl font-black text-slate-900">
                    רשימת חשבוניות
                  </h1>
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
            {selectedInvoices.length > 0 && canEditInvoices && isAdmin && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-lg animate-bounce-slow"
              >
                <Trash2 className="w-5 h-5" />
                <span>מחק {selectedInvoices.length} נבחרות</span>
              </button>
            )}

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
              </div>

              {(paymentFilter !== "all" ||
                statusFilter !== "all" ||
                searchTerm) && (
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
                onClick={() => setMasavModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <FileText className="w-5 h-5" />
                <span>ייצוא מס״ב</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <FileText className="w-5 h-5" />
                <span>הדפסת מסמכים</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>מחולל דוחות</span>
              </button>

              <button
                onClick={exportToExcelWithSuppliers}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>ייצוא מהיר</span>
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600 font-medium flex items-center gap-4">
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
          </div>
        </div>

        {/* Invoices Table */}
        {sortedInvoices.length > 0 ? (
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
                        ? "0.4fr 0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.9fr 1.1fr"
                        : canEditInvoices
                        ? "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 1.1fr"
                        : "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr",
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
                        <span className="text-xs">בחר הכל</span>
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

                  {/* עמודה 5/4: סכום */}
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    סכום
                  </th>

                  {/* עמודה 6/5: תאריך */}
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    תאריך
                  </th>

                  {/* עמודה 7/6: סטטוס הגשה */}
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    סטטוס הגשה
                  </th>

                  {/* עמודה 8/7: שם פרוייקט */}
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    שם פרוייקט
                  </th>

                  {/* עמודה 9/8: תשלום */}
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    תשלום
                  </th>

                  {/* עמודה 10/9: קבצים */}
                  <th className="px-4 py-4 text-sm font-bold text-center text-white">
                    קבצים
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
                {sortedInvoices.map((invoice) => (
                  <tr
                    key={invoice._id}
                    className={`cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors ${
                      selectedInvoices.some((inv) => inv._id === invoice._id)
                        ? "bg-orange-100"
                        : ""
                    }`}
                    style={{
                      display: "grid",
                      gap: "2px",
                      gridTemplateColumns:
                        canEditInvoices && isAdmin
                          ? "0.4fr 0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 0.9fr 1.1fr"
                          : canEditInvoices
                          ? "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr 1.1fr"
                          : "0.9fr 1.1fr 0.9fr 0.9fr 0.9fr 0.9fr 1.3fr 0.9fr 0.7fr",
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
                      <td
                        className="px-2 py-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedInvoices.some(
                            (inv) => inv._id === invoice._id
                          )}
                          onChange={() => toggleSelectInvoice(invoice)}
                          className="w-5 h-5 accent-orange-500 cursor-pointer"
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
                      {invoice.supplierId?.name || (
                        <span className="text-red-500 italic">חסר</span>
                      )}
                    </td>

                    {/* עמודה 4/3: מספר חשבונית */}
                    <td className="px-2 py-4 text-xs font-bold text-center text-slate-900">
                      {invoice.invoiceNumber || (
                        <span className="text-red-500 italic">חסר</span>
                      )}
                    </td>

                    {/* עמודה 5/4: סכום */}
                    <td className="px-2 py-4 text-xs font-bold text-center text-slate-900">
                      {invoice.sum ? (
                        `${formatNumber(invoice.sum)} ₪`
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
                      {invoice.projectName || (
                        <span className="text-red-500 italic">חסר</span>
                      )}
                    </td>

                    {/* עמודה 9/8: תשלום */}
                    <td className="px-2 py-4 text-center">
                      {invoice.paid === "כן" ? (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200 whitespace-nowrap">
                          שולם
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200 whitespace-nowrap">
                          ממתין
                        </span>
                      )}
                    </td>

                    {/* עמודה 10/9: קבצים */}
                    <td className="px-2 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Paperclip className="w-4 h-4 text-orange-500" />
                        <span className="font-bold text-slate-900 text-xs">
                          {getInvoiceFilesCount(invoice)}
                        </span>
                      </div>
                    </td>

                    {/* עמודה 11: סימון תשלום - רק לאדמין */}
                    {canEditInvoices && isAdmin && (
                      <td className="px-2 py-4 text-center">
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
                            className={`w-6 h-6 inline-block border-2 rounded-full transition-all ${
                              invoice.paid === "כן"
                                ? "bg-emerald-500 border-emerald-500"
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
                          {isAdmin && (
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
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
                          <option value="unpaid">לא שולם</option>
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
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            exportColumns[column.key]
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
      onClick={() => setShowPrintModal(false)}
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
              onClick={() => setShowPrintModal(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* תוכן גולל */}
          <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">

            {/* בחירת פרויקט */}
            <label className="block font-semibold text-slate-700 mb-2">
              בחירת פרויקט
            </label>
            <select
              className="w-full p-3 border-2 border-orange-200 rounded-xl mb-6 font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              value={selectedProjectForPrint}
              onChange={(e) => setSelectedProjectForPrint(e.target.value)}
            >
              <option value="">כל הפרויקטים</option>
              {projectsForPrint.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* בחירת ספק */}
            <label className="block font-semibold text-slate-700 mb-2">
              בחירת ספק
            </label>
            <select
              className="w-full p-3 border-2 border-orange-200 rounded-xl mb-6 font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
              value={selectedSupplierForPrint}
              onChange={(e) => setSelectedSupplierForPrint(e.target.value)}
            >
              <option value="">כל הספקים</option>
              {suppliersForPrint.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* טווח תאריכים */}
            <label className="block font-semibold text-slate-700 mb-2">
              טווח תאריכים
            </label>
            <div className="flex gap-3 mb-10">
              <input
                type="date"
                className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                value={fromDatePrint}
                onChange={(e) => setFromDatePrint(e.target.value)}
              />
              <input
                type="date"
                className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                value={toDatePrint}
                onChange={(e) => setToDatePrint(e.target.value)}
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
                          {inv.projectName}
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
    </div>
  );
};

export default InvoicesPage;
