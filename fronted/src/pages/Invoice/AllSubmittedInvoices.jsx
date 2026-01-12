// ===============================================
// ALL SUBMITTED INVOICES - כל החשבוניות שהוגשו
// ===============================================

import React, { useState, useEffect } from "react";
import api from "../../api/api.js";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import { FileSpreadsheet, ArrowRight, Building2, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const AllSubmittedInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("project"); // "project" or "none"
  const [downloading, setDownloading] = useState({ excel: false, pdf: false });

  // טעינת כל החשבוניות שהוגשו
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/submissions/all/invoices`);
        setInvoices(data.data || []);
      } catch (err) {
        console.error("Error loading submitted invoices:", err);
        toast.error("שגיאה בטעינת חשבוניות");
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  // הורדת Excel
  const handleDownloadExcel = async () => {
    try {
      setDownloading((prev) => ({ ...prev, excel: true }));

      const response = await api.get(`/submissions/all/excel`, {
        responseType: "blob",
      });

      // יצירת קישור להורדה
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `all_submitted_invoices_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("קובץ Excel הורד בהצלחה");
    } catch (err) {
      console.error("Error downloading Excel:", err);
      toast.error("שגיאה בהורדת Excel");
    } finally {
      setDownloading((prev) => ({ ...prev, excel: false }));
    }
  };

  // הורדת PDF - יצירת PDF מעוצב באמצעות html2canvas ו-jsPDF
  const handleDownloadPDF = async () => {
    if (invoices.length === 0) {
      toast.error("אין חשבוניות להורדה");
      return;
    }

    try {
      setDownloading((prev) => ({ ...prev, pdf: true }));

      // הכנת הנתונים
      let invoicesForPrint = [...invoices];
      let groupedForPrint = {};
      let sortedGroups = [];

      // סידור לפי ספק
      const sortBySupplier = (a, b) => {
        const supA = a.supplierId?.name || a.invitingName || "";
        const supB = b.supplierId?.name || b.invitingName || "";
        return supA.localeCompare(supB, "he");
      };

      if (groupBy === "project") {
        invoicesForPrint.forEach((inv) => {
          const projectId = inv.submittedToProjectId?._id || "unknown";
          const projectName = inv.submittedToProjectId?.name || "לא ידוע";
          if (!groupedForPrint[projectId]) {
            groupedForPrint[projectId] = {
              name: projectName,
              invoices: [],
            };
          }
          groupedForPrint[projectId].invoices.push(inv);
        });

        // סידור הפרויקטים לפי שם
        sortedGroups = Object.entries(groupedForPrint).sort((a, b) =>
          a[1].name.localeCompare(b[1].name, "he")
        );

        // סידור חשבוניות בכל קבוצה לפי ספק
        sortedGroups.forEach(([, data]) => {
          data.invoices.sort(sortBySupplier);
        });
      } else {
        // סידור כל החשבוניות לפי ספק
        invoicesForPrint.sort(sortBySupplier);
      }

      const totalInvoices = invoices.length;
      const totalSum = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      // יצירת אלמנט זמני לרינדור התוכן
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "210mm"; // רוחב A4
      tempDiv.style.padding = "15mm";
      tempDiv.style.background = "#fff";
      tempDiv.style.color = "#1f2937";
      tempDiv.style.direction = "rtl";
      tempDiv.style.fontFamily = "'Segoe UI', Tahoma, Arial, sans-serif";

      const groupByText = groupBy === "project" ? "לפי פרויקט" : "ללא קיבוץ";

      let tablesHtml = "";

      if (groupBy === "project") {
        tablesHtml = sortedGroups
          .map(
            ([, data]) => `
          <div class="project-section" style="margin-bottom: 30px;">
            <h2 style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 10px; border-radius: 8px; font-size: 18px;">${data.name}</h2>
            <table>
              <thead>
                <tr>
                  <th>מס׳</th>
                  <th>מספר חשבונית</th>
                  <th>ספק</th>
                  <th>סכום</th>
                  <th>תאריך</th>
                  <th>תאריך הגשה</th>
                </tr>
              </thead>
              <tbody>
                ${data.invoices
                  .map(
                    (invoice, idx) => `
                  <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td><strong>${invoice.invoiceNumber || "-"}</strong></td>
                    <td>${invoice.supplierId?.name || invoice.invitingName || "לא צוין"}</td>
                    <td><strong>${invoice.totalAmount.toLocaleString()} ₪</strong></td>
                    <td>${new Date(invoice.createdAt).toLocaleDateString("he-IL")}</td>
                    <td>${new Date(invoice.submittedAt).toLocaleDateString("he-IL")}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
            <div class="subtotal" style="margin-top: 10px; text-align: left; font-weight: bold; color: #ea580c;">
              סה"כ סכום לפרויקט: ${data.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()} ₪
            </div>
          </div>`
          )
          .join("");
      } else {
        tablesHtml = `
          <table>
            <thead>
              <tr>
                <th>מס׳</th>
                <th>מספר חשבונית</th>
                <th>ספק</th>
                <th>פרויקט</th>
                <th>סכום</th>
                <th>תאריך</th>
                <th>תאריך הגשה</th>
              </tr>
            </thead>
            <tbody>
              ${invoicesForPrint
                .map(
                  (invoice, idx) => `
                <tr>
                  <td><strong>${idx + 1}</strong></td>
                  <td><strong>${invoice.invoiceNumber || "-"}</strong></td>
                  <td>${invoice.supplierId?.name || invoice.invitingName || "לא צוין"}</td>
                  <td>${invoice.submittedToProjectId?.name || "-"}</td>
                  <td><strong>${invoice.totalAmount.toLocaleString()} ₪</strong></td>
                  <td>${new Date(invoice.createdAt).toLocaleDateString("he-IL")}</td>
                  <td>${new Date(invoice.submittedAt).toLocaleDateString("he-IL")}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>`;
      }

      tempDiv.innerHTML = `
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
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
        </style>
        <div class="header">
          <div class="logo">
            <div class="logo-icon"></div>
            <div class="logo-text">ניהולון</div>
          </div>
          <h1>📋 דוח כל החשבוניות שהוגשו</h1>
          <div class="date">תאריך הפקה: ${new Date().toLocaleDateString("he-IL", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}</div>
        </div>
        <div class="filters">
          <h3>🔍 פילטרים</h3>
          <p><strong>פרויקטים:</strong> כל הפרויקטים</p>
          <p><strong>קיבוץ:</strong> ${groupByText}</p>
        </div>
        ${tablesHtml}
        <div class="summary">
          <h3>📊 סיכום כולל</h3>
          <div class="summary-row">
            <span>סה"כ חשבוניות:</span>
            <strong>${totalInvoices}</strong>
          </div>
          <div class="summary-row total">
            <span>סה"כ סכום:</span>
            <strong>${totalSum.toLocaleString()} ₪</strong>
          </div>
        </div>
        <div class="footer">
          <p>מסמך זה הופק אוטומטית ממערכת ניהולון</p>
          <p>© ${new Date().getFullYear()} כל הזכויות שמורות</p>
        </div>
      `;

      document.body.appendChild(tempDiv);

      // השהיה קצרה כדי לאפשר רינדור
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `all_submitted_invoices_${new Date().toISOString().split("T")[0]}.pdf`
      );

      document.body.removeChild(tempDiv);

      toast.success("קובץ PDF הורד בהצלחה");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("שגיאה בהורדת PDF");
    } finally {
      setDownloading((prev) => ({ ...prev, pdf: false }));
    }
  };

  // קיבוץ לפי פרויקט
  const groupedByProject = {};
  if (groupBy === "project") {
    invoices.forEach((inv) => {
      const projectId = inv.submittedToProjectId?._id || "unknown";
      const projectName = inv.submittedToProjectId?.name || "לא ידוע";
      if (!groupedByProject[projectId]) {
        groupedByProject[projectId] = {
          name: projectName,
          invoices: [],
        };
      }
      groupedByProject[projectId].invoices.push(inv);
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <ClipLoader size={40} color="#f97316" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                  <FileSpreadsheet className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-slate-900">
                    כל החשבוניות שהוגשו
                  </h1>
                  <p className="text-slate-600 mt-1">
                    סה"כ {invoices.length} חשבוניות
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/projects")}
                className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </button>
            </div>

            {/* Group By Toggle and Download Buttons */}
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">קבץ לפי:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-4 py-2 border-2 border-orange-200 rounded-xl bg-white font-bold focus:border-orange-500 focus:outline-none"
                >
                  <option value="project">פרויקט</option>
                  <option value="none">ללא קיבוץ</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDownloadExcel}
                  disabled={downloading.excel || invoices.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    downloading.excel || invoices.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {downloading.excel ? (
                    <ClipLoader size={16} color="#fff" />
                  ) : (
                    <FileSpreadsheet size={18} />
                  )}
                  הורד Excel
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading.pdf || invoices.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    downloading.pdf || invoices.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {downloading.pdf ? (
                    <ClipLoader size={16} color="#fff" />
                  ) : (
                    <FileDown size={18} />
                  )}
                  הורד PDF
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        {invoices.length === 0 ? (
          <div className="bg-white/90 rounded-3xl shadow-xl p-8 text-center">
            <p className="text-slate-500 text-lg">אין חשבוניות שהוגשו</p>
          </div>
        ) : groupBy === "project" ? (
          // Grouped by Project
          <div className="space-y-6">
            {Object.entries(groupedByProject).map(([projectId, data]) => (
              <div
                key={projectId}
                className="bg-white/90 shadow-xl rounded-2xl overflow-hidden"
              >
                {/* Project Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6" />
                      <h2 className="text-xl font-bold">{data.name}</h2>
                    </div>
                    <span className="bg-white/20 px-3 py-1 rounded-full font-bold">
                      {data.invoices.length} חשבוניות
                    </span>
                  </div>
                </div>

                {/* Invoices Table */}
                <div className="p-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-right p-3 font-semibold">
                          מספר חשבונית
                        </th>
                        <th className="text-right p-3 font-semibold">תאריך</th>
                        <th className="text-right p-3 font-semibold">ספק</th>
                        <th className="text-right p-3 font-semibold">סכום</th>
                        <th className="text-right p-3 font-semibold">
                          תאריך הגשה
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((inv) => (
                        <tr
                          key={inv._id}
                          className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                        >
                          <td className="p-3">{inv.invoiceNumber}</td>
                          <td className="p-3">
                            {inv.createdAt
                              ? new Date(inv.createdAt).toLocaleDateString(
                                  "he-IL"
                                )
                              : ""}
                          </td>
                          <td className="p-3">
                            {inv.supplierId?.name || inv.invitingName || ""}
                          </td>
                          <td className="p-3">
                            ₪{inv.totalAmount.toLocaleString()}
                          </td>
                          <td className="p-3">
                            {inv.submittedAt
                              ? new Date(inv.submittedAt).toLocaleDateString(
                                  "he-IL"
                                )
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Project Total */}
                  <div className="mt-4 text-sm text-gray-600 font-bold">
                    סה"כ סכום: ₪
                    {data.invoices
                      .reduce((sum, inv) => sum + inv.totalAmount, 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No Grouping
          <div className="bg-white/90 shadow-xl rounded-2xl p-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-right p-3 font-semibold">
                    מספר חשבונית
                  </th>
                  <th className="text-right p-3 font-semibold">תאריך</th>
                  <th className="text-right p-3 font-semibold">ספק</th>
                  <th className="text-right p-3 font-semibold">סכום</th>
                  <th className="text-right p-3 font-semibold">הוגש לפרויקט</th>
                  <th className="text-right p-3 font-semibold">תאריך הגשה</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv._id}`)}
                  >
                    <td className="p-3">{inv.invoiceNumber}</td>
                    <td className="p-3">
                      {inv.createdAt
                        ? new Date(inv.createdAt).toLocaleDateString("he-IL")
                        : ""}
                    </td>
                    <td className="p-3">
                      {inv.supplierId?.name || inv.invitingName || ""}
                    </td>
                    <td className="p-3">₪{inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3">
                      {inv.submittedToProjectId?.name || ""}
                    </td>
                    <td className="p-3">
                      {inv.submittedAt
                        ? new Date(inv.submittedAt).toLocaleDateString("he-IL")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Grand Total */}
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-bold">סה"כ חשבוניות: {invoices.length}</p>
              <p className="font-bold">
                סה"כ סכום: ₪
                {invoices
                  .reduce((sum, inv) => sum + inv.totalAmount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllSubmittedInvoices;