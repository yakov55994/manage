import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export async function generateInvoicesPDF({ 
  invoices, 
  companyInfo, 
  executionDate,
  filters 
}) {
  const formatNumber = (num) => num?.toLocaleString("he-IL");
  
  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const totalSum = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const paidSum = invoices
    .filter((inv) => inv.paid === "כן")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const unpaidSum = totalSum - paidSum;

  const htmlContent = `
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
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <div class="logo-icon"></div>
          <div class="logo-text">ניהולון</div>
        </div>
        <h1>📋 דוח חשבוניות</h1>
        <div class="date">תאריך הפקה: ${new Date().toLocaleDateString("he-IL", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</div>
      </div>

      ${filters.projectName || filters.supplierName || filters.dateFrom || filters.dateTo ? `
      <div class="filters">
        <h3>🔍 פילטרים</h3>
        ${filters.projectName ? `<p><strong>פרויקט:</strong> ${filters.projectName}</p>` : ""}
        ${filters.supplierName ? `<p><strong>ספק:</strong> ${filters.supplierName}</p>` : ""}
        ${filters.dateFrom ? `<p><strong>מתאריך:</strong> ${new Date(filters.dateFrom).toLocaleDateString("he-IL")}</p>` : ""}
        ${filters.dateTo ? `<p><strong>עד תאריך:</strong> ${new Date(filters.dateTo).toLocaleDateString("he-IL")}</p>` : ""}
      </div>
      ` : ""}

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
          ${invoices.map((invoice, idx) => `
            <tr>
              <td><strong>${idx + 1}</strong></td>
              <td><strong>${invoice.invoiceNumber || "-"}</strong></td>
              <td>${invoice.invitingName || invoice.supplierId?.name || "לא צוין"}</td>
              <td>${invoice.projects?.length ? invoice.projects.map(p => p.projectName).join(", ") : "-"}</td>
              <td><strong>${formatNumber(invoice.totalAmount)} ₪</strong></td>
              <td>${formatDate(invoice.createdAt)}</td>
              <td>${invoice.status || "-"}</td>
              <td>
                <span class="${invoice.paid === "כן" ? "status-paid" : "status-unpaid"}">
                  ${invoice.paid === "כן" ? "✓ שולם" : "✗ לא שולם"}
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="summary">
        <h3>📊 סיכום</h3>
        <div class="summary-row">
          <span>סה"כ חשבוניות:</span>
          <strong>${invoices.length}</strong>
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
    </body>
    </html>
  `;

  const dir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `invoices-report-${Date.now()}.pdf`;
  const outPath = path.join(dir, filename);

  // יצירת PDF עם Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm",
    },
  });

  await browser.close();

  return outPath;
}