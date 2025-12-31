// =======================================
// MASAV CONTROLLER
// =======================================

import path from "path";
import { generateMasavPDF } from "../services/masavPdfService.js";
import { generateMasavFile, validatePayments } from "../services/masavService.js";
import fs from "fs";

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
    const { payments, companyInfo, executionDate } = req.body;

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
        // צבירת סכומים
        existing.amount += payment.amount;
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

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    zip.file(`זיכוייים ${formattedDate}.txt`, txt);
    zip.file(`זיכוייים (סיכום) ${formattedDate}.pdf`, pdfBuffer);

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

<<<<<<< Updated upstream
    // קידוד שם הקובץ ל-UTF-8 עבור HTTP header
    const fileName = `זיכוייים ${formattedDate}.zip`;
=======
    // קידוד UTF-8 לשם הקובץ בעברית
    const fileName = `זיכויים_${dateStr}.zip`;
>>>>>>> Stashed changes
    const encodedFileName = encodeURIComponent(fileName);

    res.writeHead(200, {
      "Content-Type": "application/zip",
<<<<<<< Updated upstream
      "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
=======
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
>>>>>>> Stashed changes
    });

    res.end(zipContent);

  } catch (err) {
    console.error("MASAV ERROR:", err);
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
}
};
