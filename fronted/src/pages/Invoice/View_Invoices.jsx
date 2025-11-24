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

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 🆕 State להדפסה
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
    supplierPhone: false,
    supplierEmail: false,
    supplierBankName: false,
    supplierBranchNumber: false,
    supplierAccountNumber: false,
  });

  const availableColumns = [
    { key: "invoiceNumber", label: "מספר חשבונית" },
    { key: "projectName", label: "שם הפרוייקט" },
    { key: "invitingName", label: "שם המזמין" },
    { key: "sum", label: "סכום" },
    { key: "status", label: "סטטוס הגשה" },
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "detail", label: "פירוט" },
    { key: "paid", label: "סטטוס תשלום" },
    { key: "paymentDate", label: "תאריך תשלום" },
    { key: "documentType", label: "סוג מסמך" },
    { key: "paymentMethod", label: "אמצעי תשלום" },
  ];

  const navigate = useNavigate();

  const formatNumber = (num) => num?.toLocaleString("he-IL");
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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

  // 🆕 useEffect לטעינת פרויקטים וספקים להדפסה
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
          (invoice.supplier?.name || "")
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
        filtered = filtered.filter(
          (inv) =>
            (inv.supplier?.name || "").toLowerCase().includes(q) ||
            (inv.invitingName || "").toLowerCase().includes(q)
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

  // 🆕 פונקציית הדפסה מלאה
  const generateInvoicesPrint = () => {
    let filteredForPrint = [...allInvoices];

    // סינון לפי פרויקט
    if (selectedProjectForPrint) {
      filteredForPrint = filteredForPrint.filter(
        (inv) =>
          inv.projectId === selectedProjectForPrint ||
          inv.project?._id === selectedProjectForPrint
      );
    }

    // סינון לפי ספק
    if (selectedSupplierForPrint) {
      filteredForPrint = filteredForPrint.filter(
        (inv) => inv.supplier?._id === selectedSupplierForPrint
      );
    }

    // סינון לפי תאריך התחלה
    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filteredForPrint = filteredForPrint.filter((inv) => {
        const invDate = normalizeDate(inv.createdAt);
        return invDate && invDate >= fromDate;
      });
    }

    // סינון לפי תאריך סיום
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

    // חישוב סיכומים
    const totalSum = filteredForPrint.reduce(
      (sum, inv) => sum + (inv.sum || 0),
      0
    );
    const paidSum = filteredForPrint
      .filter((inv) => inv.paid === "כן")
      .reduce((sum, inv) => sum + (inv.sum || 0), 0);
    const unpaidSum = totalSum - paidSum;

    // מציאת שמות לפילטרים
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
          case "supplierPhone":
            row[columnMapping.supplierPhone] =
              invoice.supplier?.phone || "לא זמין";
            break;
          case "supplierEmail":
            row[columnMapping.supplierEmail] =
              invoice.supplier?.email || "לא זמין";
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
        "תאריך תשלום":
          invoice.paid === "כן" ? formatDate(invoice.paymentDate) : "לא שולם",
      };

      if (invoice.supplier && typeof invoice.supplier === "object") {
        return {
          ...baseData,
          "שם ספק": invoice.supplier.name || "לא זמין",
          "טלפון ספק": invoice.supplier.phone || "לא זמין",
          "שם הבנק": invoice.supplier.bankDetails?.bankName || "לא זמין",
          "מספר סניף": invoice.supplier.bankDetails?.branchNumber || "לא זמין",
          "מספר חשבון":
            invoice.supplier.bankDetails?.accountNumber || "לא זמין",
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
        const res = await api.get("/invoices");
        setAllInvoices(arr(res.data.data));
        setInvoices(arr(res.data));
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

      const { data: updated } = await api.put(
        `/invoices/${invoice._id}/status`,
        { paid: "לא" }
      );

      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updated : inv))
      );

      setAllInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updated : inv))
      );

      toast.success("סטטוס התשלום עודכן ל - לא", {
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
      const { data: updated } = await api.put(
        `/invoices/${invoice._id}/status`,
        { paid: "כן", paymentDate, paymentMethod }
      );

      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updated : inv))
      );
      setAllInvoices((prev) =>
        prev.map((inv) => (inv._id === invoice._id ? updated : inv))
      );
      toast.success(
        `עודכן לשולם (${paymentMethod === "check" ? "צ׳ק" : "העברה"})`,
        {
          className: "sonner-toast success rtl",
        }
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

  const checkMissingFields = (invoice) => {
    const missingFields = [];

    if (!invoice.supplier || !invoice.supplier.name) {
      missingFields.push("ספק");
    }
    if (!invoice.invoiceNumber) {
      missingFields.push("מספר חשבונית");
    }
    if (!invoice.sum) {
      missingFields.push("סכום");
    }
    if (!invoice.projectName) {
      missingFields.push("פרויקט");
    }
    if (!invoice.files || invoice.files.length === 0) {
      missingFields.push("קבצים");
    }
    if (!invoice.detail || invoice.detail.trim() === "") {
      missingFields.push("פירוט");
    }

    return missingFields;
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
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
              >
                הדפסת מסמכים
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-700 transition-all shadow-lg shadow-purple-500/30"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>מחולל דוחות</span>
              </button>

              <button
                onClick={exportToExcelWithSuppliers}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-700 transition-all shadow-lg shadow-emerald-500/30"
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
                    <th className="px-4 py-4 text-sm font-bold text-center">
                      סטטוס
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      שם הספק
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      מספר חשבונית
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      סכום
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      תאריך חשבונית
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      סטטוס
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      שם פרוייקט
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      תשלום
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      סימון תשלום
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice) => {
                    const missingFields = checkMissingFields(invoice);
                    const hasMissingData = missingFields.length > 0;

                    return (
                      <tr
                        key={invoice._id}
                        className="cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors"
                        onClick={(e) => {
                          if (!e.target.closest("label")) {
                            handleView(invoice._id);
                          }
                        }}
                      >
                        {/* עמודת סטטוס */}
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const a = getActionState(invoice);
                            return (
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${a.color}`}
                              >
                                <span>{a.status}</span>
                                <span className="opacity-70">•</span>
                                <span>{a.label}</span>
                              </span>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                          {invoice.invitingName || (
                            <span className="text-red-500 italic flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              חסר
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                          {invoice.invoiceNumber || (
                            <span className="text-red-500 italic flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              חסר
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-slate-900">
                          {invoice.sum ? (
                            `${formatNumber(invoice.sum)} ₪`
                          ) : (
                            <span className="text-red-500 italic flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              חסר
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600 text-center">
                          {formatDate(invoice.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                          {invoice.status || (
                            <span className="text-red-500 italic flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              חסר
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {invoice.projectName || (
                            <span className="text-red-500 italic flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              חסר
                            </span>
                          )}
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
                    );
                  })}
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

        {/* Report Generation Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReportModal(false)}
            />

            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="relative w-full max-w-4xl mt-20"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-xl"></div>

                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold">
                          מחולל דוחות חשבוניות
                        </h3>
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
                    <p className="text-white/90 text-sm mt-2">
                      סנן את החשבוניות ובחר עמודות לייצוא
                    </p>
                  </div>

                  <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">
                    {/* Advanced Filters Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Filter className="w-5 h-5 text-orange-500" />
                          סינון מתקדם
                        </h4>
                        <button
                          onClick={() =>
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
                              documentType: "",
                              paymentMethod: "",
                            })
                          }
                          className="text-sm text-red-600 hover:text-red-700 font-bold"
                        >
                          נקה סינונים
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* יצירה מ/עד */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך יצירה מ־
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך יצירה עד־
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

                        {/* תשלום מ/עד */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך תשלום מ־
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך תשלום עד־
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

                        {/* סכום */}
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
                            placeholder="₪"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
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
                            placeholder="₪"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* שמות */}
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            שם ספק / מזמין
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

                        {/* טווח מספר חשבונית */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            מס׳ חשבונית מ־
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.invoiceNumberFrom}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                invoiceNumberFrom: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            מס׳ חשבונית עד־
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.invoiceNumberTo}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                invoiceNumberTo: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* יש/אין ספק */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            ספק
                          </label>
                          <select
                            value={advancedFilters.hasSupplier}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                hasSupplier: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          >
                            <option value="all">הכל</option>
                            <option value="yes">קיים ספק</option>
                            <option value="no">ללא ספק</option>
                          </select>
                        </div>

                        {/* סטטוסי תשלום/הגשה */}
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

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סטטוס הגשה
                          </label>
                          <select
                            value={advancedFilters.submissionStatus}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                submissionStatus: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          >
                            <option value="all">הכל</option>
                            <option value="submitted">הוגש</option>
                            <option value="inProgress">בעיבוד</option>
                            <option value="notSubmitted">לא הוגש</option>
                          </select>
                        </div>

                        {/* סוג מסמך / אמצעי תשלום */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סוג מסמך
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.documentType || ""}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                documentType: e.target.value,
                              })
                            }
                            placeholder='למשל: "חשבונית מס/קבלה", "ח. עסקה"'
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            אמצעי תשלום
                          </label>
                          <select
                            value={advancedFilters.paymentMethod || ""}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                paymentMethod: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          >
                            <option value="">הכל</option>
                            <option value="bank_transfer">העברה בנקאית</option>
                            <option value="check">צ׳ק</option>
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
                              checked={!!exportColumns[column.key]}
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
            </div>
          </div>
        )}

        {/* 🆕 Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white p-6 rounded-2xl w-[480px]">
                <h2 className="text-xl font-bold mb-4 text-center">
                  הפקת מסמכים להדפסה
                </h2>

                {/* בחירת פרויקט */}
                <label className="block font-medium mb-2">בחירת פרויקט</label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-orange-500 focus:outline-none"
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
                <label className="block font-medium mb-2">בחירת ספק</label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-orange-500 focus:outline-none"
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

                {/* תאריכים */}
                <label className="block font-medium mb-2">טווח תאריכים</label>
                <div className="flex gap-3 mb-4">
                  <input
                    type="date"
                    className="w-1/2 border-2 border-gray-200 p-2 rounded-xl focus:border-orange-500 focus:outline-none"
                    value={fromDatePrint}
                    onChange={(e) => setFromDatePrint(e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-1/2 border-2 border-gray-200 p-2 rounded-xl focus:border-orange-500 focus:outline-none"
                    value={toDatePrint}
                    onChange={(e) => setToDatePrint(e.target.value)}
                  />
                </div>

                <div className="flex justify-between mt-4 gap-3">
                  <button
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all font-bold"
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

                  <button
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all font-bold"
                    onClick={generateInvoicesPrint}
                  >
                    הפק PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-white" />
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
    </div>
  );
};

export default InvoicesPage;
