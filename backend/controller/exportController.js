import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";
import Salary from "../models/Salary.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";

// פונקציה לפורמט תאריך
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
};

// פונקציה לפורמט מספר
const formatNumber = (num) => {
  if (!num) return 0;
  return Number(num).toLocaleString("he-IL");
};

// שליפת כל הנתונים עם סינון לפי שנה
const fetchAllData = async (year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const dateFilter = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const [projects, invoices, orders, suppliers, salaries, incomes, expenses] =
    await Promise.all([
      Project.find(dateFilter).lean(),
      Invoice.find(dateFilter).populate("supplierId", "name").lean(),
      Order.find(dateFilter).populate("supplierId", "name").lean(),
      Supplier.find().lean(), // ספקים לא מסוננים לפי תאריך
      Salary.find(dateFilter).populate("projectId", "name").lean(),
      Income.find(dateFilter).lean(),
      Expense.find(dateFilter).lean(),
    ]);

  return { projects, invoices, orders, suppliers, salaries, incomes, expenses };
};

// הכנת נתוני פרויקטים
const prepareProjectsData = (projects) => {
  return projects.map((p) => ({
    "שם פרויקט": p.name || "",
    תקציב: p.budget || 0,
    "תקציב שנותר": p.remainingBudget || 0,
    "שם המזמין": p.invitingName || "",
    "איש קשר": p.Contact_person || "",
    סוג: p.type || "",
    "תאריך יצירה": formatDate(p.createdAt),
  }));
};

// הכנת נתוני חשבוניות
const prepareInvoicesData = (invoices) => {
  return invoices.map((inv) => ({
    "מספר חשבונית": inv.invoiceNumber || "",
    "סוג מסמך": inv.documentType || "",
    סכום: inv.totalAmount || 0,
    סטטוס: inv.status || "",
    שולם: inv.paid || "לא",
    "תאריך חשבונית": formatDate(inv.invoiceDate),
    "שם ספק": inv.supplierId?.name || "",
    פרויקטים: inv.projects?.map((p) => p.projectName).join(", ") || "",
  }));
};

// הכנת נתוני הזמנות
const prepareOrdersData = (orders) => {
  return orders.map((ord) => ({
    "מספר הזמנה": ord.orderNumber || "",
    פרויקט: ord.projectName || "",
    סכום: ord.sum || 0,
    סטטוס: ord.status || "",
    "שם ספק": ord.supplierId?.name || "",
    "תאריך יצירה": formatDate(ord.createdAt),
  }));
};

// הכנת נתוני ספקים
const prepareSuppliersData = (suppliers) => {
  return suppliers.map((sup) => ({
    "שם הספק": sup.name || "",
    "מספר עוסק": sup.business_tax || "",
    טלפון: sup.phone || "",
    אימייל: sup.email || "",
    בנק: sup.bankDetails?.bankName || "",
    סניף: sup.bankDetails?.branchNumber || "",
    חשבון: sup.bankDetails?.accountNumber || "",
  }));
};

// הכנת נתוני משכורות
const prepareSalariesData = (salaries) => {
  return salaries.map((sal) => ({
    "שם עובד": sal.employeeName || "",
    פרויקט: sal.projectId?.name || "",
    "סכום בסיס": sal.baseAmount || 0,
    "אחוז תקורה": sal.overheadPercent || 0,
    "סכום סופי": sal.finalAmount || 0,
    תאריך: formatDate(sal.date),
  }));
};

// הכנת נתוני הכנסות
const prepareIncomesData = (incomes) => {
  return incomes.map((inc) => ({
    תיאור: inc.description || "",
    סכום: inc.amount || 0,
    תאריך: formatDate(inc.date),
    שויך: inc.isCredited ? "כן" : "לא",
    הערות: inc.notes || "",
  }));
};

// הכנת נתוני הוצאות
const prepareExpensesData = (expenses) => {
  return expenses.map((exp) => ({
    תיאור: exp.description || "",
    סכום: exp.amount || 0,
    תאריך: formatDate(exp.date),
    אסמכתא: exp.reference || "",
    הערות: exp.notes || "",
  }));
};

// ייצוא לאקסל
export const exportToExcel = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await fetchAllData(year);

    // יצירת workbook חדש
    const wb = xlsx.utils.book_new();

    // הכנת הגיליונות
    const sheets = [
      { name: "פרויקטים", data: prepareProjectsData(data.projects) },
      { name: "חשבוניות", data: prepareInvoicesData(data.invoices) },
      { name: "הזמנות", data: prepareOrdersData(data.orders) },
      { name: "ספקים", data: prepareSuppliersData(data.suppliers) },
      { name: "משכורות", data: prepareSalariesData(data.salaries) },
      { name: "הכנסות", data: prepareIncomesData(data.incomes) },
      { name: "הוצאות", data: prepareExpensesData(data.expenses) },
    ];

    // הוספת כל גיליון
    sheets.forEach((sheet) => {
      const ws = xlsx.utils.json_to_sheet(sheet.data.length > 0 ? sheet.data : [{}]);

      // הגדרת רוחב עמודות
      const colWidths = Object.keys(sheet.data[0] || {}).map(() => ({
        wch: 20,
      }));
      ws["!cols"] = colWidths;

      xlsx.utils.book_append_sheet(wb, ws, sheet.name);
    });

    // יצירת buffer
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    // שם הקובץ
    const filename = `export_${year}.xlsx`;

    // שליחת הקובץ
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Export to Excel error:", error);
    res.status(500).json({ message: "שגיאה בייצוא לאקסל", error: error.message });
  }
};

// ייצוא ל-PDF באמצעות Puppeteer (כמו MASAV)
export const exportToPDF = async (req, res) => {
  let pdfPath = null;

  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await fetchAllData(year);

    // חישובים
    const totalBudget = data.projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalRemaining = data.projects.reduce((sum, p) => sum + (p.remainingBudget || 0), 0);
    const totalInvoices = data.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalOrders = data.orders.reduce((sum, ord) => sum + (ord.sum || 0), 0);
    const totalSalaries = data.salaries.reduce((sum, sal) => sum + (sal.finalAmount || 0), 0);
    const totalIncomes = data.incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalExpenses = data.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const paidInvoices = data.invoices.filter(inv => inv.paid === "כן");
    const unpaidInvoices = data.invoices.filter(inv => inv.paid !== "כן");
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // יצירת HTML כמו ב-MASAV
    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>דוח ייצוא נתונים ${year}</title>
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
  font-size: 24px;
  margin-bottom: 6px;
  color: #1f2937;
}
.header .date {
  font-size: 14px;
  color: #6b7280;
}
.section {
  margin-bottom: 30px;
}
.section-title {
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: white;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}
.stat-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 15px;
}
.stat-card .label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 5px;
}
.stat-card .value {
  font-size: 22px;
  font-weight: bold;
  color: #1f2937;
}
.stat-card.highlight {
  background: #fff7ed;
  border-color: #fdba74;
}
.stat-card.highlight .value {
  color: #ea580c;
}
.stat-card.green {
  background: #f0fdf4;
  border-color: #86efac;
}
.stat-card.green .value {
  color: #16a34a;
}
.stat-card.red {
  background: #fef2f2;
  border-color: #fca5a5;
}
.stat-card.red .value {
  color: #dc2626;
}
.summary {
  margin-top: 30px;
  padding: 20px;
  border: 2px solid #fdba74;
  border-radius: 10px;
  background: #fff7ed;
}
.summary h3 {
  color: #f97316;
  margin-bottom: 15px;
  font-size: 18px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #fed7aa;
}
.summary-row:last-child {
  border-bottom: none;
}
.summary-row.total {
  font-weight: bold;
  font-size: 16px;
  color: #ea580c;
  padding-top: 12px;
  border-top: 2px solid #f97316;
  margin-top: 10px;
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
  <h1>📊 דוח ייצוא נתונים - שנת ${year}</h1>
  <div class="date">
    תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}
  </div>
</div>

<div class="section">
  <div class="section-title">📈 סיכום כמויות</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">פרויקטים</div>
      <div class="value">${data.projects.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">חשבוניות</div>
      <div class="value">${data.invoices.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">הזמנות</div>
      <div class="value">${data.orders.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">ספקים</div>
      <div class="value">${data.suppliers.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">משכורות</div>
      <div class="value">${data.salaries.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">הכנסות</div>
      <div class="value">${data.incomes.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">הוצאות</div>
      <div class="value">${data.expenses.length}</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">💰 סיכום פיננסי</div>
  <div class="stats-grid">
    <div class="stat-card highlight">
      <div class="label">סה"כ תקציבים</div>
      <div class="value">${formatNumber(totalBudget)} ₪</div>
    </div>
    <div class="stat-card highlight">
      <div class="label">תקציב שנותר</div>
      <div class="value">${formatNumber(totalRemaining)} ₪</div>
    </div>
    <div class="stat-card">
      <div class="label">סה"כ חשבוניות</div>
      <div class="value">${formatNumber(totalInvoices)} ₪</div>
    </div>
    <div class="stat-card">
      <div class="label">סה"כ הזמנות</div>
      <div class="value">${formatNumber(totalOrders)} ₪</div>
    </div>
    <div class="stat-card green">
      <div class="label">חשבוניות ששולמו</div>
      <div class="value">${formatNumber(totalPaid)} ₪</div>
    </div>
    <div class="stat-card red">
      <div class="label">חשבוניות לא שולמו</div>
      <div class="value">${formatNumber(totalUnpaid)} ₪</div>
    </div>
  </div>
</div>

<div class="summary">
  <h3>📋 סיכום כללי</h3>
  <div class="summary-row">
    <span>סה"כ משכורות:</span>
    <strong>${formatNumber(totalSalaries)} ₪</strong>
  </div>
  <div class="summary-row">
    <span>סה"כ הכנסות:</span>
    <strong>${formatNumber(totalIncomes)} ₪</strong>
  </div>
  <div class="summary-row">
    <span>סה"כ הוצאות:</span>
    <strong>${formatNumber(totalExpenses)} ₪</strong>
  </div>
  <div class="summary-row total">
    <span>מאזן (הכנסות - הוצאות):</span>
    <strong>${formatNumber(totalIncomes - totalExpenses)} ₪</strong>
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

    pdfPath = path.join(tmpDir, `export-${year}-${Date.now()}.pdf`);

    // יצירת PDF באמצעות Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
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

    // קריאת הקובץ ושליחה
    const pdfBuffer = fs.readFileSync(pdfPath);

    // שם הקובץ
    const filename = `export_${year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Export to PDF error:", error);
    res.status(500).json({ message: "שגיאה בייצוא ל-PDF", error: error.message });
  } finally {
    // מחיקת קובץ זמני
    if (pdfPath && fs.existsSync(pdfPath)) {
      setTimeout(() => {
        fs.unlink(pdfPath, (err) => {
          if (err) console.error("Failed to delete temp PDF:", err);
        });
      }, 100);
    }
  }
};
