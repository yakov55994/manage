// =======================================
// MASAV CONTROLLER
// =======================================

import path from "path";
import { generateMasavPDF } from "../services/masavPdfService.js";
import { generateMasavFile, validatePayments } from "../services/masavService.js";
import fs from "fs";
export default {
async generateMasav(req, res) {
  let pdfPath = null;
  let htmlPath = path.join(process.cwd(), "tmp", "masavReport.html");

  try {
    const { payments, companyInfo, executionDate } = req.body;

    const txt = generateMasavFile(companyInfo, payments, executionDate);

    pdfPath = await generateMasavPDF({
      payments,
      companyInfo,
      executionDate
    });

    const pdfBuffer = fs.readFileSync(pdfPath);

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    zip.file("masav.txt", txt);
    zip.file("masav-summary.pdf", pdfBuffer);

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=masav_bundle.zip",
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
