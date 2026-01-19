import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function generateMasavPDF({ payments, companyInfo, executionDate }) {
  try {
    const totalSum = payments.reduce((sum, p) => sum + p.amount / 100, 0);

    // יצירת HTML זהה למה שמוצג בדפדפן
    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>סיכום מס״ב</title>
<style>
@media print {
  @page { size: A4; margin: 15mm; }
}
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  direction: rtl;
  color: #1f2937;
  padding: 20px;
}
.header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 3px solid #f97316;
  padding-bottom: 15px;
}
.logo-text {
  font-size: 32px;
  font-weight: bold;
  color: #6b7280;
  margin-bottom: 10px;
}
.header h1 {
  font-size: 22px;
  margin-bottom: 6px;
}
.header .date {
  font-size: 13px;
  color: #6b7280;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 25px;
}
thead {
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: white;
}
th, td {
  border: 1px solid #e5e7eb;
  padding: 8px;
  font-size: 12px;
  text-align: center;
}
tbody tr:nth-child(even) {
  background: #f9fafb;
}
.summary {
  margin-top: 30px;
  padding: 18px;
  border: 2px solid #fdba74;
  border-radius: 10px;
  background: #fff7ed;
}
.summary h3 {
  color: #f97316;
  margin-bottom: 10px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 6px 0;
}
.summary-row.total {
  font-weight: bold;
  font-size: 16px;
  color: #ea580c;
}
.footer {
  margin-top: 40px;
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  border-top: 1px solid #e5e7eb;
  padding-top: 15px;
}
</style>
</head>
<body>

<div class="header">
  <div class="logo-text">ניהולון</div>
  <h1>📄 סיכום מס״ב</h1>
  <div class="date">
    תאריך ביצוע: ${executionDate}
  </div>
</div>

<table>
<thead>
<tr>
  <th>#</th>
  <th>חשבונית</th>
  <th>ספק</th>
  <th>פרויקטים</th>
  <th>סכום</th>
</tr>
</thead>
<tbody>
${payments.map((p, i) => `
<tr>
  <td>${i + 1}</td>
  <td>${p.invoiceNumbers || "-"}</td>
  <td>${p.supplierName || "-"}</td>
  <td>${p.projectNames || "-"}</td>
  <td><strong>${(p.amount / 100).toLocaleString()} ₪</strong></td>
</tr>
`).join("")}
</tbody>
</table>

<div class="summary">
  <h3>📊 סיכום</h3>
  <div class="summary-row">
    <span>סה״כ חשבוניות:</span>
    <strong>${payments.length}</strong>
  </div>
  <div class="summary-row total">
    <span>סה״כ סכום:</span>
    <strong>${totalSum.toLocaleString()} ₪</strong>
  </div>
</div>

<div class="footer">
  מסמך זה הופק אוטומטית ממערכת ניהולון<br/>
  © ${new Date().getFullYear()} כל הזכויות שמורות
</div>

</body>
</html>`;

    // יצירת תיקייה זמנית
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const pdfPath = path.join(tmpDir, `זיכויים-סיכום-${Date.now()}.pdf`);

    // יצירת PDF באמצעות Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    await browser.close();

    return pdfPath;
  } catch (err) {
    throw new Error(`שגיאה ביצירת PDF: ${err.message}`);
  }
}
