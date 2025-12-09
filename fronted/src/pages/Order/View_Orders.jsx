import React, { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
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
  ShoppingCart,
  Sparkles,
  Search,
  ArrowUpDown,
  AlertCircle,
  CheckSquare,
  Square,
  Paperclip,
  FileText,
} from "lucide-react";
import api from "../../api/api.js";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext.jsx";
import JSZip from "jszip";

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canViewModule, canEditModule, isAdmin } = useAuth();

  const canViewOrders = canViewModule(null, "orders");
  const canEditOrders = canEditModule(null, "orders");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("sum");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPaymentExportModal, setShowPaymentExportModal] = useState(false);
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
    sumMin: "",
    sumMax: "",
    projectName: "",
    invitingName: "",
    orderNumber: "",
    status: "",
    detail: "",
  });

  const [exportColumns, setExportColumns] = useState({
    orderNumber: true,
    projectName: true,
    supplierName: true, // ✅ הוסף
    invitingName: true,
    sum: true,
    status: true,
    createdAt: true,
    detail: false,
    formattedSum: false,
    formattedDate: false,
    daysSinceCreated: false,
    // ✅ הוסף את כל עמודות הספק:
    supplierPhone: false,
    supplierEmail: false,
    supplierBankName: false,
    supplierBranchNumber: false,
    supplierAccountNumber: false,
  });
  useEffect(() => {
    if (!canViewOrders) {
      navigate("/no-access");
    }
  }, [canViewOrders]);

  const formatNumber = (num) => num?.toLocaleString("he-IL");
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 🆕 פונקציה לספירת קבצים בהזמנה
  const getOrderFilesCount = (order) => {
    let count = 0;

    // ספור files (מערך)
    if (Array.isArray(order.files) && order.files.length > 0) {
      count += order.files.length;
    }

    // ספור file יחיד (הזמנות ישנות)
    if (
      order.file &&
      typeof order.file === "string" &&
      order.file.trim() !== "" &&
      order.file.startsWith("http")
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

  const normalizeSupplier = (s) => {
    if (!s) return null;

    // אם הגיע רק סטרינג (ID), נחזיר אובייקט בסיסי ריק עם ID בלבד
    if (typeof s === "string") {
      return { _id: s };
    }

    return {
      _id: s._id,
      name: s.name || "לא זמין",
      phone: s.phone || "לא זמין",
      email: s.email || "לא זמין",
      bankDetails: {
        bankName: s.bankDetails?.bankName || "לא זמין",
        branchNumber: s.bankDetails?.branchNumber || "לא זמין",
        accountNumber: s.bankDetails?.accountNumber || "לא זמין",
      },
    };
  };

  const availableColumns = [
    { key: "orderNumber", label: "מספר הזמנה" },
    { key: "projectName", label: "שם הפרויקט" },
    { key: "supplierName", label: "שם ספק" }, // ✅ הוסף
    { key: "invitingName", label: "שם המזמין" },
    { key: "sum", label: "סכום" },
    { key: "status", label: "סטטוס" },
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "detail", label: "פירוט" },
    { key: "formattedSum", label: "סכום מעוצב" },
    { key: "formattedDate", label: "תאריך מעוצב" },
    { key: "daysSinceCreated", label: "ימים מיצירה" },
    // ✅ הוסף את כל עמודות הספק:
    { key: "supplierPhone", label: "טלפון ספק" },
    { key: "supplierEmail", label: "אימייל ספק" },
    { key: "supplierBankName", label: "שם בנק ספק" },
    { key: "supplierBranchNumber", label: "מספר סניף ספק" },
    { key: "supplierAccountNumber", label: "מספר חשבון ספק" },
  ];

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

  const getFilteredOrders = () => {
    let filtered = [...allOrders];

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber?.toString().includes(searchTerm) ||
          order.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.invitingName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showReportModal) {
      if (advancedFilters.dateFrom) {
        filtered = filtered.filter(
          (order) =>
            new Date(order.createdAt) >= new Date(advancedFilters.dateFrom)
        );
      }
      if (advancedFilters.dateTo) {
        filtered = filtered.filter(
          (order) =>
            new Date(order.createdAt) <= new Date(advancedFilters.dateTo)
        );
      }
      if (advancedFilters.sumMin) {
        filtered = filtered.filter(
          (order) => order.sum >= parseInt(advancedFilters.sumMin)
        );
      }
      if (advancedFilters.sumMax) {
        filtered = filtered.filter(
          (order) => order.sum <= parseInt(advancedFilters.sumMax)
        );
      }
      if (advancedFilters.projectName) {
        filtered = filtered.filter((order) =>
          order.projectName
            ?.toLowerCase()
            .includes(advancedFilters.projectName.toLowerCase())
        );
      }
      if (advancedFilters.invitingName) {
        filtered = filtered.filter((order) =>
          order.invitingName
            ?.toLowerCase()
            .includes(advancedFilters.invitingName.toLowerCase())
        );
      }
      if (advancedFilters.orderNumber) {
        filtered = filtered.filter((order) =>
          order.orderNumber?.toString().includes(advancedFilters.orderNumber)
        );
      }
      if (advancedFilters.status) {
        filtered = filtered.filter(
          (order) => order.status === advancedFilters.status
        );
      }
      if (advancedFilters.detail) {
        filtered = filtered.filter((order) =>
          order.detail
            ?.toLowerCase()
            .includes(advancedFilters.detail.toLowerCase())
        );
      }
    } else {
      if (selectedStatus) {
        filtered = filtered.filter((order) => order.status === selectedStatus);
      }
    }

    return filtered;
  };

  const calculateOrderStats = (order) => {
    const daysSinceCreated = Math.floor(
      (new Date() - new Date(order.createdAt)) / (1000 * 60 * 60 * 24)
    );
    const formattedSum = formatNumber(order.sum) + " ₪";
    const formattedDate = formatDate(order.createdAt);
    return { daysSinceCreated, formattedSum, formattedDate };
  };

  // 🆕 פונקציית הדפסה להזמנות
  const generateOrdersPrint = () => {
    let filteredForPrint = [...allOrders];

    // סינון לפי פרויקט
    if (selectedProjectForPrint) {
      filteredForPrint = filteredForPrint.filter(
        (ord) =>
          ord.projectId === selectedProjectForPrint ||
          ord.project?._id === selectedProjectForPrint
      );
    }

    // סינון לפי ספק (אם יש שדה ספק בהזמנות)
    if (selectedSupplierForPrint) {
      filteredForPrint = filteredForPrint.filter(
        (ord) => ord.supplierId?._id === selectedSupplierForPrint
      );
    }

    // סינון לפי תאריך התחלה
    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filteredForPrint = filteredForPrint.filter((ord) => {
        const ordDate = normalizeDate(ord.createdAt);
        return ordDate && ordDate >= fromDate;
      });
    }

    // סינון לפי תאריך סיום
    if (toDatePrint) {
      const toDate = new Date(toDatePrint);
      filteredForPrint = filteredForPrint.filter((ord) => {
        const ordDate = normalizeDate(ord.createdAt);
        return ordDate && ordDate <= toDate;
      });
    }

    if (filteredForPrint.length === 0) {
      toast.error("לא נמצאו הזמנות מתאימות לפילטרים שנבחרו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // חישוב סיכומים
    const totalSum = filteredForPrint.reduce(
      (sum, ord) => sum + (ord.sum || 0),
      0
    );

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
        <title>דוח הזמנות - ניהולון</title>
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
          <h1>📋 דוח הזמנות</h1>
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
              <th>מספר הזמנה</th>
              <th>שם המזמין</th>
              <th>פרויקט</th>
              <th>סכום</th>
              <th>תאריך</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            ${filteredForPrint
              .map(
                (order, idx) => `
              <tr>
                <td><strong>${idx + 1}</strong></td>
                <td><strong>${order.orderNumber || "-"}</strong></td>
                <td>${order.invitingName || "לא צוין"}</td>
                <td>${order.projectName || "-"}</td>
                <td><strong>${formatNumber(order.sum)} ₪</strong></td>
                <td>${formatDate(order.createdAt)}</td>
                <td>${order.status || "-"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <h3>📊 סיכום</h3>
          <div class="summary-row">
            <span>סה"כ הזמנות:</span>
            <strong>${filteredForPrint.length}</strong>
          </div>
          <div class="summary-row total">
            <span>סה"כ סכום כולל:</span>
            <strong>${formatNumber(totalSum)} ₪</strong>
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

    toast.success(`נפתח חלון הדפסה עם ${filteredForPrint.length} הזמנות!`, {
      className: "sonner-toast success rtl",
      duration: 3000,
    });

    setShowPrintModal(false);
    setSelectedProjectForPrint("");
    setSelectedSupplierForPrint("");
    setFromDatePrint("");
    setToDatePrint("");
  };

  const toggleColumn = (columnKey) => {
    setExportColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
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

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      sumMin: "",
      sumMax: "",
      projectName: "",
      invitingName: "",
      orderNumber: "",
      status: "",
      detail: "",
    });
  };

  const exportCustomReport = () => {
    const dataToExport = getFilteredOrders();

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const selectedColumns = Object.keys(exportColumns).filter(
      (key) => exportColumns[key]
    );

    if (selectedColumns.length === 0) {
      toast.error("יש לבחור לפחות עמודה אחת לייצוא", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    const ordersData = dataToExport.map((order) => {
      const supplier = normalizeSupplier(order.supplierId);
      if (!supplier?._id) return; // עדיין לא תקין

      const stats = calculateOrderStats(order);
      const row = {};

      selectedColumns.forEach((col) => {
        switch (col) {
          case "orderNumber":
            row["מספר הזמנה"] = order.orderNumber || "";
            break;

          case "projectName":
            row["שם הפרויקט"] = order.projectName || "";
            break;

          case "invitingName":
            row["שם המזמין"] = order.invitingName || "";
            break;

          case "supplierName":
            row["שם ספק"] = supplier?.name || "אין ספק מוגדר";
            break;

          case "sum":
            row["סכום"] = order.sum || 0;
            break;

          case "status":
            row["סטטוס"] = order.status || "";
            break;

          case "createdAt":
            row["תאריך יצירה"] = formatDate(order.createdAt);
            break;

          case "detail":
            row["פירוט"] = order.detail || "";
            break;

          // 🟦 נתוני ספק מלאים
          case "supplierPhone":
            row["טלפון ספק"] = supplier?.phone || "לא זמין";
            break;

          case "supplierEmail":
            row["אימייל ספק"] = supplier?.email || "לא זמין";
            break;

          case "supplierBankName":
            row["שם בנק ספק"] = supplier?.bankDetails?.bankName || "לא זמין";
            break;

          case "supplierBranchNumber":
            row["מספר סניף ספק"] =
              supplier?.bankDetails?.branchNumber || "לא זמין";
            break;

          case "supplierAccountNumber":
            row["מספר חשבון ספק"] =
              supplier?.bankDetails?.accountNumber || "לא זמין";
            break;

          // 🟧 נתוני עיצוב
          case "formattedSum":
            row["סכום מעוצב"] = stats.formattedSum;
            break;

          case "formattedDate":
            row["תאריך מעוצב"] = stats.formattedDate;
            break;

          case "daysSinceCreated":
            row["ימים מיצירה"] = stats.daysSinceCreated;
            break;
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(ordersData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח הזמנות");

    const fileName = `דוח_הזמנות_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${ordersData.length} הזמנות`, {
      className: "sonner-toast success rtl",
    });
  };

  const filteredOrders = searchTerm
    ? getFilteredOrders()
    : selectedStatus
    ? orders.filter((order) => order.status === selectedStatus)
    : orders;

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "sum") {
      return sortOrder === "asc" ? a.sum - b.sum : b.sum - a.sum;
    }
    if (sortBy === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  const exportToExcel = () => {
    const ordersWithHeaders = sortedOrders.map((order) => ({
      "מספר הזמנה": order.orderNumber,
      "שם הפרוייקט": order.projectName,
      "שם המזמין": order.invitingName,
      "תאריך יצירה": formatDate(order.createdAt),
      "סכום ": formatNumber(order.sum),
      סטטוס: order.status,
      פירוט: order.detail,
    }));

    const worksheet = XLSX.utils.json_to_sheet(ordersWithHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "הזמנות");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "הזמנות.xlsx"
    );
  };

  const arr = (res) =>
    Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];

  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedProjectId = authUser?.selectedProject;

  // 🆕 פונקציית הורדת קבצים מצורפים להזמנות
  const downloadAttachedFiles = async () => {
    try {
      let filtered = [...allOrders];

      // סינון פרויקט
      if (selectedProjectForPrint) {
        filtered = filtered.filter(
          (ord) =>
            ord.projectId === selectedProjectForPrint ||
            ord.project?._id === selectedProjectForPrint
        );
      }

      // סינון ספק
      if (selectedSupplierForPrint) {
        filtered = filtered.filter(
          (ord) =>
            ord.supplierId?._id === selectedSupplierForPrint ||
            ord.supplier?._id === selectedSupplierForPrint
        );
      }

      // סינון תאריכים
      if (fromDatePrint) {
        const fromDate = new Date(fromDatePrint);
        filtered = filtered.filter((ord) => {
          const ordDate = normalizeDate(ord.createdAt);
          return ordDate && ordDate >= fromDate;
        });
      }

      if (toDatePrint) {
        const toDate = new Date(toDatePrint);
        filtered = filtered.filter((ord) => {
          const ordDate = normalizeDate(ord.createdAt);
          return ordDate && ordDate <= toDate;
        });
      }

      // איסוף קבצים
      const allFiles = [];

      filtered.forEach((order) => {
        if (order.files && Array.isArray(order.files)) {
          order.files.forEach((file) => {
            if (file.url) {
              allFiles.push({
                url: file.url,
                name: file.name || "file",
                orderNumber: order.orderNumber || "ללא",
                projectName: order.projectName || "ללא_פרויקט",
                invitingName: order.invitingName || "ללא_מזמין",
              });
            }
          });
        }
      });

      if (allFiles.length === 0) {
        toast.error("לא נמצאו קבצים מצורפים להזמנות שנבחרו");
        return;
      }

      toast.info("מכין ZIP להורדה...");

      // שליחה לשרת
      const response = await api.post(
        "/upload/download-zip",
        { files: allFiles },
        { responseType: "blob" }
      );

      // שמירה
      saveAs(
        new Blob([response.data], { type: "application/zip" }),
        `קבצים_מצורפים_הזמנות_${new Date()
          .toLocaleDateString("he-IL")
          .replace(/\./g, "_")}.zip`
      );

      toast.success("ZIP ירד בהצלחה!");

      // איפוס
      setShowPrintModal(false);
      setSelectedProjectForPrint("");
      setSelectedSupplierForPrint("");
      setFromDatePrint("");
      setToDatePrint("");
    } catch (err) {
      console.error("ZIP Error:", err);
      toast.error("שגיאה בהורדת ZIP");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await api.get("/orders");
        const ordersData = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];

        console.log("========== DEBUG ORDERS ==========");
        ordersData.slice(0, 10).forEach((ord, i) => {
          console.log(`ORDER #${i + 1}:`);

          console.log("supplierId:", ord.supplierId);
          console.log("typeof supplierId:", typeof ord.supplierId);

          if (ord.supplierId && typeof ord.supplierId === "object") {
            console.log("supplierId keys:", Object.keys(ord.supplierId));
            console.log("bankDetails:", ord.supplierId.bankDetails);
          }

          console.log("-----------------------------------");
        });

        setAllOrders(ordersData);
        console.log("🔥 DEBUG ORDER SAMPLE:", ordersData[0]);
        console.log("🔥 supplierId:", ordersData[0]?.supplierId);
        console.log("🔥 type:", typeof ordersData[0]?.supplierId);

        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("שגיאה בטעינת הזמנות");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, authLoading]);

  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e) => e.key === "Escape" && setShowReportModal(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const handleDelete = async () => {
    if (!orderToDelete) {
      toast.error("לא נבחרה הזמנה למחיקה", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    try {
      await api.delete(`/orders/${orderToDelete}`, {
        params: { projectId: selectedProjectId },
      });

      setOrders((prev) => prev.filter((o) => o._id !== orderToDelete));
      setAllOrders((prev) => prev.filter((o) => o._id !== orderToDelete));

      setShowModal(false);

      toast.success("ההזמנה נמחקה בהצלחה", {
        className: "sonner-toast success rtl",
      });
    } catch (error) {
      toast.error("שגיאה במחיקת הזמנה", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-order/${id}`);
  };

  const handleView = (id) => {
    navigate(`/orders/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען רשימת הזמנות...
        </h1>
      </div>
    );
  }

  // ייצוא מרוכז לפי ספק - הזמנות
  const exportPaymentBySupplier = () => {
    let filtered = [...allOrders];

    // החל פילטרים
    if (selectedProjectForPrint) {
      filtered = filtered.filter(
        (ord) =>
          ord.projectId === selectedProjectForPrint ||
          ord.project?._id === selectedProjectForPrint
      );
    }

    if (selectedSupplierForPrint) {
      filtered = filtered.filter(
        (ord) => ord.supplierId?._id === selectedSupplierForPrint
      );
    }

    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filtered = filtered.filter((ord) => {
        const ordDate = normalizeDate(ord.createdAt);
        return ordDate && ordDate >= fromDate;
      });
    }

    if (toDatePrint) {
      const toDate = new Date(toDatePrint);
      filtered = filtered.filter((ord) => {
        const ordDate = normalizeDate(ord.createdAt);
        return ordDate && ordDate <= toDate;
      });
    }

    if (filtered.length === 0) {
      toast.error("לא נמצאו הזמנות מתאימות לפילטרים שנבחרו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // קבץ לפי ספק
    const groupedBySupplier = {};

    filtered.forEach((order) => {
      const supplier = normalizeSupplier(order.supplierId);

      if (!supplier) return; // דלג על הזמנות ללא ספק

      const supplierId = supplier._id;

      if (!groupedBySupplier[supplierId]) {
        groupedBySupplier[supplier._id] = {
          supplierName: supplier.name,
          bankName: supplier.bankDetails.bankName,
          branchNumber: supplier.bankDetails.branchNumber,
          accountNumber: supplier.bankDetails.accountNumber,
          totalAmount: 0,
          orderNumbers: [],
          projects: new Set(),
        };
      }

      groupedBySupplier[supplierId].totalAmount += order.sum || 0;
      groupedBySupplier[supplierId].orderNumbers.push(order.orderNumber || "");
      groupedBySupplier[supplierId].projects.add(order.projectName || "");
    });

    // המר לאקסל
    const excelData = Object.values(groupedBySupplier).map((group) => ({
      "שם ספק": group.supplierName,
      "שם בנק": group.bankName,
      "מספר סניף": group.branchNumber,
      "מספר חשבון": group.accountNumber,
      'סה"כ לתשלום': group.totalAmount,
      "מספרי הזמנות": group.orderNumbers.join(", "),
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
      { wpx: 200 }, // הזמנות
      { wpx: 200 }, // פרויקטים
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "תשלומים לספקים");

    const fileName = `תשלומים_מרוכז_הזמנות_${new Date()
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

  // ייצוא מפורט לפי הזמנה
  const exportPaymentDetailed = () => {
    let filtered = [...allOrders];

    // החל פילטרים
    if (selectedProjectForPrint) {
      filtered = filtered.filter(
        (ord) =>
          ord.projectId === selectedProjectForPrint ||
          ord.project?._id === selectedProjectForPrint
      );
    }

    if (selectedSupplierForPrint) {
      filtered = filtered.filter(
        (ord) => ord.supplierId?._id === selectedSupplierForPrint
      );
    }

    if (fromDatePrint) {
      const fromDate = new Date(fromDatePrint);
      filtered = filtered.filter((ord) => {
        const ordDate = normalizeDate(ord.createdAt);
        return ordDate && ordDate >= fromDate;
      });
    }

    if (toDatePrint) {
      const toDate = new Date(toDatePrint);
      filtered = filtered.filter((ord) => {
        const ordDate = normalizeDate(ord.createdAt);
        return ordDate && ordDate <= toDate;
      });
    }

    if (filtered.length === 0) {
      toast.error("לא נמצאו הזמנות מתאימות לפילטרים שנבחרו", {
        className: "sonner-toast error rtl",
      });
      return;
    }

    // צור Excel מפורט
    const excelData = filtered.map((order) => {
      const supplier = normalizeSupplier(order.supplierId);

      return {
        "שם ספק": supplier?.name || "לא זמין",
        "מספר הזמנה": order.orderNumber || "",
        "שם פרויקט": order.projectName || "",
        סכום: order.sum || 0,
        "תאריך הזמנה": formatDate(order.createdAt),
        "שם בנק": supplier?.bankDetails?.bankName || "לא זמין",
        "מספר סניף": supplier?.bankDetails?.branchNumber || "לא זמין",
        "מספר חשבון": supplier?.bankDetails?.accountNumber || "לא זמין",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // הגדר רוחב עמודות
    worksheet["!cols"] = [
      { wpx: 150 }, // שם ספק
      { wpx: 120 }, // מספר הזמנה
      { wpx: 150 }, // פרויקט
      { wpx: 100 }, // סכום
      { wpx: 120 }, // תאריך
      { wpx: 120 }, // בנק
      { wpx: 100 }, // סניף
      { wpx: 120 }, // חשבון
    ];

    worksheet["!rtl"] = true;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "הזמנות לתשלום");

    const fileName = `תשלומים_מפורט_הזמנות_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    toast.success(`יוצא קובץ עם ${excelData.length} הזמנות לתשלום`, {
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
                  <ShoppingCart className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    רשימת הזמנות
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      ניהול וניתוח הזמנות
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
                    placeholder="חיפוש לפי מספר הזמנה, פרויקט או מזמין..."
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
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  value={selectedStatus}
                  className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="הוגש">הוגש</option>
                  <option value="לא הוגש">לא הוגש</option>
                  <option value="בעיבוד">בעיבוד</option>
                </select>

                {(selectedStatus || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedStatus("");
                      setSearchTerm("");
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-bold"
                  >
                    נקה סינון
                  </button>
                )}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
                   <button
                onClick={() => navigate("/create-order")}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <Sparkles className="w-5 h-5" />
                <span>יצירת הזמנה</span>
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
                onClick={exportToExcel}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>ייצוא מהיר</span>
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600 font-medium">
            מציג {sortedOrders.length} הזמנות מתוך {allOrders.length}
          </div>
        </div>

        {/* Orders Table */}
        {sortedOrders.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <th className="px-6 py-4 text-sm font-bold text-center text-white">
                      מספר הזמנה
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-center text-white">
                      סכום
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-center text-white">
                      סטטוס
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-center text-white">
                      שם פרויקט
                    </th>
                    <th className="px-6 py-4 text-sm font-bold text-center text-white">
                      קבצים
                    </th>
                    {(isAdmin || canEditOrders) && (
                      <th className="px-6 py-4 text-sm font-bold text-center text-white">
                        פעולות
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr
                      key={order._id}
                      onClick={() => handleView(order._id)}
                      className="cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-center text-slate-900">
                        {order.orderNumber}
                      </td>

                      <td className="px-6 py-4 text-sm font-bold text-center text-slate-900">
                        {formatNumber(order.sum)} ₪
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-center text-slate-900">
                        {order.status}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-center text-slate-900">
                        {order.projectName}
                      </td>

                      {/* 🆕 עמודת קבצים */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Paperclip className="w-4 h-4 text-orange-500" />
                          <span className="font-bold text-slate-900">
                            {getOrderFilesCount(order)}
                          </span>
                        </div>
                      </td>

                      {(isAdmin || canEditOrders) && (
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {canEditOrders && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(order._id);
                                }}
                                className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order._id);
                                  setShowModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">
              {searchTerm || selectedStatus
                ? "לא נמצאו תוצאות"
                : "אין הזמנות להציג"}
            </h2>
          </div>
        )}

        {/* 🆕 Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50">
            {/* רקע כהה */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPrintModal(false)}
            />

            {/* מרכז המסך */}
            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="relative w-full max-w-xl mt-20"
                onClick={(e) => e.stopPropagation()}
              >
                {/* אפקט זוהר */}
                <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-xl"></div>

                {/* גוף המודל */}
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-6 h-6" />
                      <h3 className="text-2xl font-bold">הפקת מסמכים</h3>
                    </div>

                    <button
                      onClick={() => setShowPrintModal(false)}
                      className="text-white hover:bg-white/20 rounded-lg p-2 transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* תוכן עם scroll פנימי */}
                  <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">
                    {/* ---- כאן נכנס כל התוכן המקורי שלך ---- */}

                    {/* בחירת פרויקט */}
                    <label className="block font-semibold text-slate-700 mb-2">
                      בחירת פרויקט
                    </label>
                    <select
                      className="w-full p-3 border-2 border-orange-200 rounded-xl mb-4"
                      value={selectedProjectForPrint}
                      onChange={(e) =>
                        setSelectedProjectForPrint(e.target.value)
                      }
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
                      className="w-full p-3 border-2 border-orange-200 rounded-xl mb-4"
                      value={selectedSupplierForPrint}
                      onChange={(e) =>
                        setSelectedSupplierForPrint(e.target.value)
                      }
                    >
                      <option value="">כל הספקים</option>
                      {suppliersForPrint.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    {/* תאריכים */}
                    <label className="block font-semibold text-slate-700 mb-2">
                      טווח תאריכים
                    </label>
                    <div className="flex gap-3 mb-6">
                      <input
                        type="date"
                        className="w-1/2 p-3 border-2 rounded-xl"
                        value={fromDatePrint}
                        onChange={(e) => setFromDatePrint(e.target.value)}
                      />
                      <input
                        type="date"
                        className="w-1/2 p-3 border-2 rounded-xl"
                        value={toDatePrint}
                        onChange={(e) => setToDatePrint(e.target.value)}
                      />
                    </div>

                    {/* כפתורים */}
                    <div className="flex flex-col gap-3">
                      <button
                        className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl"
                        onClick={downloadAttachedFiles}
                      >
                        הורד ZIP
                      </button>

                      <button
                        className="w-full px-6 py-4 bg-orange-600 text-white rounded-xl"
                        onClick={generateOrdersPrint}
                      >
                        הפק PDF
                      </button>

                      <button
                        className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl"
                        onClick={() => setShowPaymentExportModal(true)}
                      >
                        ייצוא לתשלום (Excel)
                      </button>

                      <button
                        className="w-full px-6 py-4 bg-gray-200 rounded-xl"
                        onClick={() => setShowPrintModal(false)}
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
  <div className="fixed inset-0 z-50">
    {/* רקע כהה */}
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowPaymentExportModal(false)}
    />

    {/* מרכז המסך */}
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-4xl mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* אפקט זוהר */}
        <div className="pointer-events-none absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur-xl"></div>

        {/* קונטיינר המודל */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* HEADER */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileSpreadsheet className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold">בחר סוג ייצוא לתשלום</h3>
            </div>

            <button
              onClick={() => setShowPaymentExportModal(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* גוף המודל + scroll פנימי */}
          <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-8">

            {/* מרכז עליון */}
            <div className="text-center mb-10">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-10 h-10 text-white" />
              </div>
              <p className="text-slate-600 text-md">
                כיצד תרצה לארגן את הנתונים?
              </p>
            </div>

            {/* אופציות בחירה */}
            <div className="space-y-6">

              {/* אופציה 1 */}
              <button
                onClick={exportPaymentBySupplier}
                className="w-full group p-6 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right"
              >
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition">
                    <svg
                      className="w-7 h-7 text-emerald-600"
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
                    <h4 className="text-xl font-bold text-slate-900 mb-2">
                      מרוכז לפי ספק
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      כל ספק בשורה אחת עם סכום כולל, רשימת הזמנות ופרויקטים.
                    </p>
                    <div className="mt-3 text-xs text-emerald-600 font-medium">
                      ✓ מתאים להעברות בנקאיות
                    </div>
                  </div>
                </div>
              </button>

              {/* אופציה 2 */}
              <button
                onClick={exportPaymentDetailed}
                className="w-full group p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-right"
              >
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition">
                    <svg
                      className="w-7 h-7 text-blue-600"
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
                    <h4 className="text-xl font-bold text-slate-900 mb-2">
                      מפורט לפי הזמנה
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      כל הזמנה בשורה נפרדת עם כל הפרטים המלאים.
                    </p>
                    <div className="mt-3 text-xs text-blue-600 font-medium">
                      ✓ מעולה למעקב מלא
                    </div>
                  </div>
                </div>
              </button>

            </div>

            {/* כפתור ביטול */}
            <button
              onClick={() => setShowPaymentExportModal(false)}
              className="w-full mt-10 px-6 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition"
            >
              ביטול
            </button>

          </div>
        </div>
      </div>
    </div>
  </div>
)}


        {/* Report Modal */}
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
                          מחולל דוחות הזמנות
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
                      סנן את ההזמנות ובחר עמודות לייצוא
                    </p>
                  </div>

                  <div className="max-h-[calc(85vh-8rem)] overflow-y-auto p-6">
                    {/* Advanced Filters */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Filter className="w-5 h-5 text-orange-500" />
                          סינון מתקדם
                        </h4>
                        <button
                          onClick={clearAdvancedFilters}
                          className="text-sm font-bold text-orange-600 hover:text-orange-700"
                        >
                          איפוס מסננים
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תאריך מ-
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
                            תאריך עד-
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

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סכום מינימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.sumMin}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                sumMin: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מינימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סכום מקסימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.sumMax}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                sumMax: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מקסימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

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
                            שם מזמין
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.invitingName}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                invitingName: e.target.value,
                              })
                            }
                            placeholder="חפש שם מזמין"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            מספר הזמנה
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.orderNumber}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                orderNumber: e.target.value,
                              })
                            }
                            placeholder="לדוגמה: 40283"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            סטטוס
                          </label>
                          <select
                            value={advancedFilters.status}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                status: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          >
                            <option value="">הכל</option>
                            <option value="הוגש">הוגש</option>
                            <option value="לא הוגש">לא הוגש</option>
                            <option value="בעיבוד">בעיבוד</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            מילת מפתח בפירוט
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.detail}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                detail: e.target.value,
                              })
                            }
                            placeholder="למשל: חציון"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                        <p className="text-sm font-bold text-gray-700">
                          מסננים: {getFilteredOrders().length} הזמנות מתוך{" "}
                          {allOrders.length}
                        </p>
                      </div>
                    </div>

                    {/* Column Selection */}
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

        {/* Delete Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את ההזמנה לצמיתות.
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
      </div>
    </div>
  );
};

export default OrdersPage;
