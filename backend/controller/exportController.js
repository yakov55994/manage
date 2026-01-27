import xlsx from "xlsx";
import PDFDocument from "pdfkit";
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

// Helper to reverse Hebrew text for PDFKit (Visual RTL)
const formatHebrew = (text) => {
  if (!text) return "";
  text = String(text);
  if (/[\u0590-\u05FF]/.test(text)) {
    return text.split("").reverse().join("");
  }
  return text;
};

// שליפת כל הנתונים
const fetchAllData = async () => {
  const [projects, invoices, orders, suppliers, salaries, incomes, expenses] =
    await Promise.all([
      Project.find().lean(),
      Invoice.find().populate("supplierId", "name").lean(),
      Order.find().populate("supplierId", "name").lean(),
      Supplier.find().lean(),
      Salary.find().populate("projectId", "name").lean(),
      Income.find().lean(),
      Expense.find().lean(),
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
    const data = await fetchAllData();

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
      const ws = xlsx.utils.json_to_sheet(sheet.data);

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
    const filename = `export_${new Date().toISOString().split("T")[0]}.xlsx`;

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

// ייצוא ל-PDF
export const exportToPDF = async (req, res) => {
  try {
    const data = await fetchAllData();

    // יצירת PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // נסיון טעינת פונט עברי
    try {
      doc.font("C:\\Windows\\Fonts\\arial.ttf");
    } catch (e) {
      console.warn("Hebrew font not found, using default.");
    }

    // שם הקובץ
    const filename = `export_${new Date().toISOString().split("T")[0]}.pdf`;

    // הגדרת headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // pipe ל-response
    doc.pipe(res);

    // כותרת ראשית
    doc.fontSize(24).text(formatHebrew("דוח ייצוא נתונים"), { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(formatHebrew(`תאריך: ${formatDate(new Date())}`), { align: "center" });
    doc.moveDown(2);

    // סיכום כמויות
    doc.fontSize(18).text(formatHebrew("סיכום כמויות"), { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`${data.projects.length} :${formatHebrew("פרויקטים")}`);
    doc.text(`${data.invoices.length} :${formatHebrew("חשבוניות")}`);
    doc.text(`${data.orders.length} :${formatHebrew("הזמנות")}`);
    doc.text(`${data.suppliers.length} :${formatHebrew("ספקים")}`);
    doc.text(`${data.salaries.length} :${formatHebrew("משכורות")}`);
    doc.text(`${data.incomes.length} :${formatHebrew("הכנסות")}`);
    doc.text(`${data.expenses.length} :${formatHebrew("הוצאות")}`);
    doc.moveDown(2);

    // סיכום פיננסי
    doc.fontSize(18).text(formatHebrew("סיכום פיננסי"), { underline: true });
    doc.moveDown();

    // סיכום תקציבים
    const totalBudget = data.projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalRemaining = data.projects.reduce(
      (sum, p) => sum + (p.remainingBudget || 0),
      0
    );
    doc.fontSize(12).text(`${formatHebrew("ש״ח")} ${formatNumber(totalBudget)} :${formatHebrew("סה״כ תקציב")}`);
    doc.text(`${formatHebrew("ש״ח")} ${formatNumber(totalRemaining)} :${formatHebrew("תקציב שנותר")}`);
    doc.moveDown();

    // סיכום חשבוניות
    const totalInvoices = data.invoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );
    doc.text(`${formatHebrew("ש״ח")} ${formatNumber(totalInvoices)} :${formatHebrew("סה״כ חשבוניות")}`);
    doc.moveDown();

    // סיכום הזמנות
    const totalOrders = data.orders.reduce((sum, ord) => sum + (ord.sum || 0), 0);
    doc.text(`${formatHebrew("ש״ח")} ${formatNumber(totalOrders)} :${formatHebrew("סה״כ הזמנות")}`);
    doc.moveDown();

    // סיכום משכורות
    const totalSalaries = data.salaries.reduce(
      (sum, sal) => sum + (sal.finalAmount || 0),
      0
    );
    doc.text(`${formatHebrew("ש״ח")} ${formatNumber(totalSalaries)} :${formatHebrew("סה״כ משכורות")}`);
    doc.moveDown();

    // סיכום הכנסות והוצאות
    const totalIncomes = data.incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalExpenses = data.expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    doc.text(`${formatHebrew("ש״ח")} ${formatNumber(totalIncomes)} :${formatHebrew("סה״כ הכנסות")}`);
    doc.text(`${formatHebrew("ש״ח")} ${formatNumber(totalExpenses)} :${formatHebrew("סה״כ הוצאות")}`);

    // סיום המסמך
    doc.end();
  } catch (error) {
    console.error("Export to PDF error:", error);
    res.status(500).json({ message: "שגיאה בייצוא ל-PDF", error: error.message });
  }
};
