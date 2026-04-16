// =======================================
// MASAV CONTROLLER
// =======================================

import path from "path";
import { generateMasavPDF } from "../services/masavPdfService.js";
import { generateMasavFile, validatePayments } from "../services/masavService.js";
import fs from "fs";
import MasavHistory from "../models/MasavHistory.js";
import { saveLog, getIp } from "../utils/logger.js";

// ===============================================
// פונקציית עזר לסידור עברי (א'-ב')
// ===============================================
function hebrewSort(strA, strB) {
  const a = (strA || "").trim();
  const b = (strB || "").trim();

  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const codeA = a.charCodeAt(i);
    const codeB = b.charCodeAt(i);

    const isHebrewA = codeA >= 0x05D0 && codeA <= 0x05EA;
    const isHebrewB = codeB >= 0x05D0 && codeB <= 0x05EA;

    if (isHebrewA && isHebrewB) {
      if (codeA !== codeB) return codeA - codeB;
    } else if (isHebrewA) return -1;
    else if (isHebrewB) return 1;
    else if (codeA !== codeB) return codeA - codeB;
  }

  return a.length - b.length;
}

export default {
async generateMasav(req, res) {
  let pdfPath = null;
  let htmlPath = path.join(process.cwd(), "tmp", "masavReport.html");

  try {
    const { payments, companyInfo, executionDate, invoiceIds } = req.body;

    // יצירת שם קובץ עם תאריך בפורמט DD-MM-YYYY
    const fileDate = executionDate; // YYYY-MM-DD
    const [year, month, day] = fileDate.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    // ✅ איחוד ספקים - כל ספק עם כמה חשבוניות יופיע פעם אחת
    const supplierMap = new Map();

    payments.forEach((payment) => {
      const key = payment.internalId; // מזהה ייחודי לספק

      if (supplierMap.has(key)) {
        const existing = supplierMap.get(key);
        // צבירת סכומים - חיבור מספרי מפורש למניעת שרשור מחרוזות
        existing.amount = Number(existing.amount) + Number(payment.amount);
        // איחוד מספרי חשבוניות
        if (payment.invoiceNumbers) {
          existing.invoiceNumbers = existing.invoiceNumbers
            ? `${existing.invoiceNumbers}, ${payment.invoiceNumbers}`
            : payment.invoiceNumbers;
        }
        // איחוד שמות פרויקטים
        if (payment.projectNames) {
          const existingProjects = new Set(existing.projectNames?.split(", ") || []);
          const newProjects = payment.projectNames.split(", ");
          newProjects.forEach(p => existingProjects.add(p));
          existing.projectNames = Array.from(existingProjects).join(", ");
        }
      } else {
        // ספק חדש - העתק את כל הפרטים
        supplierMap.set(key, { ...payment });
      }
    });

    // המרה למערך
    const consolidatedPayments = Array.from(supplierMap.values());

    // ✅ סידור התשלומים לפי שם ספק בסדר א'-ב'
    const sortedPayments = consolidatedPayments.sort((a, b) =>
      hebrewSort(a.supplierName || "", b.supplierName || "")
    );

    const txt = generateMasavFile(companyInfo, sortedPayments, executionDate);

    pdfPath = await generateMasavPDF({
      payments: sortedPayments,
      companyInfo,
      executionDate
    });

    const pdfBuffer = fs.readFileSync(pdfPath);

    // המרה ל-ANSI (Windows-1255) כדי שהבנק יוכל לקרוא את הקובץ
    const iconv = (await import("iconv-lite")).default;
    const txtBuffer = iconv.encode(txt, 'windows-1255');

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    zip.file(`זיכוייים ${formattedDate}.txt`, txtBuffer);
    zip.file(`זיכוייים (סיכום) ${formattedDate}.pdf`, pdfBuffer);

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    // ✅ שמירת היסטוריה
    try {
      const totalAmount = sortedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const fileName = `זיכוייים ${formattedDate}.zip`;

      await MasavHistory.create({
        executionDate: new Date(`${year}-${month}-${day}`),
        generatedBy: {
          userId: req.user?._id || null,
          userName: req.user?.username || req.user?.name || "לא ידוע",
        },
        companyInfo,
        payments: sortedPayments.map(p => ({
          supplierName: p.supplierName,
          bankNumber: p.bankNumber,
          branchNumber: p.branchNumber,
          accountNumber: p.accountNumber,
          amount: p.amount,
          internalId: p.internalId,
          invoiceNumbers: p.invoiceNumbers,
          projectNames: p.projectNames,
          bankName: p.bankName,
        })),
        invoiceIds: invoiceIds || [],
        totalAmount,
        totalPayments: sortedPayments.length,
        fileName,
        masavFileBase64: txtBuffer.toString("base64"),
        pdfFileBase64: pdfBuffer.toString("base64"),
      });
    } catch (historyErr) {
      console.error("Failed to save MASAV history:", historyErr);
      saveLog({ type: 'error', message: `שגיאה בשמירת היסטוריית מסב — ${historyErr.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { executionDate, totalPayments: sortedPayments.length } });
    }

    // קידוד UTF-8 לשם הקובץ בעברית
    const fileName = `זיכוייים ${formattedDate}.zip`;
    const encodedFileName = encodeURIComponent(fileName);

    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
    });

    res.end(zipContent);

  } catch (err) {
    console.error("MASAV ERROR:", err);
    saveLog({ type: 'error', message: `שגיאה ביצירת קובץ מסב — ${err.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { executionDate: req.body?.executionDate, totalPayments: req.body?.payments?.length } });
    if (!res.headersSent) res.status(500).json({ error: err.message });

  } finally {

    // 🗑 מחיקת PDF
    if (pdfPath && fs.existsSync(pdfPath)) {
      setTimeout(() => {
        fs.unlink(pdfPath, (err) => {
          if (err) console.error("Failed to delete PDF:", err);
          else console.log("Temp PDF deleted:", pdfPath);
        });
      }, 100);
    }

    // 🗑 מחיקת HTML זמני
    if (fs.existsSync(htmlPath)) {
      setTimeout(() => {
        fs.unlink(htmlPath, (err) => {
          if (err) console.error("Failed to delete HTML:", err);
          else console.log("Temp HTML deleted:", htmlPath);
        });
      }, 100);
    }

  }
},

// ✅ רשימת היסטוריית מסב
async getMasavHistory(req, res) {
  try {
    const history = await MasavHistory.find()
      .select("-masavFileBase64 -pdfFileBase64")
      .sort({ generatedAt: -1 })
      .lean();

    res.json({ success: true, data: history });
  } catch (err) {
    console.error("Error fetching MASAV history:", err);
    saveLog({ type: 'error', message: `שגיאה בשליפת היסטוריית מסב — ${err.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req) });
    res.status(500).json({ error: err.message });
  }
},

// ✅ הורדת קובץ מסב מההיסטוריה
async downloadMasavHistory(req, res) {
  try {
    const { id } = req.params;
    const record = await MasavHistory.findById(id);

    if (!record) {
      return res.status(404).json({ error: "רשומת מסב לא נמצאה" });
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // שחזור הקבצים מ-base64
    if (record.masavFileBase64) {
      const txtBuffer = Buffer.from(record.masavFileBase64, "base64");
      const dateStr = record.fileName?.replace("זיכוייים ", "").replace(".zip", "") || "unknown";
      zip.file(`זיכוייים ${dateStr}.txt`, txtBuffer);
    }

    if (record.pdfFileBase64) {
      const pdfBuffer = Buffer.from(record.pdfFileBase64, "base64");
      const dateStr = record.fileName?.replace("זיכוייים ", "").replace(".zip", "") || "unknown";
      zip.file(`זיכוייים (סיכום) ${dateStr}.pdf`, pdfBuffer);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    const encodedFileName = encodeURIComponent(record.fileName || "masav.zip");
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
    });

    res.end(zipContent);
  } catch (err) {
    console.error("Error downloading MASAV history:", err);
    saveLog({ type: 'error', message: `שגיאה בהורדת מסב מהיסטוריה — ${err.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { recordId: req.params.id } });
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}
};
