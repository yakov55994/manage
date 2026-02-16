import JSZip from "jszip";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import Order from "../models/Order.js";
import Salary from "../models/Salary.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Notes from "../models/Notes.js";
import Notification from "../models/Notification.js";
import BackupLog from "../models/BackupLog.js";

// פונקציה לפורמט תאריך
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
};

// הכנת נתוני חשבוניות לאקסל
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
    פירוט: inv.detail || "",
    "נוצר ע״י": inv.createdByName || "",
    "תאריך יצירה": formatDate(inv.createdAt),
  }));
};

// הכנת נתוני פרויקטים לאקסל
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

// הכנת נתוני הזמנות לאקסל
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

// הכנת נתוני ספקים לאקסל
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

// הכנת נתוני משכורות לאקסל
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

// הכנת נתוני הכנסות לאקסל
const prepareIncomesData = (incomes) => {
  return incomes.map((inc) => ({
    תיאור: inc.description || "",
    סכום: inc.amount || 0,
    תאריך: formatDate(inc.date),
    שויך: inc.isCredited ? "כן" : "לא",
    הערות: inc.notes || "",
  }));
};

// הכנת נתוני הוצאות לאקסל
const prepareExpensesData = (expenses) => {
  return expenses.map((exp) => ({
    תיאור: exp.description || "",
    סכום: exp.amount || 0,
    תאריך: formatDate(exp.date),
    אסמכתא: exp.reference || "",
    הערות: exp.notes || "",
  }));
};

// הכנת נתוני משתמשים לאקסל (ללא סיסמאות)
const prepareUsersData = (users) => {
  return users.map((u) => ({
    "שם משתמש": u.username || u.name || "",
    אימייל: u.email || "",
    תפקיד: u.role || "",
    פעיל: u.isActive ? "כן" : "לא",
    "תאריך יצירה": formatDate(u.createdAt),
  }));
};

// הכנת נתוני הערות לאקסל
const prepareNotesData = (notes) => {
  return notes.map((n) => ({
    כותרת: n.title || "",
    תוכן: n.content || "",
    "נוצר ע״י": n.createdByName || n.createdBy?.toString() || "",
    "תאריך יצירה": formatDate(n.createdAt),
  }));
};

// הכנת נתוני התראות לאקסל
const prepareNotificationsData = (notifications) => {
  return notifications.map((n) => ({
    סוג: n.type || "",
    כותרת: n.title || "",
    הודעה: n.message || "",
    נקרא: n.read ? "כן" : "לא",
    "תאריך יצירה": formatDate(n.createdAt),
  }));
};

// יצירת גיליון אקסל מנתונים
const createExcelBuffer = (data, sheetName) => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data.length > 0 ? data : [{}]);
  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  ws["!cols"] = colWidths;
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
};

// רשימת הגיליונות
const getSheetsList = (data) => [
  { name: "חשבוניות", key: "invoices", prepare: prepareInvoicesData, data: data.invoices },
  { name: "פרויקטים", key: "projects", prepare: prepareProjectsData, data: data.projects },
  { name: "הזמנות", key: "orders", prepare: prepareOrdersData, data: data.orders },
  { name: "ספקים", key: "suppliers", prepare: prepareSuppliersData, data: data.suppliers },
  { name: "משכורות", key: "salaries", prepare: prepareSalariesData, data: data.salaries },
  { name: "הכנסות", key: "incomes", prepare: prepareIncomesData, data: data.incomes },
  { name: "הוצאות", key: "expenses", prepare: prepareExpensesData, data: data.expenses },
  { name: "משתמשים", key: "users", prepare: prepareUsersData, data: data.users },
  { name: "הערות", key: "notes", prepare: prepareNotesData, data: data.notes },
  { name: "התראות", key: "notifications", prepare: prepareNotificationsData, data: data.notifications },
];

// הורדת קבצים מ-Cloudinary לתוך ה-ZIP (לגיבוי ידני)
const downloadCloudinaryFilesToZip = async (zip) => {
  let filesCount = 0;
  const filesFolder = zip.folder("קבצים");

  // קבצי חשבוניות
  const invoices = await Invoice.find({ "files.0": { $exists: true } }).select("invoiceNumber files").lean();
  const invoicesFolder = filesFolder.folder("חשבוניות");

  for (const invoice of invoices) {
    for (const file of invoice.files || []) {
      try {
        if (!file.url || (!file.url.startsWith("http://") && !file.url.startsWith("https://"))) continue;

        let response = await fetch(file.url);

        if (!response.ok && file.url.includes("/raw/upload/")) {
          const altUrl = file.url.replace("/raw/upload/", "/image/upload/");
          response = await fetch(altUrl);
        }

        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        const safeName = `${invoice.invoiceNumber}_${file.name}`.replace(/[^\u0590-\u05FF\w.-]/g, "_");
        invoicesFolder.file(safeName, buffer);
        filesCount++;
      } catch (err) {
        console.error(`❌ שגיאה בהורדת קובץ חשבונית ${invoice.invoiceNumber}:`, err.message);
      }
    }
  }

  // קבצי הזמנות
  const orders = await Order.find({
    $or: [
      { "files.0": { $exists: true } },
      { "invoiceFiles.0": { $exists: true } },
      { "receiptFiles.0": { $exists: true } },
    ]
  }).select("orderNumber files invoiceFiles receiptFiles").lean();

  const ordersFolder = filesFolder.folder("הזמנות");

  for (const order of orders) {
    const allFiles = [
      ...(order.files || []),
      ...(order.invoiceFiles || []),
      ...(order.receiptFiles || []),
    ];
    for (const file of allFiles) {
      try {
        if (!file.url || (!file.url.startsWith("http://") && !file.url.startsWith("https://"))) continue;

        let response = await fetch(file.url);

        if (!response.ok && file.url.includes("/raw/upload/")) {
          const altUrl = file.url.replace("/raw/upload/", "/image/upload/");
          response = await fetch(altUrl);
        }

        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        const safeName = `${order.orderNumber}_${file.name}`.replace(/[^\u0590-\u05FF\w.-]/g, "_");
        ordersFolder.file(safeName, buffer);
        filesCount++;
      } catch (err) {
        console.error(`❌ שגיאה בהורדת קובץ הזמנה ${order.orderNumber}:`, err.message);
      }
    }
  }

  return filesCount;
};

// הורדת קבצים מ-Cloudinary לתיקייה (מדלג על קבצים שכבר קיימים)
const downloadCloudinaryFilesToFolder = async (basePath) => {
  let newFilesCount = 0;
  let skippedCount = 0;

  const invoicesDir = path.join(basePath, "קבצים", "חשבוניות");
  const ordersDir = path.join(basePath, "קבצים", "הזמנות");
  fs.mkdirSync(invoicesDir, { recursive: true });
  fs.mkdirSync(ordersDir, { recursive: true });

  // קבצי חשבוניות
  const invoices = await Invoice.find({ "files.0": { $exists: true } }).select("invoiceNumber files").lean();

  for (const invoice of invoices) {
    for (const file of invoice.files || []) {
      try {
        if (!file.url || (!file.url.startsWith("http://") && !file.url.startsWith("https://"))) continue;

        const safeName = `${invoice.invoiceNumber}_${file.name}`.replace(/[^\u0590-\u05FF\w.-]/g, "_");
        const filePath = path.join(invoicesDir, safeName);

        // דילוג על קובץ שכבר קיים
        if (fs.existsSync(filePath)) {
          skippedCount++;
          continue;
        }

        let response = await fetch(file.url);

        if (!response.ok && file.url.includes("/raw/upload/")) {
          const altUrl = file.url.replace("/raw/upload/", "/image/upload/");
          response = await fetch(altUrl);
        }

        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        newFilesCount++;
      } catch (err) {
        console.error(`❌ שגיאה בהורדת קובץ חשבונית ${invoice.invoiceNumber}:`, err.message);
      }
    }
  }

  // קבצי הזמנות
  const orders = await Order.find({
    $or: [
      { "files.0": { $exists: true } },
      { "invoiceFiles.0": { $exists: true } },
      { "receiptFiles.0": { $exists: true } },
    ]
  }).select("orderNumber files invoiceFiles receiptFiles").lean();

  for (const order of orders) {
    const allFiles = [
      ...(order.files || []),
      ...(order.invoiceFiles || []),
      ...(order.receiptFiles || []),
    ];
    for (const file of allFiles) {
      try {
        if (!file.url || (!file.url.startsWith("http://") && !file.url.startsWith("https://"))) continue;

        const safeName = `${order.orderNumber}_${file.name}`.replace(/[^\u0590-\u05FF\w.-]/g, "_");
        const filePath = path.join(ordersDir, safeName);

        // דילוג על קובץ שכבר קיים
        if (fs.existsSync(filePath)) {
          skippedCount++;
          continue;
        }

        let response = await fetch(file.url);

        if (!response.ok && file.url.includes("/raw/upload/")) {
          const altUrl = file.url.replace("/raw/upload/", "/image/upload/");
          response = await fetch(altUrl);
        }

        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        newFilesCount++;
      } catch (err) {
        console.error(`❌ שגיאה בהורדת קובץ הזמנה ${order.orderNumber}:`, err.message);
      }
    }
  }

  return { newFilesCount, skippedCount };
};

// שליפת כל הנתונים
const fetchAllBackupData = async () => {
  const [invoices, projects, users, suppliers, orders, salaries, incomes, expenses, notes, notifications] =
    await Promise.all([
      Invoice.find().populate("supplierId", "name").lean(),
      Project.find().lean(),
      User.find().select("-password").lean(),
      Supplier.find().lean(),
      Order.find().populate("supplierId", "name").lean(),
      Salary.find().populate("projectId", "name").lean(),
      Income.find().lean(),
      Expense.find().lean(),
      Notes.find().lean(),
      Notification.find().lean(),
    ]);

  return { invoices, projects, users, suppliers, orders, salaries, incomes, expenses, notes, notifications };
};

// בניית ZIP (לגיבוי ידני - הורדה ישירה)
const buildBackupZip = async () => {
  const zip = new JSZip();
  const data = await fetchAllBackupData();

  const recordCounts = {};
  const sheets = getSheetsList(data);
  const excelFolder = zip.folder("נתונים");

  for (const sheet of sheets) {
    const prepared = sheet.prepare(sheet.data);
    const buffer = createExcelBuffer(prepared, sheet.name);
    excelFolder.file(`${sheet.name}.xlsx`, buffer);
    recordCounts[sheet.key] = sheet.data.length;
  }

  const filesCount = await downloadCloudinaryFilesToZip(zip);

  const metadata = {
    backupDate: new Date().toISOString(),
    backupDateHebrew: new Date().toLocaleDateString("he-IL"),
    type: "full",
    recordCounts,
    filesCount,
    totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
  };

  zip.file("_metadata.json", JSON.stringify(metadata, null, 2));

  return { zip, metadata, recordCounts, filesCount };
};

// בניית גיבוי לתיקייה (אקסל מלא + קבצים חדשים בלבד)
const buildBackupToFolder = async (backupDir) => {
  const data = await fetchAllBackupData();
  const recordCounts = {};

  const excelDir = path.join(backupDir, "נתונים");
  fs.mkdirSync(excelDir, { recursive: true });

  const sheets = getSheetsList(data);

  for (const sheet of sheets) {
    const prepared = sheet.prepare(sheet.data);
    const buffer = createExcelBuffer(prepared, sheet.name);
    fs.writeFileSync(path.join(excelDir, `${sheet.name}.xlsx`), buffer);
    recordCounts[sheet.key] = sheet.data.length;
  }

  // הורדת קבצים חדשים בלבד (מדלג על קיימים)
  const { newFilesCount, skippedCount } = await downloadCloudinaryFilesToFolder(backupDir);

  // ספירת כל הקבצים שיש בתיקייה
  const totalFilesCount = newFilesCount + skippedCount;

  // מטא-דאטא
  const metadata = {
    backupDate: new Date().toISOString(),
    backupDateHebrew: new Date().toLocaleDateString("he-IL"),
    type: "incremental",
    recordCounts,
    newFilesCount,
    skippedFilesCount: skippedCount,
    totalFilesCount,
    totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
  };

  fs.writeFileSync(path.join(backupDir, "_metadata.json"), JSON.stringify(metadata, null, 2));

  return { recordCounts, newFilesCount, skippedCount, totalFilesCount };
};

// הוספת תיקייה ל-ZIP רקורסיבית
const addFolderToZip = (zip, folderPath, zipPath) => {
  const items = fs.readdirSync(folderPath);
  for (const item of items) {
    const fullPath = path.join(folderPath, item);
    const itemZipPath = zipPath ? `${zipPath}/${item}` : item;
    if (fs.statSync(fullPath).isDirectory()) {
      addFolderToZip(zip, fullPath, itemZipPath);
    } else {
      zip.file(itemZipPath, fs.readFileSync(fullPath));
    }
  }
};

// ===============================================
// גיבוי מלא ידני (שמירה על השרת בלבד, בלי הורדה)
// ===============================================
export const createBackup = async (req, res) => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const backupsBase = path.join(process.cwd(), "tmp", "backups");
    const backupDir = path.join(backupsBase, `backup_${date}`);

    // מחיקת תיקיות גיבוי ישנות (שמירת 7 אחרונות)
    if (fs.existsSync(backupsBase)) {
      const existingDirs = fs.readdirSync(backupsBase)
        .filter(f => f.startsWith("backup_") && fs.statSync(path.join(backupsBase, f)).isDirectory())
        .sort()
        .reverse();

      for (const oldDir of existingDirs.slice(6)) {
        fs.rmSync(path.join(backupsBase, oldDir), { recursive: true, force: true });
      }
    }

    const { recordCounts, newFilesCount, skippedCount, totalFilesCount } = await buildBackupToFolder(backupDir);

    await BackupLog.create({
      backupDate: new Date(),
      type: "manual",
      recordCounts,
      filesCount: totalFilesCount,
      status: "success",
      filePath: backupDir,
    });

    res.json({
      success: true,
      message: "הגיבוי נוצר בהצלחה על השרת",
      date,
      recordCounts,
      newFilesCount,
      skippedCount,
      totalFilesCount,
    });
  } catch (error) {
    console.error("Backup error:", error);

    await BackupLog.create({
      backupDate: new Date(),
      type: "manual",
      status: "failed",
      error: error.message,
    }).catch(() => {});

    res.status(500).json({ message: "שגיאה ביצירת גיבוי", error: error.message });
  }
};

// ===============================================
// גיבוי אוטומטי (cron) - תיקייה יומית עם אינקרמנטלי
// ===============================================
export const createScheduledBackup = async () => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const backupsBase = path.join(process.cwd(), "tmp", "backups");
    const backupDir = path.join(backupsBase, `backup_${date}`);

    // מחיקת תיקיות גיבוי ישנות (שמירת 7 אחרונות)
    if (fs.existsSync(backupsBase)) {
      const existingDirs = fs.readdirSync(backupsBase)
        .filter(f => f.startsWith("backup_") && fs.statSync(path.join(backupsBase, f)).isDirectory())
        .sort()
        .reverse();

      for (const oldDir of existingDirs.slice(6)) {
        fs.rmSync(path.join(backupsBase, oldDir), { recursive: true, force: true });
      }
    }

    const { recordCounts, newFilesCount, skippedCount, totalFilesCount } = await buildBackupToFolder(backupDir);

    await BackupLog.create({
      backupDate: new Date(),
      type: "scheduled",
      recordCounts,
      filesCount: totalFilesCount,
      status: "success",
      filePath: backupDir,
    });

    console.log(`✅ גיבוי אוטומטי: ${newFilesCount} קבצים חדשים הורדו, ${skippedCount} קיימים דולגו`);
  } catch (error) {
    console.error("❌ Scheduled backup error:", error);

    await BackupLog.create({
      backupDate: new Date(),
      type: "scheduled",
      status: "failed",
      error: error.message,
    }).catch(() => {});
  }
};

// ===============================================
// סטטוס גיבוי אחרון
// ===============================================
export const getBackupStatus = async (req, res) => {
  try {
    const lastBackup = await BackupLog.findOne({ status: "success" })
      .sort({ backupDate: -1 });

    const lastScheduled = await BackupLog.findOne({ status: "success", type: "scheduled" })
      .sort({ backupDate: -1 });

    res.json({
      lastBackup: lastBackup ? {
        date: lastBackup.backupDate,
        type: lastBackup.type,
        recordCounts: lastBackup.recordCounts,
        filesCount: lastBackup.filesCount,
      } : null,
      lastScheduled: lastScheduled ? {
        date: lastScheduled.backupDate,
        recordCounts: lastScheduled.recordCounts,
        filesCount: lastScheduled.filesCount,
        filePath: lastScheduled.filePath,
      } : null,
    });
  } catch (error) {
    console.error("Backup status error:", error);
    res.status(500).json({ message: "שגיאה בשליפת סטטוס גיבוי" });
  }
};

// ===============================================
// הורדת גיבוי אוטומטי אחרון (ZIP מהתיקייה)
// ===============================================
export const downloadLatestBackup = async (req, res) => {
  try {
    const backupsBase = path.join(process.cwd(), "tmp", "backups");

    if (!fs.existsSync(backupsBase)) {
      return res.status(404).json({ message: "אין גיבוי אוטומטי זמין" });
    }

    const folders = fs.readdirSync(backupsBase)
      .filter(f => f.startsWith("backup_") && fs.statSync(path.join(backupsBase, f)).isDirectory())
      .sort()
      .reverse();

    if (folders.length === 0) {
      return res.status(404).json({ message: "אין גיבוי אוטומטי זמין" });
    }

    const latestFolder = path.join(backupsBase, folders[0]);

    // יצירת ZIP מהתיקייה
    const zip = new JSZip();
    addFolderToZip(zip, latestFolder, "");
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `${folders[0]}.zip`;

    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": zipContent.length,
    });
    res.end(zipContent);
  } catch (error) {
    console.error("Download latest backup error:", error);
    res.status(500).json({ message: "שגיאה בהורדת גיבוי" });
  }
};
