// ===============================================
// SUBMITTED INVOICES - חשבוניות שהוגשו לפרויקט
// ===============================================

import React, { useState, useEffect } from "react";
import api from "../api/api.js";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import { FileDown, FileSpreadsheet } from "lucide-react";

const SubmittedInvoices = ({ projectId, projectName }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({ excel: false, pdf: false });

  // טעינת חשבוניות שהוגשו
  useEffect(() => {
    if (!projectId) return;

    const loadInvoices = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/submissions/${projectId}/invoices`);
        setInvoices(data.data || []);
      } catch (err) {
        console.error("Error loading submitted invoices:", err);
        toast.error("שגיאה בטעינת חשבוניות");
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [projectId]);

  // הורדת Excel
  const handleDownloadExcel = async () => {
    try {
      setDownloading((prev) => ({ ...prev, excel: true }));

      const response = await api.get(`/submissions/${projectId}/excel`, {
        responseType: "blob",
      });

      // יצירת קישור להורדה
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `חשבוניות_שהוגשו_${projectName}_${new Date().toISOString().split("T")[0]}.xlsx`
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

  // הורדת PDF - פתיחת חלון הדפסה
  const handleDownloadPDF = async () => {
    if (invoices.length === 0) {
      toast.error("אין חשבוניות להורדה");
      return;
    }

    try {
      setDownloading((prev) => ({ ...prev, pdf: true }));

      // סידור החשבוניות לפי שם ספק בסדר א'-ב'
      const invoicesForPrint = [...invoices].sort((a, b) => {
        const supA = a.supplierId?.name || a.invitingName || "";
        const supB = b.supplierId?.name || b.invitingName || "";
        return supA.localeCompare(supB, "he");
      });

      const totalSum = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      // פתיחת חלון הדפסה
      const printWindow = window.open("", "_blank");

      // כתיבה ישירה ל-document עם encoding נכון
      printWindow.document.open();
      printWindow.document.write('<!DOCTYPE html>');
      printWindow.document.write('<html dir="rtl" lang="he">');
      printWindow.document.write('<head>');
      printWindow.document.write('<meta charset="UTF-8">');
      printWindow.document.write('<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">');
      printWindow.document.write('<title>דוח חשבוניות שהוגשו</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { margin: 0; padding: 0; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          direction: rtl;
          background: white;
          color: #1f2937;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #f97316;
        }
        .logo-text {
          font-size: 32px;
          font-weight: 700;
          color: #6b7280;
          margin-bottom: 15px;
        }
        .header h1 {
          font-size: 22px;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .header .date { color: #6b7280; font-size: 13px; }
        .filters {
          background: #fff7ed;
          padding: 12px 15px;
          border-radius: 8px;
          margin-bottom: 25px;
          border-right: 4px solid #f97316;
        }
        .filters h3 { color: #f97316; margin-bottom: 8px; font-size: 15px; }
        .filters p { color: #6b7280; font-size: 13px; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        thead { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; }
        thead th {
          padding: 12px 10px;
          font-weight: 600;
          font-size: 12px;
          text-align: center;
          border: 1px solid #ea580c;
        }
        tbody tr { border-bottom: 1px solid #e5e7eb; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        tbody td {
          padding: 10px;
          font-size: 11px;
          color: #374151;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .summary {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border: 2px solid #fdba74;
          border-radius: 10px;
          padding: 18px;
          margin-top: 25px;
        }
        .summary h3 { color: #f97316; margin-bottom: 12px; font-size: 18px; }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #fdba74;
          font-size: 14px;
        }
        .summary-row:last-child { border-bottom: none; }
        .summary-row.total {
          font-size: 16px;
          font-weight: bold;
          color: #ea580c;
          margin-top: 8px;
        }
        .footer {
          margin-top: 35px;
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
        }
      `);
      printWindow.document.write('</style>');
      printWindow.document.write('</head>');
      printWindow.document.write('<body>');

      // Header
      printWindow.document.write('<div class="header">');
      printWindow.document.write('<div class="logo-text">ניהולון</div>');
      printWindow.document.write('<h1>📋 דוח חשבוניות שהוגשו</h1>');
      printWindow.document.write(`<div class="date">תאריך הפקה: ${new Date().toLocaleDateString("he-IL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</div>`);
      printWindow.document.write('</div>');

      // Filters
      printWindow.document.write('<div class="filters">');
      printWindow.document.write('<h3>🔍 פילטרים</h3>');
      printWindow.document.write(`<p><strong>פרויקט:</strong> ${projectName}</p>`);
      printWindow.document.write('</div>');

      // Table
      printWindow.document.write('<table>');
      printWindow.document.write('<thead><tr>');
      printWindow.document.write('<th>מס׳</th>');
      printWindow.document.write('<th>מספר חשבונית</th>');
      printWindow.document.write('<th>ספק</th>');
      printWindow.document.write('<th>סכום</th>');
      printWindow.document.write('<th>תאריך</th>');
      printWindow.document.write('<th>תאריך הגשה</th>');
      printWindow.document.write('</tr></thead>');
      printWindow.document.write('<tbody>');

      invoicesForPrint.forEach((invoice, idx) => {
        printWindow.document.write('<tr>');
        printWindow.document.write(`<td><strong>${idx + 1}</strong></td>`);
        printWindow.document.write(`<td><strong>${invoice.invoiceNumber || "-"}</strong></td>`);
        printWindow.document.write(`<td>${invoice.supplierId?.name || invoice.invitingName || "לא צוין"}</td>`);
        printWindow.document.write(`<td><strong>${invoice.totalAmount.toLocaleString()} ₪</strong></td>`);
        printWindow.document.write(`<td>${new Date(invoice.createdAt).toLocaleDateString("he-IL")}</td>`);
        printWindow.document.write(`<td>${new Date(invoice.submittedAt).toLocaleDateString("he-IL")}</td>`);
        printWindow.document.write('</tr>');
      });

      printWindow.document.write('</tbody></table>');

      // Summary
      printWindow.document.write('<div class="summary">');
      printWindow.document.write('<h3>📊 סיכום</h3>');
      printWindow.document.write('<div class="summary-row">');
      printWindow.document.write(`<span>סה"כ חשבוניות:</span><strong>${invoices.length}</strong>`);
      printWindow.document.write('</div>');
      printWindow.document.write('<div class="summary-row total">');
      printWindow.document.write(`<span>סה"כ סכום:</span><strong>${totalSum.toLocaleString()} ₪</strong>`);
      printWindow.document.write('</div>');
      printWindow.document.write('</div>');

      // Footer
      printWindow.document.write('<div class="footer">');
      printWindow.document.write('<p>מסמך זה הופק אוטומטית ממערכת ניהולון</p>');
      printWindow.document.write(`<p>© ${new Date().getFullYear()} כל הזכויות שמורות</p>`);
      printWindow.document.write('</div>');

      // Print script
      printWindow.document.write('<script>');
      printWindow.document.write('window.onload = function() { setTimeout(() => window.print(), 250); }');
      printWindow.document.write('</script>');

      printWindow.document.write('</body></html>');
      printWindow.document.close();

      toast.success(`נפתח חלון הדפסה עם ${invoices.length} חשבוניות!`);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("שגיאה בהורדת PDF");
    } finally {
      setDownloading((prev) => ({ ...prev, pdf: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <ClipLoader size={40} color="#f97316" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">חשבוניות שהוגשו</h2>

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

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>אין חשבוניות שהוגשו לפרויקט זה</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-right p-3 font-semibold">מספר חשבונית</th>
                <th className="text-right p-3 font-semibold">תאריך</th>
                <th className="text-right p-3 font-semibold">ספק</th>
                <th className="text-right p-3 font-semibold">סכום</th>
                <th className="text-right p-3 font-semibold">תאריך הגשה</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-gray-200 hover:bg-gray-50">
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
                    {inv.submittedAt
                      ? new Date(inv.submittedAt).toLocaleDateString("he-IL")
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium">
              סה"כ חשבוניות: {invoices.length}
            </p>
            <p className="font-medium">
              סה"כ סכום: ₪
              {invoices
                .reduce((sum, inv) => sum + inv.totalAmount, 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmittedInvoices;