import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import logoBase64 from "./logoBase64.js";

// =============================================
// כרטסת פרויקט - הזמנות בזכות, חשבוניות בחובה
// =============================================
export async function generateProjectKarteset({ project, orders, invoices, salaries = [], dateFrom, dateTo }) {
  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("he-IL");
  };

  const formatAmount = (n) => {
    const num = Number(n || 0);
    if (num < 0) return `-${Math.abs(num).toLocaleString()}`;
    return num.toLocaleString();
  };

  // איחוד כל התנועות למערך אחד ומיון לפי תאריך
  const transactions = [];

  orders.forEach((order) => {
    transactions.push({
      date: order.createdAt,
      type: "זכות",
      description: order.detail || "",
      details: order.invitingName || order.supplierId?.name || "",
      docNumber: order.orderNumber || "",
      debit: 0,
      credit: order.sum || 0,
    });
  });

  invoices.forEach((inv) => {
    const projectEntry = inv.projects?.find(
      (p) => String(p.projectId?._id || p.projectId) === String(project._id)
    );
    const amount = projectEntry?.sum || inv.totalAmount || 0;

    transactions.push({
      date: inv.invoiceDate || inv.createdAt,
      type: "חובה",
      description: inv.detail || "",
      details: inv.supplierId?.name || "",
      docNumber: inv.invoiceNumber || "",
      debit: amount,
      credit: 0,
    });
  });

  // משכורות (חובה)
  salaries.forEach((sal) => {
    transactions.push({
      date: sal.date || sal.createdAt,
      type: "חובה",
      description: `משכורת - ${sal.employeeName}`,
      details: sal.department || "",
      docNumber: "",
      debit: sal.finalAmount || sal.baseAmount || 0,
      credit: 0,
    });
  });

  // הפחתות תקציב (חובה)
  const budgetDeductions = project.budgetDeductions || [];
  budgetDeductions.forEach((ded, index) => {
    transactions.push({
      date: ded.date || ded.createdAt,
      type: "חובה",
      description: ded.notes || "",
      details: ded.reason || "",
      docNumber: `הפ-${String(index + 1).padStart(3, "0")}`,
      debit: ded.amount || 0,
      credit: 0,
    });
  });

  // מיון לפי תאריך
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // חישוב יתרה מצטברת
  let balance = 0;
  transactions.forEach((t) => {
    balance += t.credit - t.debit;
    t.balance = balance;
  });

  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + (s.finalAmount || s.baseAmount || 0), 0);

  const periodStr = dateFrom && dateTo
    ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
    : "כל התקופה";

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>כרטסת פרויקט - ${project.name}</title>
<style>
@media print { @page { size: A4 landscape; margin: 10mm; } }
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  direction: rtl;
  color: #1f2937;
  padding: 15px;
  font-size: 11px;
}
.header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 3px solid #1f2937;
  padding-bottom: 10px;
}
.header h1 { font-size: 20px; margin: 0 0 5px; color: #111827; }
.header .subtitle { font-size: 14px; color: #374151; }
.header .period { font-size: 12px; color: #6b7280; margin-top: 4px; }
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
thead { background: linear-gradient(135deg, #1f2937, #374151); color: white; }
th, td {
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  font-size: 11px;
  text-align: center;
}
th { font-size: 11px; font-weight: bold; }
tbody tr:nth-child(even) { background: #f3f4f6; }
.debit { color: #111827; font-weight: bold; }
.credit { color: #111827; font-weight: bold; }
.balance-pos { color: #111827; }
.balance-neg { color: #111827; }
.summary {
  margin-top: 20px;
  padding: 12px;
  border: 2px solid #4b5563;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  justify-content: space-around;
}
.summary-item { text-align: center; }
.summary-item .label { font-size: 11px; color: #4b5563; }
.summary-item .value { font-size: 16px; font-weight: bold; color: #111827; }
.footer {
  margin-top: 25px;
  text-align: center;
  font-size: 10px;
  color: #6b7280;
  border-top: 1px solid #d1d5db;
  padding-top: 10px;
}
</style>
</head>
<body>

<div class="header">
  <img src="data:image/jpeg;base64,${logoBase64}" alt="לוגו" style="height: 60px; margin-bottom: 8px; filter: grayscale(100%);" />
  <h1>כרטסת פרויקט</h1>
  <div class="subtitle">${project.name}</div>
  <div class="period">${periodStr} | הופק: ${formatDate(new Date())}</div>
</div>

<table>
<thead>
<tr>
  <th>#</th>
  <th>ת. אירוע</th>
  <th>סוג</th>
  <th>פרטים</th>
  <th>ספק / מזמין</th>
  <th>מסמך</th>
  <th>חובה</th>
  <th>זכות</th>
  <th>יתרה</th>
</tr>
</thead>
<tbody>
${transactions.length === 0 ? '<tr><td colspan="9">אין תנועות בתקופה זו</td></tr>' :
      transactions.map((t, i) => `
<tr>
  <td>${i + 1}</td>
  <td>${formatDate(t.date)}</td>
  <td>${t.type}</td>
  <td>${t.description}</td>
  <td>${t.details}</td>
  <td>${t.docNumber}</td>
  <td class="debit">${t.debit > 0 ? formatAmount(t.debit) + " ₪" : ""}</td>
  <td class="credit">${t.credit > 0 ? formatAmount(t.credit) + " ₪" : ""}</td>
  <td class="${t.balance >= 0 ? "balance-pos" : "balance-neg"}">${formatAmount(t.balance)} ₪</td>
</tr>
`).join("")}
</tbody>
</table>

<div class="summary">
  ${project.budget ? `<div class="summary-item">
    <div class="label">תקציב</div>
    <div class="value">${formatAmount(project.budget)} ₪</div>
  </div>` : ""}
  <div class="summary-item">
    <div class="label">סה"כ חשבוניות</div>
    <div class="value debit">${formatAmount(totalDebit)} ₪</div>
  </div>
${totalSalaries > 0 ? `<div class="summary-item">
    <div class="label">סה"כ משכורות</div>
    <div class="value debit">${formatAmount(totalSalaries)} ₪</div>
  </div>` : ""}
  <div class="summary-item">
    <div class="label">יתרה</div>
    <div class="value ${balance >= 0 ? "balance-pos" : "balance-neg"}">${formatAmount(balance)} ₪</div>
  </div>
  <div class="summary-item">
    <div class="label">מספר תנועות</div>
    <div class="value">${transactions.length}</div>
  </div>
  
</div>

<div class="footer">
  מסמך זה הופק אוטומטית ממערכת ניהולון | ${new Date().getFullYear()} &copy;
</div>

</body>
</html>`;

  return await renderPdf(html, `karteset-project-${Date.now()}.pdf`, "landscape");
}

// =============================================
// כרטסת ספק - כל החשבוניות של הספק
// =============================================
export async function generateSupplierKarteset({ supplier, invoices, projects = [], dateFrom, dateTo }) {
  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("he-IL");
  };

  const formatAmount = (n) => Number(n || 0).toLocaleString();

  // מיון חשבוניות לפי תאריך
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.invoiceDate || a.createdAt) - new Date(b.invoiceDate || b.createdAt)
  );

  const totalAmount = sorted.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const paidCount = sorted.filter((inv) => inv.paid === "כן").length;

  // הפחתות תקציב מפרויקטים קשורים
  const allDeductions = [];
  projects.forEach((proj) => {
    (proj.budgetDeductions || []).forEach((ded) => {
      allDeductions.push({
        projectName: proj.name,
        reason: ded.reason,
        amount: ded.amount || 0,
        date: ded.date || ded.createdAt,
        notes: ded.notes || "",
      });
    });
  });
  allDeductions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const periodStr = dateFrom && dateTo
    ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
    : "כל התקופה";

  const paymentMethodMap = {
    bank_transfer: "העברה בנקאית",
    check: "צ'ק",
  };

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>כרטסת ספק - ${supplier.name}</title>
<style>
@media print { @page { size: A4 landscape; margin: 10mm; } }
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  direction: rtl;
  color: #1f2937;
  padding: 15px;
  font-size: 11px;
}
.header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 3px solid #1f2937;
  padding-bottom: 10px;
}
.header h1 { font-size: 20px; margin: 0 0 5px; color: #111827; }
.header .subtitle { font-size: 14px; color: #374151; }
.header .details { font-size: 11px; color: #6b7280; margin-top: 4px; }
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
thead { background: linear-gradient(135deg, #1f2937, #374151); color: white; }
th, td {
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  font-size: 11px;
  text-align: center;
}
th { font-size: 11px; font-weight: bold; }
tbody tr:nth-child(even) { background: #f3f4f6; }
.paid { color: #111827; font-weight: bold; }
.unpaid { color: #4b5563; font-weight: bold; }
.amount { font-weight: bold; }
.summary {
  margin-top: 20px;
  padding: 12px;
  border: 2px solid #4b5563;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  justify-content: space-around;
}
.summary-item { text-align: center; }
.summary-item .label { font-size: 11px; color: #4b5563; }
.summary-item .value { font-size: 16px; font-weight: bold; color: #111827; }
.footer {
  margin-top: 25px;
  text-align: center;
  font-size: 10px;
  color: #6b7280;
  border-top: 1px solid #d1d5db;
  padding-top: 10px;
}
</style>
</head>
<body>

<div class="header">
  <img src="data:image/jpeg;base64,${logoBase64}" alt="לוגו" style="height: 60px; margin-bottom: 8px; filter: grayscale(100%);" />
  <h1>כרטסת ספק</h1>
  <div class="subtitle">${supplier.name}</div>
  <div class="details">
    ${supplier.business_tax ? `ח.פ./עוסק: ${supplier.business_tax}` : ""}
    ${supplier.phone ? ` | טלפון: ${supplier.phone}` : ""}
    | ${periodStr} | הופק: ${formatDate(new Date())}
  </div>
</div>

<table>
<thead>
<tr>
  <th>#</th>
  <th>ת. חשבונית</th>
  <th>מס' חשבונית</th>
  <th>סוג מסמך</th>
  <th>פרויקט</th>
  <th>סכום</th>
  <th>שולם</th>
  <th>ת. תשלום</th>
  <th>אמצעי תשלום</th>
  <th>פירוט</th>
</tr>
</thead>
<tbody>
${sorted.length === 0 ? '<tr><td colspan="10">אין חשבוניות בתקופה זו</td></tr>' :
      sorted.map((inv, i) => {
        const projectNames = inv.projects?.map(p => p.projectName).join(", ") || "-";
        const paidStatus = inv.paid === "כן" ? "שולם" : inv.paid === "יצא לתשלום" ? "יצא לתשלום" : inv.paid === "לא לתשלום" ? "לא לתשלום" : "לא שולם";
        const paidClass = inv.paid === "כן" ? "paid" : "unpaid";
        return `
<tr>
  <td>${i + 1}</td>
  <td>${formatDate(inv.invoiceDate || inv.createdAt)}</td>
  <td>${inv.invoiceNumber || "-"}</td>
  <td>${inv.documentType || "-"}</td>
  <td>${projectNames}</td>
  <td class="amount">${formatAmount(inv.totalAmount)} ₪</td>
  <td class="${paidClass}">${paidStatus}</td>
  <td>${inv.paymentDate ? formatDate(inv.paymentDate) : "-"}</td>
  <td>${paymentMethodMap[inv.paymentMethod] || "-"}</td>
  <td>${inv.detail || "-"}</td>
</tr>`;
      }).join("")}
</tbody>
</table>

${allDeductions.length > 0 ? `
<h3 style="margin-top: 20px; font-size: 14px; color: #111827;">הפחתות תקציב בפרויקטים</h3>
<table>
<thead>
<tr>
  <th>#</th>
  <th>תאריך</th>
  <th>פרויקט</th>
  <th>סיבה</th>
  <th>סכום</th>
  <th>הערות</th>
</tr>
</thead>
<tbody>
${allDeductions.map((d, i) => `
<tr>
  <td>${i + 1}</td>
  <td>${formatDate(d.date)}</td>
  <td>${d.projectName}</td>
  <td>${d.reason}</td>
  <td class="amount">${formatAmount(d.amount)} ₪</td>
  <td>${d.notes || "-"}</td>
</tr>`).join("")}
</tbody>
</table>
` : ""}

<div class="summary">
  <div class="summary-item">
    <div class="label">סה"כ חשבוניות</div>
    <div class="value">${sorted.length}</div>
  </div>
  <div class="summary-item">
    <div class="label">סה"כ סכום</div>
    <div class="value amount">${formatAmount(totalAmount)} ₪</div>
  </div>
  <div class="summary-item">
    <div class="label">שולמו</div>
    <div class="value paid">${paidCount}</div>
  </div>
  <div class="summary-item">
    <div class="label">לא שולמו</div>
    <div class="value unpaid">${sorted.length - paidCount}</div>
  </div>
</div>

<div class="footer">
  מסמך זה הופק אוטומטית ממערכת ניהולון | ${new Date().getFullYear()} &copy;
</div>

</body>
</html>`;

  return await renderPdf(html, `karteset-supplier-${Date.now()}.pdf`, "landscape");
}

// =============================================
// פונקציית עזר ליצירת PDF
// =============================================
async function renderPdf(html, fileName, orientation = "portrait") {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const pdfPath = path.join(tmpDir, fileName);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    landscape: orientation === "landscape",
    printBackground: true,
    margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
  });

  await browser.close();
  return pdfPath;
}
