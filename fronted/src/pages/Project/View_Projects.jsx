import { useEffect, useState } from "react";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuth } from "../../context/AuthContext";
import {
  DownloadCloud,
  Edit2,
  Trash2,
  Filter,
  FileSpreadsheet,
  X,
  Building2,
  Sparkles,
  AlertCircle,
  ArrowUpDown,
  Search,
  CheckSquare,
  Square,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

const ProjectsPage = ({ initialProjects = [] }) => {
  const { isAdmin } = useAuth();

  const [projects, setProjects] = useState(initialProjects);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    budgetMin: "",
    budgetMax: "",
    remainingBudgetMin: "",
    remainingBudgetMax: "",
    projectName: "",
    invitingName: "",
    contactPerson: "",
    budgetStatus: "all",
    supplierName: "",
    paymentStatus: "",
    missingDocument: "",
  });

  const [exportColumns, setExportColumns] = useState({
    name: true,
    invitingName: true,
    budget: true,
    remainingBudget: true,
    createdAt: true,
    contactPerson: true,

    // 🆕 חשבוניות
    invoiceCount: true,
    invoicePaidCount: false,
    invoiceUnpaidCount: true,
    invoiceSumPaid: true,
    invoiceSumUnpaid: true,
    lastPaymentDate: false,
    projectPaymentStatus: true,
    fileCount: true,
  });

  const [showPrintModal, setShowPrintModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [includeFiles, setIncludeFiles] = useState(false); // 🆕

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get("/suppliers");
        setSuppliers(res.data.data || res.data); // תלוי מה ה־controller מחזיר לך
      } catch (err) {
        console.error("❌ שגיאה בטעינת ספקים:", err);
      }
    };

    fetchSuppliers();
  }, []);

  const { user, loading: authLoading } = useAuth();

  const navigate = useNavigate();
  // הוסף state חדש עבור הצ'קבוקס
  const generatePrint = async () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("הדפדפן חסם את חלון ההדפסה — תאפשר פופאפים");
      return;
    }

    try {
      const res = await api.post("/documents/collect", {
        projectId: selectedProject || null,
        supplierId: selectedSupplier || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
      });

      const docs = res.data?.documents;
      if (!docs || docs.length === 0) {
        toast.error("לא נמצאו מסמכים להדפסה");
        printWindow.close();
        return;
      }

      // חישוב סכום כולל
      const totalSum = docs.reduce((sum, d) => sum + (d.total || 0), 0);

      // 🆕 אם includeFiles מסומן - אסוף את כל הקבצים
      let filesSection = "";
      if (includeFiles) {
        const allFiles = [];

        docs.forEach((doc) => {
          // בדוק אם יש files (מערך)
          if (Array.isArray(doc.files) && doc.files.length > 0) {
            doc.files.forEach((file) => {
              allFiles.push({
                name: file.name || "קובץ ללא שם",
                url: file.url,
                type: file.type || "",
                docNumber: doc.number,
                docType: doc.type,
                project: doc.project,
              });
            });
          }

          // בדוק אם יש file יחיד (לתמיכה בחשבוניות ישנות)
          if (
            doc.file &&
            typeof doc.file === "string" &&
            doc.file.trim() !== ""
          ) {
            allFiles.push({
              name: "קובץ מצורף",
              url: doc.file,
              type: "application/pdf",
              docNumber: doc.number,
              docType: doc.type,
              project: doc.project,
            });
          }
        });

        if (allFiles.length > 0) {
          filesSection = `
            <div class="files-section">
              <h2 class="files-title">📎 קבצים מצורפים (${allFiles.length})</h2>
              <div class="files-grid">
                ${allFiles
                  .map((file, idx) => {
                    const isImage = file.type?.startsWith("image/");
                    return `
                    <div class="file-card">
                      <div class="file-header">
                        <span class="file-number">#${idx + 1}</span>
                        <span class="file-badge">${file.docType} ${
                      file.docNumber
                    }</span>
                      </div>
                      
                      ${
                        isImage
                          ? `
                        <img src="${file.url}" alt="${file.name}" class="file-image" />
                      `
                          : `
                        <div class="file-placeholder">
                          <span class="file-icon">📄</span>
                          <span class="file-type">${
                            file.type === "application/pdf" ? "PDF" : "קובץ"
                          }</span>
                        </div>
                      `
                      }
                      
                      <div class="file-info">
                        <p class="file-name">${file.name}</p>
                        <p class="file-project">${file.project || "-"}</p>
                        <a href="${
                          file.url
                        }" target="_blank" class="file-link">פתח קובץ ↗</a>
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        }
      }

      printWindow.document.write(`
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <title>הדפסת מסמכים - ניהולון</title>
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
              position: relative;
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
              margin-bottom: 40px;
            }

            thead {
              background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
              color: white;
            }

            thead th {
              padding: 15px 12px;
              font-weight: 600;
              font-size: 14px;
              text-align: right;
              letter-spacing: 0.3px;
            }

            tbody tr {
              border-bottom: 1px solid #e5e7eb;
              transition: background 0.2s;
            }

            tbody tr:nth-child(even) {
              background: #f9fafb;
            }

            tbody td {
              padding: 12px;
              font-size: 13px;
              color: #374151;
            }

            .total-row {
              background: #fff7ed !important;
              font-weight: 700;
              border-top: 2px solid #f97316;
            }

            .total-row td {
              padding: 15px 12px;
              font-size: 16px;
              color: #1f2937;
            }

            /* 🆕 עיצוב לקבצים */
            .files-section {
              margin-top: 50px;
              page-break-before: always;
            }

            .files-title {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 30px;
              text-align: center;
              padding-bottom: 15px;
              border-bottom: 3px solid #f97316;
            }

            .files-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
              margin-bottom: 40px;
            }

            .file-card {
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              overflow: hidden;
              background: white;
              page-break-inside: avoid;
            }

            .file-header {
              background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
              padding: 10px 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .file-number {
              font-weight: 700;
              color: white;
              font-size: 14px;
            }

            .file-badge {
              background: white;
              color: #f97316;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }

            .file-image {
              width: 100%;
              height: 200px;
              object-fit: cover;
              background: #f9fafb;
            }

            .file-placeholder {
              height: 200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #f9fafb;
              gap: 10px;
            }

            .file-icon {
              font-size: 48px;
            }

            .file-type {
              font-size: 14px;
              font-weight: 600;
              color: #6b7280;
            }

            .file-info {
              padding: 15px;
            }

            .file-name {
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 5px;
              font-size: 14px;
            }

            .file-project {
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 10px;
            }

            .file-link {
              display: inline-block;
              color: #f97316;
              text-decoration: none;
              font-size: 13px;
              font-weight: 600;
              padding: 6px 12px;
              border: 2px solid #f97316;
              border-radius: 8px;
              transition: all 0.2s;
            }

            .file-link:hover {
              background: #f97316;
              color: white;
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
                padding: 20px;
              }
              
              .filters, table {
                break-inside: avoid;
              }

              .files-section {
                page-break-before: always;
              }

              .file-card {
                break-inside: avoid;
              }

              .file-link {
                display: none; /* הסתר קישורים בהדפסה */
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
            <h1>📋 דוח מסמכים</h1>
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
            selectedProject || selectedSupplier || fromDate || toDate
              ? `
          <div class="filters">
            <h3>🔍 פילטרים</h3>
            ${
              selectedProject
                ? `<p><strong>פרויקט:</strong> ${selectedProject}</p>`
                : ""
            }
            ${
              selectedSupplier
                ? `<p><strong>ספק:</strong> ${selectedSupplier}</p>`
                : ""
            }
            ${
              fromDate
                ? `<p><strong>מתאריך:</strong> ${new Date(
                    fromDate
                  ).toLocaleDateString("he-IL")}</p>`
                : ""
            }
            ${
              toDate
                ? `<p><strong>עד תאריך:</strong> ${new Date(
                    toDate
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
                <th>סוג מסמך</th>
                <th>מספר מסמך</th>
                <th>פרויקט</th>
                <th>ספק</th>
                <th>תאריך</th>
                <th>סכום</th>
              </tr>
            </thead>
            <tbody>
              ${docs
                .map(
                  (d, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${d.type}</td>
                  <td>${d.number}</td>
                  <td>${d.project || "-"}</td>
                  <td>${d.supplier.name || "-"}</td>
                  <td>${new Date(d.date).toLocaleDateString("he-IL")}</td>
                  <td>₪${(d.totalAmount || 0).toLocaleString("he-IL")}</td>
                </tr>`
                )
                .join("")}
              <tr class="total-row">
                <td colspan="6" style="text-align: left;">סה״כ כולל:</td>
                <td>₪${totalSum.toLocaleString("he-IL")}</td>
              </tr>
            </tbody>
          </table>

          ${filesSection}

          <div class="footer">
            <p>מסמך זה הופק אוטומטית ממערכת ניהולון ⚙ | נכון לתאריך ${new Date().toLocaleDateString(
              "he-IL"
            )}</p>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 250);
            };
          </script>
        </body>
        </html>
      `);

      printWindow.document.close();
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בהפקת ההדפסה");
      printWindow.close();
    }
  };
  // 🆕 פונקציה מתוקנת - עובדת ישירות מה-state
  const downloadAllFiles = async () => {
    try {
      toast.info("אוסף קבצים...", { className: "sonner-toast info rtl" });

      // 🔥 במקום API call - נשתמש ב-projects שכבר יש לנו!
      let projectsToProcess = projects;

      // סינון לפי הפילטרים שנבחרו
      if (selectedProject) {
        projectsToProcess = projects.filter((p) => p._id === selectedProject);
      }

      if (!projectsToProcess || projectsToProcess.length === 0) {
        toast.error("לא נמצאו פרויקטים");
        return;
      }

      // איסוף כל הקבצים מכל הפרויקטים
      const allFiles = [];

      projectsToProcess.forEach((project) => {
        const projectName = project.name || "פרויקט";

        // 🔥 אוסף קבצים מחשבוניות
        if (Array.isArray(project.invoices)) {
          project.invoices.forEach((invoice) => {
            // דילוג על חשבוניות ריקות
            const isEmptyInvoice =
              !invoice.invoiceNumber && !invoice.sum && !invoice._id;
            if (isEmptyInvoice) return;

            // בדוק אם יש files (מערך)
            if (Array.isArray(invoice.files) && invoice.files.length > 0) {
              invoice.files.forEach((file, idx) => {
                allFiles.push({
                  name:
                    file.name ||
                    `חשבונית_${invoice.invoiceNumber}_קובץ_${idx + 1}`,
                  url: file.url,
                  type: file.type || "",
                  docNumber: invoice.invoiceNumber,
                  docType: "חשבונית",
                  project: projectName,
                });
              });
            }

            // בדוק אם יש file יחיד (לתמיכה בחשבוניות ישנות)
            if (
              invoice.file &&
              typeof invoice.file === "string" &&
              invoice.file.trim() !== "" &&
              invoice.file.startsWith("http")
            ) {
              allFiles.push({
                name: `חשבונית_${invoice.invoiceNumber}`,
                url: invoice.file,
                type: "application/pdf",
                docNumber: invoice.invoiceNumber,
                docType: "חשבונית",
                project: projectName,
              });
            }
          });
        }

        // 🔥 אוסף קבצים מהזמנות
        if (Array.isArray(project.orders)) {
          project.orders.forEach((order) => {
            // בדוק אם יש files (מערך)
            if (Array.isArray(order.files) && order.files.length > 0) {
              order.files.forEach((file, idx) => {
                allFiles.push({
                  name:
                    file.name || `הזמנה_${order.orderNumber}_קובץ_${idx + 1}`,
                  url: file.url,
                  type: file.type || "",
                  docNumber: order.orderNumber,
                  docType: "הזמנה",
                  project: projectName,
                });
              });
            }

            // בדוק אם יש file יחיד
            if (
              order.file &&
              typeof order.file === "string" &&
              order.file.trim() !== "" &&
              order.file.startsWith("http")
            ) {
              allFiles.push({
                name: `הזמנה_${order.orderNumber}`,
                url: order.file,
                type: "application/pdf",
                docNumber: order.orderNumber,
                docType: "הזמנה",
                project: projectName,
              });
            }
          });
        }

        // 🔥 אוסף קבצים מהפרויקט עצמו
        if (Array.isArray(project.files) && project.files.length > 0) {
          project.files.forEach((file, idx) => {
            allFiles.push({
              name: file.name || `פרויקט_${projectName}_קובץ_${idx + 1}`,
              url: file.url,
              type: file.type || "",
              docNumber: "",
              docType: "פרויקט",
              project: projectName,
            });
          });
        }
      });

      // סינון לפי תאריכים (אם צריך)
      let filteredFiles = allFiles;
      if (fromDate || toDate) {
        filteredFiles = allFiles.filter((file) => {
          // כאן אפשר להוסיף לוגיקה לסינון לפי תאריך אם רוצים
          return true;
        });
      }

      // סינון לפי ספק (אם צריך)
      if (selectedSupplier) {
        // כאן אפשר להוסיף לוגיקה לסינון לפי ספק
      }

      if (filteredFiles.length === 0) {
        toast.error("לא נמצאו קבצים להורדה בפרויקטים שנבחרו", {
          className: "sonner-toast error rtl",
          duration: 4000,
        });
        return;
      }

      toast.info(`מוריד ${filteredFiles.length} קבצים...`, {
        className: "sonner-toast info rtl",
        duration: 5000,
      });

      // יצירת ZIP
      const zip = new JSZip();

      // הורדת כל הקבצים ושמירתם ב-ZIP
      let successCount = 0;
      const downloadPromises = filteredFiles.map(async (file, index) => {
        try {
          const response = await fetch(file.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const blob = await response.blob();

          // יצירת שם קובץ ייחודי
          const extension = file.name.includes(".")
            ? file.name.split(".").pop()
            : file.type === "application/pdf"
            ? "pdf"
            : file.type === "image/png"
            ? "png"
            : file.type === "image/jpeg"
            ? "jpg"
            : "file";

          const safeProjectName = file.project.replace(/[^א-תa-zA-Z0-9]/g, "_");
          const safeDocType = file.docType.replace(/[^א-תa-zA-Z0-9]/g, "_");
          const safeDocNumber = file.docNumber ? `_${file.docNumber}` : "";
          const fileName = `${
            index + 1
          }_${safeProjectName}_${safeDocType}${safeDocNumber}.${extension}`;

          // הוספת הקובץ ל-ZIP
          zip.file(fileName, blob);
          successCount++;
        } catch (error) {
          console.error(`❌ שגיאה בהורדת קובץ ${file.name}:`, error);
        }
      });

      // המתנה לכל ההורדות
      await Promise.all(downloadPromises);

      if (successCount === 0) {
        toast.error("לא הצלחתי להוריד אף קובץ - בדוק את הקישורים", {
          className: "sonner-toast error rtl",
        });
        return;
      }

      // יצירת קובץ ZIP והורדה
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const zipFileName = `קבצים_${
        selectedProject
          ? projectsToProcess[0]?.name.replace(/[^א-תa-zA-Z0-9]/g, "_") ||
            "פרויקט"
          : "כל_הפרויקטים"
      }_${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.zip`;

      saveAs(zipBlob, zipFileName);

      toast.success(
        `${successCount} מתוך ${filteredFiles.length} קבצים הורדו בהצלחה! 🎉`,
        {
          className: "sonner-toast success rtl",
        }
      );

      setShowPrintModal(false);
    } catch (error) {
      console.error("❌ שגיאה בהורדת קבצים:", error);
      toast.error("שגיאה בהורדת הקבצים", {
        className: "sonner-toast error rtl",
      });
    }
  };

  const formatNumber = (num) => num?.toLocaleString("he-IL");
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const availableColumns = [
    { key: "name", label: "שם הפרויקט" },
    { key: "invitingName", label: "שם המזמין" },
    { key: "budget", label: "תקציב" },
    { key: "remainingBudget", label: "תקציב שנותר" },
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "contactPerson", label: "איש קשר" },

    // 🆕 עמודות מסיכום חשבוניות
    { key: "invoiceCount", label: "מס׳ חשבוניות" },
    { key: "invoicePaidCount", label: "מס׳ חשבוניות ששולמו" },
    { key: "invoiceUnpaidCount", label: "מס׳ חשבוניות שלא שולמו" },
    { key: "invoiceSumPaid", label: "סך תשלומים ששולמו" },
    { key: "invoiceSumUnpaid", label: "סכום שטרם שולם" },
    { key: "lastPaymentDate", label: "תשלום אחרון" },
    { key: "projectPaymentStatus", label: "סטטוס תשלום בפרויקט" }, // למשל: "יש לא משולם" / "הכל שולם" / "ללא חשבוניות"
    { key: "fileCount", label: "מס׳ קבצים בחשבוניות" },
  ];

  const getFilteredProjects = () => {
    let filtered = [...allProjects];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();

      filtered = filtered.filter((project) => {
        // חיפוש בשדות טקסט
        const textFields = [
          project.name,
          project.invitingName,
          project.Contact_person,
          project.type,
        ].filter(Boolean).map(field => field.toLowerCase());

        // חיפוש בסכומים (המרה למחרוזת)
        const numericFields = [
          project.budget?.toString(),
          project.remainingBudget?.toString(),
        ].filter(Boolean);

        // חיפוש בתאריך (פורמט קריא)
        const dateFields = [
          project.createdAt ? new Date(project.createdAt).toLocaleDateString('he-IL') : null
        ].filter(Boolean);

        // בדיקה אם החיפוש קיים באחד מהשדות
        return textFields.some(field => field.includes(q)) ||
               numericFields.some(field => field.includes(searchTerm)) ||
               dateFields.some(field => field.includes(searchTerm));
      });
    }

    if (showReportModal) {
      if (advancedFilters.dateFrom) {
        filtered = filtered.filter(
          (project) =>
            new Date(project.createdAt) >= new Date(advancedFilters.dateFrom)
        );
      }
      if (advancedFilters.dateTo) {
        filtered = filtered.filter(
          (project) =>
            new Date(project.createdAt) <= new Date(advancedFilters.dateTo)
        );
      }
      if (advancedFilters.budgetMin) {
        filtered = filtered.filter(
          (project) =>
            project.budget &&
            project.budget >= parseInt(advancedFilters.budgetMin)
        );
      }
      if (advancedFilters.budgetMax) {
        filtered = filtered.filter(
          (project) =>
            project.budget &&
            project.budget <= parseInt(advancedFilters.budgetMax)
        );
      }
      if (advancedFilters.remainingBudgetMin) {
        filtered = filtered.filter(
          (project) =>
            project.remainingBudget !== undefined &&
            project.remainingBudget >=
              parseInt(advancedFilters.remainingBudgetMin)
        );
      }
      if (advancedFilters.remainingBudgetMax) {
        filtered = filtered.filter(
          (project) =>
            project.remainingBudget !== undefined &&
            project.remainingBudget <=
              parseInt(advancedFilters.remainingBudgetMax)
        );
      }
      if (advancedFilters.projectName) {
        filtered = filtered.filter((project) =>
          project.name
            ?.toLowerCase()
            .includes(advancedFilters.projectName.toLowerCase())
        );
      }
      if (advancedFilters.invitingName) {
        filtered = filtered.filter((project) =>
          project.invitingName
            ?.toLowerCase()
            .includes(advancedFilters.invitingName.toLowerCase())
        );
      }
      if (advancedFilters.contactPerson) {
        filtered = filtered.filter((project) =>
          project.Contact_person?.toLowerCase().includes(
            advancedFilters.contactPerson.toLowerCase()
          )
        );
      }
      if (advancedFilters.budgetStatus === "positive") {
        filtered = filtered.filter(
          (project) =>
            project.remainingBudget !== undefined && project.remainingBudget > 0
        );
      } else if (advancedFilters.budgetStatus === "negative") {
        filtered = filtered.filter(
          (project) =>
            project.remainingBudget !== undefined && project.remainingBudget < 0
        );
      } else if (advancedFilters.budgetStatus === "zero") {
        filtered = filtered.filter(
          (project) =>
            project.remainingBudget !== undefined &&
            project.remainingBudget === 0
        );
      } else if (advancedFilters.budgetStatus === "noBudget") {
        filtered = filtered.filter(
          (project) => !project.budget || project.remainingBudget === undefined
        );
      }
      // סינון לפי סטטוס תשלום מצטבר בפרויקט (מבוסס חשבוניות)
      if (advancedFilters.paymentStatus) {
        filtered = filtered.filter((project) => {
          const s = invoiceStats(project);
          if (advancedFilters.paymentStatus === "paid") {
            return s.invoiceCount > 0 && s.invoiceUnpaidCount === 0;
          }
          if (advancedFilters.paymentStatus === "unpaid") {
            return s.invoiceUnpaidCount > 0;
          }
          if (advancedFilters.paymentStatus === "none") {
            return s.invoiceCount === 0;
          }
          return true;
        });
      }
    }

    return filtered;
  };

  const filteredProjects = getFilteredProjects();

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: "",
      dateTo: "",
      budgetMin: "",
      budgetMax: "",
      remainingBudgetMin: "",
      remainingBudgetMax: "",
      projectName: "",
      invitingName: "",
      contactPerson: "",
      budgetStatus: "all",
      supplierName: "",
      paymentStatus: "",
      missingDocument: "",
    });
  };

  const sortedProjects = [...(searchTerm ? filteredProjects : projects)].sort(
    (a, b) => {
      if (sortBy === "budget") {
        const aVal = a.budget || 0;
        const bVal = b.budget || 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortBy === "remainingBudget") {
        const aVal = a.remainingBudget !== undefined ? a.remainingBudget : 0;
        const bVal = b.remainingBudget !== undefined ? b.remainingBudget : 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortBy === "createdAt") {
        return sortOrder === "asc"
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? (a.name || "").localeCompare(b.name || "", "he")
          : (b.name || "").localeCompare(a.name || "", "he");
      }
      return 0;
    }
  );

  const calculateProjectStats = (project) => {
    const budgetUsed =
      project.budget && project.remainingBudget !== undefined
        ? project.budget - project.remainingBudget
        : 0;

    const budgetPercentage =
      project.budget && project.remainingBudget !== undefined
        ? ((budgetUsed / project.budget) * 100).toFixed(1)
        : 0;

    let projectStatus = "לא זמין";
    if (project.budget && project.remainingBudget !== undefined) {
      if (project.remainingBudget > 0) {
        projectStatus = "תקציב זמין";
      } else if (project.remainingBudget === 0) {
        projectStatus = "תקציב מוצה";
      } else {
        projectStatus = "חריגה מתקציב";
      }
    } else {
      projectStatus = "אין תקציב מוגדר";
    }

    return { budgetUsed, budgetPercentage, projectStatus };
  };

  const invoiceStats = (project) => {
    const invoices = Array.isArray(project.invoices) ? project.invoices : [];

    const normalizeDate = (d) => {
      if (!d) return null;
      const raw = d?.$date || d;
      const dt = new Date(raw);
      return isNaN(dt.getTime()) ? null : dt;
    };

    let paidCount = 0;
    let unpaidCount = 0;
    let sumPaid = 0;
    let sumUnpaid = 0;
    let lastPaid = null;
    let fileCount = 0;

    invoices.forEach((inv) => {
      const isEmptyInvoice = !inv.invoiceNumber && !inv.sum && !inv._id;
      if (isEmptyInvoice) {
        return;
      }

      const paid = (inv.paid || "").trim() === "כן";
      const sum = Number(inv.sum || 0);

      if (paid) {
        paidCount += 1;
        sumPaid += sum;
        const pd = normalizeDate(inv.paymentDate);
        if (pd && (!lastPaid || pd > lastPaid)) lastPaid = pd;
      } else {
        unpaidCount += 1;
        sumUnpaid += sum;
      }

      // 🆕 בדיקה של מערך files (לא file יחיד!)
      if (Array.isArray(inv.files) && inv.files.length > 0) {
        fileCount += inv.files.length; // ספור כמה קבצים יש במערך
      }

      // 🔄 גם לבדוק אם יש file יחיד (למקרה של חשבוניות ישנות)
      if (
        inv.file &&
        typeof inv.file === "string" &&
        inv.file.trim() !== "" &&
        inv.file.startsWith("http")
      ) {
        fileCount += 1;
      }
    });

    let projectPaymentStatus = "ללא חשבוניות";
    if (invoices.length > 0) {
      projectPaymentStatus = unpaidCount > 0 ? "יש לא משולם" : "הכל שולם";
    }

    return {
      invoiceCount: invoices.length,
      invoicePaidCount: paidCount,
      invoiceUnpaidCount: unpaidCount,
      invoiceSumPaid: sumPaid,
      invoiceSumUnpaid: sumUnpaid,
      lastPaymentDate: lastPaid,
      projectPaymentStatus,
      fileCount,
    };
  };

  // 🆕 פונקציה לספירת כל הקבצים בפרויקט (חשבוניות + הזמנות)
  const getTotalProjectFiles = (project) => {
    let totalFiles = 0;

    // ✅ קבצים מחשבוניות
    if (Array.isArray(project.invoices)) {
      project.invoices.forEach((invoice) => {
        // דילוג על חשבוניות ריקות
        const isEmptyInvoice =
          !invoice.invoiceNumber && !invoice.sum && !invoice._id;
        if (isEmptyInvoice) return;

        // ספור files (מערך)
        if (Array.isArray(invoice.files) && invoice.files.length > 0) {
          totalFiles += invoice.files.length;
        }

        // ספור file יחיד (חשבוניות ישנות)
        if (
          invoice.file &&
          typeof invoice.file === "string" &&
          invoice.file.trim() !== "" &&
          invoice.file.startsWith("http")
        ) {
          totalFiles += 1;
        }
      });
    }

    // ✅ קבצים מהזמנות
    if (Array.isArray(project.orders)) {
      project.orders.forEach((order) => {
        // ספור files (מערך)
        if (Array.isArray(order.files) && order.files.length > 0) {
          totalFiles += order.files.length;
        }

        // ספור file יחיד
        if (
          order.file &&
          typeof order.file === "string" &&
          order.file.trim() !== "" &&
          order.file.startsWith("http")
        ) {
          totalFiles += 1;
        }
      });
    }

    return totalFiles;
  };

  const exportCustomReport = () => {
    const dataToExport = filteredProjects;

    if (!dataToExport || dataToExport.length === 0) {
      toast.error("אין נתונים לייצוא", { className: "sonner-toast error rtl" });
      return;
    }

    const columnMapping = {
      name: "שם הפרויקט",
      invitingName: "שם המזמין",
      budget: "תקציב",
      remainingBudget: "תקציב שנותר",
      createdAt: "תאריך יצירה",
      contactPerson: "איש קשר",

      // 🆕 חשבוניות
      invoiceCount: "מס׳ חשבוניות",
      invoicePaidCount: "מס׳ חשבוניות ששולמו",
      invoiceUnpaidCount: "מס׳ חשבוניות שלא שולמו",
      invoiceSumPaid: "סך תשלומים ששולמו",
      invoiceSumUnpaid: "סכום שטרם שולם",
      lastPaymentDate: "תשלום אחרון",
      projectPaymentStatus: "סטטוס תשלום בפרויקט",
      fileCount: "מס׳ קבצים בחשבוניות",
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

    const rows = dataToExport.map((project) => {
      const { budgetUsed, budgetPercentage, projectStatus } =
        calculateProjectStats(project);
      const inv = invoiceStats(project);
      

      const row = {};

      selectedColumns.forEach((col) => {
        switch (col) {
          case "name":
            row[columnMapping.name] = project.name || "";
            break;
          case "invitingName":
            row[columnMapping.invitingName] = project.invitingName || "";
            break;
          case "budget":
            row[columnMapping.budget] =
              project.budget != null
                ? formatNumber(project.budget)
                : "אין תקציב";
            break;
          case "remainingBudget":
            row[columnMapping.remainingBudget] =
              project.remainingBudget != null
                ? formatNumber(project.remainingBudget)
                : "לא זמין";
            break;
          case "createdAt":
            row[columnMapping.createdAt] = formatDate(project.createdAt);
            break;
          case "contactPerson":
            row[columnMapping.contactPerson] =
              project.Contact_person || "לא זמין";
            break;

          // 🆕 חשבוניות
          case "invoiceCount":
            row[columnMapping.invoiceCount] = inv.invoiceCount;
            break;
          case "invoicePaidCount":
            row[columnMapping.invoicePaidCount] = inv.invoicePaidCount;
            break;
          case "invoiceUnpaidCount":
            row[columnMapping.invoiceUnpaidCount] = inv.invoiceUnpaidCount;
            break;
          case "invoiceSumPaid":
            row[columnMapping.invoiceSumPaid] = formatNumber(
              inv.invoiceSumPaid
            );
            break;
          case "invoiceSumUnpaid":
            row[columnMapping.invoiceSumUnpaid] = formatNumber(
              inv.invoiceSumUnpaid
            );
            break;
          case "lastPaymentDate":
            row[columnMapping.lastPaymentDate] = inv.lastPaymentDate
              ? formatDate(inv.lastPaymentDate)
              : "—";
            break;
          case "projectPaymentStatus":
            row[columnMapping.projectPaymentStatus] = inv.projectPaymentStatus;
            break;
          case "fileCount":
            row[columnMapping.fileCount] = inv.fileCount;
            break;

          default:
            break;
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "דוח פרויקטים");

    const fileName = `דוח_פרויקטים_${new Date()
      .toLocaleDateString("he-IL")
      .replace(/\//g, "-")}.xlsx`;
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);

    setShowReportModal(false);
    toast.success(`הדוח יוצא בהצלחה עם ${rows.length} פרויקטים`, {
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

  const exportToExcel = () => {
    const projectsWithHebrewHeaders = sortedProjects.map((project) => ({
      "שם הפרוייקט": project.name,
      "שם המזמין": project.invitingName,
      "תאריך יצירה": formatDate(project.createdAt),
      תקציב: project.budget || "אין תקציב",
      "תקציב שנותר":
        project.remainingBudget !== undefined
          ? project.remainingBudget
          : "לא זמין",
      "איש קשר": project.Contact_person || "לא זמין",
      // "שם ספק": project.supplierId.name || "לא זמין",
      // "מצב תשלום": project.paymentStatus || "לא זמין",
      // "חוסר מסמך": project.missingDocument || "לא זמין",
    }));

    const worksheet = XLSX.utils.json_to_sheet(projectsWithHebrewHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "פרוייקטים");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "סיכום פרוייקטים.xlsx"
    );
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get("/projects");

        const data = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

        // אם עדיין טוען את המשתמש – אל תסנן כלום, תציג את כל הפרויקטים זמנית
        if (authLoading) {
          setProjects(data);
          setAllProjects(data);
          return;
        }

        // אם אין משתמש בכלל (לוגאאוט) – תציג ריק
        if (!user) {
          setProjects([]);
          setAllProjects([]);
          return;
        }

        // אם זה אדמין – מציג הכל
        if (user.role === "admin") {
          setProjects(data);
          setAllProjects(data);
          return;
        }

        // === כאן ה-fallback החשוב ביותר ===
        // אם יש user אבל אין לו permissions (או שהם עדיין לא נטענו)
        if (
          !user.permissions ||
          !Array.isArray(user.permissions) ||
          user.permissions.length === 0
        ) {
          setProjects([]);
          setAllProjects([]);

          return;
        }

        // רק אם יש permissions תקינים – נסנן
        const allowedProjectIds = user.permissions
          .map((p) => String(p.project?._id || p.project))
          .filter(Boolean);

        const filtered = data.filter((p) =>
          allowedProjectIds.includes(String(p._id))
        );

        setProjects(filtered);
        setAllProjects(filtered);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("שגיאה בשליפת פרויקטים");
        setProjects([]);
        setAllProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, authLoading]); // חשוב! תלוי ב-user וב-authLoading
  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowReportModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const handleDelete = async () => {
    try {
      if (projectToDelete) {
        await api.delete(`/projects/${projectToDelete}`);

        // 🔥 תיקון: לוודא שהשוואת ID תהיה תקינה
        const updatedProjects = projects.filter(
          (p) => String(p._id) !== String(projectToDelete)
        );

        setProjects(updatedProjects);
        setAllProjects(updatedProjects);
        setShowModal(false);

        toast.success("הפרוייקט נמחק בהצלחה", {
          className: "sonner-toast success rtl",
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("שגיאה במחיקת הפרויקט", {
        className: "sonner-toast error rtl",
      });
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-project/${id}`);
  };

  const handleView = (id) => {
    navigate(`/projects/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען רשימת פרויקטים...
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
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    רשימת פרויקטים
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      ניהול וניתוח פרויקטים
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
                    placeholder="חיפוש לפי שם פרויקט, מזמין או איש קשר..."
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
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Sort Controls */}
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
                <option value="name">שם פרויקט</option>
                <option value="budget">תקציב</option>
                <option value="remainingBudget">תקציב שנותר</option>
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
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/create-project")}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                <Sparkles className="w-5 h-5" />
                <span>יצירת פרוייקט</span>
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
              >
                הדפסת מסמכים
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
          <div className="mt-4 text-sm text-slate-600 font-medium">
            מציג {sortedProjects.length} פרויקטים מתוך {allProjects.length}
          </div>
        </div>

        {/* Projects Table */}
        {sortedProjects.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      שם הפרויקט
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      תקציב
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      תקציב שנותר
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      שם המזמין
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      תאריך יצירה
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      איש קשר
                    </th>
                    <th className="px-4 py-4 text-sm font-bold text-white">
                      מס' קבצים
                    </th>
                    {isAdmin && (
                      <th className="px-4 py-4 text-sm font-bold text-white">
                        פעולות
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((project, index) => (
                    <tr
                      key={project._id}
                      onClick={() => handleView(project._id)}
                      className="cursor-pointer border-t border-orange-100 hover:bg-orange-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                        <div className="flex items-center justify-center gap-2">
                          <span>{project.name}</span>
                          {project.type === "salary" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
                              משכורת
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                        {project.type !== "salary" ? (
                          <td>{formatNumber(project.budget)} ₪</td>
                        ) : (
                          <td className="text-gray-400">פרוייקט ללא תקציב</td>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-center text-slate-900">
                         {project.name !== "salary" ? (
                          <td>{formatNumber(project.remainingBudget)} ₪</td>
                        ) : (
                          <td className="text-gray-400">פרוייקט ללא תקציב</td>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                        {project.invitingName}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                        {formatDate(project.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                        {project.Contact_person}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-center text-slate-900">
                        {(() => {
                          // 🔍 דיבוג מפורט
                          const invoiceFiles = invoiceStats(project).fileCount;

                          let orderFiles = 0;
                          if (Array.isArray(project.orders)) {
                            project.orders.forEach((order) => {
                              if (
                                Array.isArray(order.files) &&
                                order.files.length > 0
                              ) {
                                orderFiles += order.files.length;
                              }

                              if (
                                order.file &&
                                typeof order.file === "string" &&
                                order.file.trim() !== "" &&
                                order.file.startsWith("http")
                              ) {
                                orderFiles += 1;
                              }
                            });
                          }

                          const total = invoiceFiles + orderFiles;

                          return (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-lg text-orange-600">
                                {total}
                              </span>
                              {total > 0 && (
                                <span className="text-xs text-slate-500">
                                  ({invoiceFiles} חשבוניות, {orderFiles} הזמנות)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 🔥 גם פה צריך את התנאי! */}
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(project._id);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(project._id);
                              }}
                              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project._id);
                                setShowModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
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
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600">
              {searchTerm ? "לא נמצאו תוצאות" : "עדיין אין פרויקטים"}
            </h2>
          </div>
        )}

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
                        <h3 className="text-2xl font-bold">
                          מחולל דוחות מתקדם
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Date From */}
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

                        {/* Date To */}
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

                        {/* Budget Min */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תקציב מינימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.budgetMin}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                budgetMin: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מינימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Budget Max */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תקציב מקסימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.budgetMax}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                budgetMax: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מקסימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Remaining Budget Min */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תקציב נותר מינימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.remainingBudgetMin}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                remainingBudgetMin: e.target.value,
                              })
                            }
                            placeholder="הזן סכום מינימום"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>

                        {/* Remaining Budget Max */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            תקציב נותר מקסימום
                          </label>
                          <input
                            type="number"
                            value={advancedFilters.remainingBudgetMax}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                remainingBudgetMax: e.target.value,
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

                        {/* Inviting Name */}
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

                        {/* Contact Person */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            איש קשר
                          </label>
                          <input
                            type="text"
                            value={advancedFilters.contactPerson}
                            onChange={(e) =>
                              setAdvancedFilters({
                                ...advancedFilters,
                                contactPerson: e.target.value,
                              })
                            }
                            placeholder="חפש איש קשר"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                      </div>

                      {/* Filter Summary */}
                      <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                        <p className="text-sm font-bold text-gray-700">
                          מסננים: {filteredProjects.length} פרויקטים מתוך{" "}
                          {allProjects.length}
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

        {showPrintModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-[520px] shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 flex items-center gap-3">
                <Building2 className="w-7 h-7 text-orange-500" />
                הפקת מסמכים
              </h2>

              {/* בחירת פרויקט */}
              <label className="block font-semibold text-slate-700 mb-2">
                בחירת פרויקט
              </label>
              <select
                className="w-full p-3 border-2 border-orange-200 rounded-xl mb-4 font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">כל הפרויקטים</option>
                {projects.map((p) => (
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
                className="w-full p-3 border-2 border-orange-200 rounded-xl mb-4 font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">כל הספקים</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* תאריכים */}
              <label className="block font-semibold text-slate-700 mb-2">
                טווח תאריכים
              </label>
              <div className="flex gap-3 mb-4">
                <input
                  type="date"
                  className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <input
                  type="date"
                  className="w-1/2 border-2 border-orange-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {/* 🆕 צ'קבוקס לכלול קבצים בדוח */}
              <label className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 cursor-pointer mb-6 hover:border-orange-300 transition-all">
                <input
                  type="checkbox"
                  checked={includeFiles}
                  onChange={(e) => setIncludeFiles(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <span className="font-bold text-slate-900 block">
                    הצג קבצים בדוח
                  </span>
                  <p className="text-sm text-slate-600">
                    כלול תצוגה של הקבצים המצורפים בדוח ההדפסה
                  </p>
                </div>
              </label>

              {/* כפתורי פעולה */}
              <div className="flex flex-col gap-3">
                {/* 🆕 כפתור הורדת קבצים */}
                <button
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg shadow-orange-500/30"
                  onClick={downloadAllFiles}
                >
                  <DownloadCloud className="w-5 h-5" />
                  <span>📦 הורד קבצים (ZIP)</span>
                </button>

                {/* כפתור הדפסת דוח */}
                <button
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg shadow-orange-500/30"
                  onClick={generatePrint}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>🖨️ הפק דוח PDF</span>
                </button>

                {/* כפתור ביטול */}
                <button
                  className="w-full px-6 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
                  onClick={() => {
                    setShowPrintModal(false);
                    setIncludeFiles(false);
                    setSelectedProject("");
                    setSelectedSupplier("");
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 transition"
                aria-label="סגור"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את הפרויקט לצמיתות.
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

export default ProjectsPage;
