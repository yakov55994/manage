import JSZip from "jszip";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { google } from "googleapis";
import mongoose from "mongoose";
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
// Google Drive helpers
// ===============================================
const getDriveClient = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("חסרים פרטי Google Service Account בסביבה (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
};

const uploadBackupToDrive = async (zipBuffer, fileName) => {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) throw new Error("חסר GOOGLE_DRIVE_FOLDER_ID בסביבה");

  // מחיקת גיבויים ישנים מעל 7 (שמירת 7 אחרונים)
  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and name contains 'backup_'`,
    fields: "files(id, name, createdTime)",
    orderBy: "createdTime desc",
  });
  const oldFiles = (list.data.files || []).slice(6);
  for (const file of oldFiles) {
    await drive.files.delete({ fileId: file.id }).catch(() => {});
  }

  // העלאה
  const stream = new Readable();
  stream.push(zipBuffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: "application/zip", body: stream },
    fields: "id, name, size",
  });

  return response.data;
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
// גיבוי אוטומטי (cron) - ZIP מלא + העלאה ל-Google Drive
// ===============================================
export const createScheduledBackup = async () => {
  try {
    const date = new Date().toISOString().split("T")[0];
    console.log(`🔄 מתחיל גיבוי אוטומטי ל-Google Drive (${date})...`);

    // בניית ZIP מלא בזיכרון
    const { zip, metadata } = await buildBackupZip();
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const fileName = `backup_${date}.zip`;

    // העלאה ל-Google Drive
    const driveFile = await uploadBackupToDrive(zipBuffer, fileName);

    await BackupLog.create({
      backupDate: new Date(),
      type: "scheduled",
      recordCounts: metadata.recordCounts,
      filesCount: metadata.filesCount,
      status: "success",
      filePath: `google-drive:${driveFile.id}`,
    });

    console.log(`✅ גיבוי אוטומטי הועלה ל-Drive: ${fileName} (${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
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

// ===============================================
// שמירת גיבוי לנתיב רשת
// ===============================================
export const saveBackupToPath = async (req, res) => {
  try {
    const { targetPath } = req.body;
    if (!targetPath || typeof targetPath !== "string" || !targetPath.trim()) {
      return res.status(400).json({ message: "יש לספק נתיב יעד תקין" });
    }

    const cleanPath = targetPath.trim();

    // וידוא שהתיקייה קיימת
    if (!fs.existsSync(cleanPath)) {
      return res.status(400).json({ message: `הנתיב לא נמצא: ${cleanPath}` });
    }

    const stat = fs.statSync(cleanPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: "הנתיב חייב להיות תיקייה" });
    }

    // בניית ZIP מלא
    const { zip, metadata } = await buildBackupZip();
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    const date = new Date().toISOString().split("T")[0];
    const fileName = `backup_${date}.zip`;
    const fullPath = path.join(cleanPath, fileName);

    fs.writeFileSync(fullPath, zipContent);

    await BackupLog.create({
      backupDate: new Date(),
      type: "manual",
      recordCounts: metadata.recordCounts,
      filesCount: metadata.filesCount,
      status: "success",
      filePath: fullPath,
    });

    res.json({
      success: true,
      message: `הגיבוי נשמר בהצלחה`,
      fileName,
      fullPath,
      sizeMB: (zipContent.length / 1024 / 1024).toFixed(1),
      totalRecords: metadata.totalRecords,
      filesCount: metadata.filesCount,
    });
  } catch (error) {
    console.error("Save backup to path error:", error);
    res.status(500).json({ message: "שגיאה בשמירת הגיבוי לנתיב", error: error.message });
  }
};

// ===============================================
// עזרים לשחזור
// ===============================================

/** המרת תאריך DD/MM/YYYY ל-Date */
const parseHebrewDate = (str) => {
  if (!str) return null;
  const s = String(str).trim();
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00.000Z`);
  return isNaN(date.getTime()) ? null : date;
};

/** קריאת גיליון אקסל מ-buffer */
const readExcelSheet = (buffer) => {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws, { defval: "" });
};

// ===============================================
// שחזור גיבוי מ-ZIP
// ===============================================
export const restoreFromBackup = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "לא הועלה קובץ גיבוי" });
  }

  const results = {
    suppliers: { inserted: 0, skipped: 0 },
    projects: { inserted: 0, skipped: 0 },
    invoices: { inserted: 0, skipped: 0 },
    orders: { inserted: 0, skipped: 0 },
    salaries: { inserted: 0, skipped: 0 },
    incomes: { inserted: 0 },
    expenses: { inserted: 0 },
    notes: { inserted: 0 },
    errors: [],
  };

  try {
    const zip = await JSZip.loadAsync(req.file.buffer);

    // --- עזר: קריאת קובץ מה-ZIP (תומך בתיקיית שורש כלשהי) ---
    const readZipFile = async (name) => {
      // ניסיון ישיר
      let file = zip.file(`נתונים/${name}.xlsx`);
      if (!file) {
        // חיפוש בכל הנתיבים
        const allFiles = Object.keys(zip.files);
        const match = allFiles.find(
          (p) => p.endsWith(`נתונים/${name}.xlsx`) || p.endsWith(`נתונים\\${name}.xlsx`)
        );
        if (match) file = zip.file(match);
      }
      if (!file) return null;
      const buffer = await file.async("nodebuffer");
      return readExcelSheet(buffer);
    };

    // =====================================
    // 1. ספקים
    // =====================================
    const suppliersRows = await readZipFile("ספקים");
    const supplierNameToId = {};

    if (suppliersRows) {
      for (const row of suppliersRows) {
        const name = String(row["שם הספק"] || "").trim();
        const business_tax = String(row["מספר עוסק"] || "").trim();
        if (!name || !business_tax) continue;

        const existing = await Supplier.findOne({ business_tax });
        if (existing) {
          supplierNameToId[name] = existing._id;
          results.suppliers.skipped++;
          continue;
        }

        const supplierData = { name, business_tax };
        if (row["טלפון"]) supplierData.phone = String(row["טלפון"]);
        if (row["אימייל"]) supplierData.email = String(row["אימייל"]);
        if (row["בנק"] && row["סניף"] && row["חשבון"]) {
          supplierData.bankDetails = {
            bankName: String(row["בנק"]),
            branchNumber: String(row["סניף"]),
            accountNumber: String(row["חשבון"]),
          };
        }

        const supplier = await Supplier.create(supplierData);
        supplierNameToId[name] = supplier._id;
        results.suppliers.inserted++;
      }
    }

    // =====================================
    // 2. פרויקטים
    // =====================================
    const projectsRows = await readZipFile("פרויקטים");
    const projectNameToId = {};

    if (projectsRows) {
      for (const row of projectsRows) {
        const name = String(row["שם פרויקט"] || "").trim();
        if (!name) continue;

        const existing = await Project.findOne({ name });
        if (existing) {
          projectNameToId[name] = existing._id;
          results.projects.skipped++;
          continue;
        }

        const typeMap = { regular: "regular", milga: "milga", salary: "salary" };
        const rawType = String(row["סוג"] || "regular").trim();

        const projectData = {
          name,
          budget: Number(row["תקציב"]) || 0,
          remainingBudget: Number(row["תקציב שנותר"]) || 0,
          invitingName: String(row["שם המזמין"] || "לא ידוע"),
          Contact_person: String(row["איש קשר"] || "לא ידוע"),
          type: typeMap[rawType] || "regular",
        };

        const project = await Project.create(projectData);
        projectNameToId[name] = project._id;
        results.projects.inserted++;
      }
    }

    // =====================================
    // 3. חשבוניות
    // =====================================
    const invoicesRows = await readZipFile("חשבוניות");
    const validDocTypes = ["ח. עסקה", "ה. עבודה", "ד. תשלום", "חשבונית מס / קבלה", "משכורות", "אין צורך"];
    const validPaid = ["כן", "לא", "יצא לתשלום", "לא לתשלום"];
    const validStatus = ["הוגש", "לא הוגש", "בעיבוד"];

    if (invoicesRows) {
      for (const row of invoicesRows) {
        const invoiceNumber = String(row["מספר חשבונית"] || "").trim();
        if (!invoiceNumber) continue;

        const existing = await Invoice.findOne({ invoiceNumber });
        if (existing) {
          results.invoices.skipped++;
          continue;
        }

        try {
          const supplierName = String(row["שם ספק"] || "").trim();
          const supplierId = supplierNameToId[supplierName] || null;

          const totalAmount = Number(row["סכום"]) || 0;
          const projectNamesStr = String(row["פרויקטים"] || "").trim();
          const projectNames = projectNamesStr
            ? projectNamesStr.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

          const projects = [];
          if (projectNames.length > 0) {
            const perSum = projectNames.length > 1 ? Math.round(totalAmount / projectNames.length) : totalAmount;
            for (const pName of projectNames) {
              const pId = projectNameToId[pName];
              if (pId) {
                projects.push({ projectId: pId, projectName: pName, sum: perSum });
              }
            }
          }

          // דרוש לפחות פרויקט אחד
          if (projects.length === 0) {
            // נחפש פרויקט כלשהו
            const anyProject = await Project.findOne();
            if (anyProject) {
              projects.push({ projectId: anyProject._id, projectName: anyProject.name, sum: totalAmount });
            } else {
              results.errors.push(`חשבונית ${invoiceNumber}: לא נמצא פרויקט`);
              results.invoices.skipped++;
              continue;
            }
          }

          const rawDocType = String(row["סוג מסמך"] || "").trim();
          const documentType = validDocTypes.includes(rawDocType) ? rawDocType : "אין צורך";
          const rawPaid = String(row["שולם"] || "לא").trim();
          const paid = validPaid.includes(rawPaid) ? rawPaid : "לא";
          const rawStatus = String(row["סטטוס"] || "לא הוגש").trim();
          const status = validStatus.includes(rawStatus) ? rawStatus : "לא הוגש";

          const createdAt = parseHebrewDate(String(row["תאריך יצירה"] || "")) || new Date();
          const invoiceData = {
            invoiceNumber,
            documentType,
            totalAmount,
            status,
            paid,
            projects,
            detail: String(row["פירוט"] || ""),
            createdByName: String(row['נוצר ע"י'] || row["נוצר ע״י"] || ""),
            createdAt,
            updatedAt: createdAt,
          };

          if (supplierId) invoiceData.supplierId = supplierId;
          const invoiceDate = parseHebrewDate(String(row["תאריך חשבונית"] || ""));
          if (invoiceDate) invoiceData.invoiceDate = invoiceDate;

          await Invoice.collection.insertOne(invoiceData);
          results.invoices.inserted++;
        } catch (err) {
          results.errors.push(`חשבונית ${invoiceNumber}: ${err.message}`);
        }
      }
    }

    // =====================================
    // 4. הזמנות
    // =====================================
    const ordersRows = await readZipFile("הזמנות");
    const validOrderStatus = ["הוגש", "לא הוגש", "בעיבוד", "הוגש חלקי"];

    if (ordersRows) {
      for (const row of ordersRows) {
        const orderNumber = Number(row["מספר הזמנה"]) || 0;
        if (!orderNumber) continue;

        const projectName = String(row["פרויקט"] || "").trim();
        const projectId = projectNameToId[projectName];
        if (!projectId) {
          results.errors.push(`הזמנה ${orderNumber}: פרויקט "${projectName}" לא נמצא`);
          results.orders.skipped++;
          continue;
        }

        const existing = await Order.findOne({ orderNumber, projectName });
        if (existing) {
          results.orders.skipped++;
          continue;
        }

        try {
          const supplierName = String(row["שם ספק"] || "").trim();
          const supplierId = supplierNameToId[supplierName] || null;
          const rawStatus = String(row["סטטוס"] || "לא הוגש").trim();
          const status = validOrderStatus.includes(rawStatus) ? rawStatus : "לא הוגש";

          const orderCreatedAt = parseHebrewDate(String(row["תאריך יצירה"] || "")) || new Date();
          const orderData = {
            orderNumber,
            projectName,
            projectId,
            sum: Number(row["סכום"]) || 0,
            status,
            invitingName: String(row["נוצר ע״י"] || row['נוצר ע"י'] || "לא ידוע"),
            createdAt: orderCreatedAt,
            updatedAt: orderCreatedAt,
          };
          if (supplierId) orderData.supplierId = supplierId;

          await Order.collection.insertOne(orderData);
          results.orders.inserted++;
        } catch (err) {
          results.errors.push(`הזמנה ${orderNumber}: ${err.message}`);
        }
      }
    }

    // =====================================
    // 5. משכורות
    // =====================================
    const salariesRows = await readZipFile("משכורות");

    if (salariesRows) {
      for (const row of salariesRows) {
        const employeeName = String(row["שם עובד"] || "").trim();
        if (!employeeName) continue;

        const projectName = String(row["פרויקט"] || "").trim();
        const projectId = projectNameToId[projectName];
        if (!projectId) {
          results.errors.push(`משכורת ${employeeName}: פרויקט "${projectName}" לא נמצא`);
          continue;
        }

        try {
          const salaryData = {
            employeeName,
            projectId,
            baseAmount: Number(row["סכום בסיס"]) || 0,
            overheadPercent: Number(row["אחוז תקורה"]) || 0,
            finalAmount: Number(row["סכום סופי"]) || 0,
            date: parseHebrewDate(String(row["תאריך"] || "")) || new Date(),
          };

          await Salary.collection.insertOne(salaryData);
          results.salaries.inserted++;
        } catch (err) {
          results.errors.push(`משכורת ${employeeName}: ${err.message}`);
        }
      }
    }

    // =====================================
    // 6. הכנסות
    // =====================================
    const incomesRows = await readZipFile("הכנסות");

    if (incomesRows) {
      const dummyId = new mongoose.Types.ObjectId("000000000000000000000000");
      const docs = incomesRows
        .filter((r) => String(r["תיאור"] || "").trim())
        .map((row) => ({
          description: String(row["תיאור"]),
          amount: String(row["סכום"] || "0"),
          date: parseHebrewDate(String(row["תאריך"] || "")) || new Date(),
          isCredited: String(row["שויך"] || "") === "כן" ? "כן" : "לא",
          notes: String(row["הערות"] || ""),
          createdBy: dummyId,
          createdByName: "שחזור גיבוי",
        }));

      if (docs.length > 0) {
        await Income.collection.insertMany(docs);
        results.incomes.inserted = docs.length;
      }
    }

    // =====================================
    // 7. הוצאות
    // =====================================
    const expensesRows = await readZipFile("הוצאות");

    if (expensesRows) {
      const dummyId = new mongoose.Types.ObjectId("000000000000000000000000");
      const docs = expensesRows
        .filter((r) => String(r["תיאור"] || "").trim())
        .map((row) => {
          const expDate = parseHebrewDate(String(row["תאריך"] || "")) || new Date();
          return {
            description: String(row["תיאור"]),
            amount: String(row["סכום"] || "0"),
            date: expDate,
            reference: String(row["אסמכתא"] || ""),
            notes: String(row["הערות"] || ""),
            createdBy: dummyId,
            createdByName: "שחזור גיבוי",
            createdAt: expDate,
            updatedAt: expDate,
          };
        });

      if (docs.length > 0) {
        await Expense.collection.insertMany(docs);
        results.expenses.inserted = docs.length;
      }
    }

    // =====================================
    // 8. הערות
    // =====================================
    const notesRows = await readZipFile("הערות");

    if (notesRows) {
      const docs = notesRows
        .filter((r) => String(r["כותרת"] || r["תוכן"] || "").trim())
        .map((row) => {
          const title = String(row["כותרת"] || "").trim();
          const content = String(row["תוכן"] || "").trim();
          return {
            text: title || content,
            createdByName: String(row['נוצר ע"י'] || row["נוצר ע״י"] || "שחזור גיבוי"),
          };
        });

      if (docs.length > 0) {
        await Notes.collection.insertMany(docs);
        results.notes.inserted = docs.length;
      }
    }

    res.json({
      success: true,
      message: "השחזור הושלם בהצלחה",
      results,
    });
  } catch (error) {
    console.error("Restore error:", error);
    res.status(500).json({ message: "שגיאה בשחזור הגיבוי", error: error.message });
  }
};
