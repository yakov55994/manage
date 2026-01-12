// ===============================================
// SUBMITTED INVOICES - חשבוניות שהוגשו לפרויקט
// ===============================================

import React, { useState, useEffect } from "react";
import api from "../api/api.js";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import { FileDown, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

  // הורדת PDF - יצירת PDF מעוצב באמצעות html2canvas ו-jsPDF
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
          <h1>📋 דוח חשבוניות שהוגשו</h1>
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
          <p><strong>פרויקט:</strong> ${projectName}</p>
        </div>
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
            ${invoicesForPrint
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
        <div class="summary">
          <h3>📊 סיכום</h3>
          <div class="summary-row">
            <span>סה"כ חשבוניות:</span>
            <strong>${invoices.length}</strong>
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
        format: [canvas.width / 2, canvas.height / 2], // התאמה לגודל A4 ביחס
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `חשבוניות_שהוגשו_${projectName}_${new Date().toISOString().split("T")[0]}.pdf`
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