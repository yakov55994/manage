// ===============================================
// SUBMISSION CONTROLLERS - ניהול הגשת חשבוניות
// ===============================================

import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import xlsx from "xlsx";
import PDFDocument from "pdfkit";
import https from "https";
import http from "http";

// Helper to reverse Hebrew text for PDFKit (Visual RTL)
const formatHebrew = (text) => {
  if (!text) return "";
  text = String(text);
  if (/[\u0590-\u05FF]/.test(text)) {
    return text.split("").reverse().join("");
  }
  return text;
};

const submissionControllers = {
  // ===============================================
  // קבלת כל החשבוניות שהוגשו מכל הפרויקטים
  // ===============================================
  async getAllSubmissionInvoices(req, res) {
    try {
      // מצא חשבוניות שהוגשו
      const invoices = await Invoice.find({
        status: "הוגש"
      })
        .populate("supplierId", "name")
        .populate("projects.projectId", "name")
        .populate("submittedToProjectId", "name")
        .sort({ submittedAt: -1, createdAt: -1 });

      res.json({ success: true, data: invoices });
    } catch (err) {
      console.error("GET ALL SUBMISSION INVOICES ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // קבלת חשבוניות שהוגשו לפרויקט
  // ===============================================
  async getSubmissionInvoices(req, res) {
    try {
      const { projectId } = req.params;

      // בדוק שהפרויקט קיים
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, error: "פרויקט לא נמצא" });
      }

      // מצא חשבוניות שהוגשו לפרויקט זה
      const invoices = await Invoice.find({
        submittedToProjectId: projectId,
        status: "הוגש"
      })
        .populate("supplierId", "name")
        .populate("projects.projectId", "name")
        .populate("submittedToProjectId", "name")
        .sort({ submittedAt: -1, createdAt: -1 });

      res.json({ success: true, data: invoices });
    } catch (err) {
      console.error("GET SUBMISSION INVOICES ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // הורדת Excel עם פרטי חשבוניות
  // ===============================================
  async downloadExcel(req, res) {
    try {
      const { projectId } = req.params;

      // בדוק שהפרויקט קיים
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, error: "פרויקט לא נמצא" });
      }

      // מצא חשבוניות שהוגשו לפרויקט זה
      const invoices = await Invoice.find({
        submittedToProjectId: projectId,
        status: "הוגש"
      })
        .populate("supplierId", "name")
        .populate("projects.projectId", "name")
        .sort({ submittedAt: -1, createdAt: -1 });

      // הכן נתונים לאקסל - רק השדות: מספר, תאריך, שם, סכום
      const excelData = invoices.map((inv) => {
        return {
          "מספר חשבונית": inv.invoiceNumber,
          "תאריך": inv.createdAt
            ? new Date(inv.createdAt).toLocaleDateString("he-IL")
            : "",
          "שם": inv.supplierId?.name || inv.invitingName || "",
          "סכום": inv.totalAmount.toLocaleString(),
        };
      });

      // צור workbook
      const ws = xlsx.utils.json_to_sheet(excelData);

      // הגדר רוחב עמודות
      ws["!cols"] = [
        { wch: 15 }, // מספר חשבונית
        { wch: 12 }, // תאריך
        { wch: 30 }, // שם
        { wch: 15 }, // סכום
      ];

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "חשבוניות שהוגשו");

      // המר ל-buffer
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      // שלח את הקובץ
      const date = new Date().toISOString().split("T")[0];
      const filename = `submitted_invoices_${date}.xlsx`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
    } catch (err) {
      console.error("DOWNLOAD EXCEL ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // הורדת PDF עם כל המסמכים
  // ===============================================
  async downloadPDF(req, res) {
    try {
      const { projectId } = req.params;

      // בדוק שהפרויקט קיים
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, error: "פרויקט לא נמצא" });
      }

      // מצא חשבוניות שהוגשו לפרויקט זה
      const invoices = await Invoice.find({
        submittedToProjectId: projectId,
        status: "הוגש"
      })
        .populate("supplierId", "name")
        .populate("projects.projectId", "name")
        .sort({ submittedAt: -1, createdAt: -1 });

      // יצירת PDF
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      // נסיון טעינת פונט עברי (Windows)
      try {
        doc.font("C:\\Windows\\Fonts\\arial.ttf");
      } catch (e) {
        console.warn("Hebrew font not found, using default.");
      }

      // הגדר headers
      const date = new Date().toISOString().split("T")[0];
      const pdfFilename = `submitted_invoices_${date}.pdf`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdfFilename}"`
      );
      res.setHeader("Content-Type", "application/pdf");

      // pipe הפלט ל-response
      doc.pipe(res);

      // Header
      doc.fontSize(20).text(formatHebrew(`חשבוניות שהוגשו - ${project.name}`), {
        align: "center",
      });
      doc.fontSize(12).text(formatHebrew(`תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}`), {
        align: "center",
      });
      doc.moveDown(2);

      // Table Header
      const tableTop = doc.y;
      doc.fillColor("#f0f0f0").rect(50, tableTop, 500, 20).fill(); // Header background
      doc.fillColor("black");

      doc.fontSize(10);
      let y = tableTop + 5;
      
      doc.text(formatHebrew("מס' חשבונית"), 50, y, { width: 80, align: 'right' });
      doc.text(formatHebrew("תאריך"), 140, y, { width: 70, align: 'right' });
      doc.text(formatHebrew("שם ספק"), 220, y, { width: 120, align: 'right' });
      doc.text(formatHebrew("סכום"), 350, y, { width: 70, align: 'right' });
      doc.text(formatHebrew("קבצים"), 430, y, { width: 100, align: 'right' });

      y += 20; // Move past header
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#aaaaaa").stroke(); // Line below header

      // Table Rows
      for (const inv of invoices) {
        // y is already set

        // Check if we need a new page
        if (y > 750) {
          doc.addPage();
          y = 50; // Reset y
        }

        const rowHeight = Math.max(20, (inv.files?.length || 1) * 15);
        
        doc.fontSize(9);
        doc.text(inv.invoiceNumber || "", 50, y + 5, { width: 80, align: 'right' });
        doc.text(
          inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("he-IL") : "",
          140,
          y + 5,
          { width: 70, align: 'right' }
        );
        doc.text(formatHebrew(inv.supplierId?.name || inv.invitingName || ""), 220, y + 5, {
          width: 120,
          align: 'right'
        });
        doc.text(`${inv.totalAmount.toLocaleString()}`, 350, y + 5, { width: 70, align: 'right' });

        // Files as links
        if (inv.files && inv.files.length > 0) {
          let fileY = y + 5;
          inv.files.forEach((file, idx) => {
            doc
              .fillColor("blue")
              .text(formatHebrew(`קובץ ${idx + 1}`), 430, fileY, {
                width: 100,
                link: file.url,
                underline: true,
                align: 'right'
              });
            fileY += 15;
          });
          doc.fillColor("black");
        } else {
          doc.text("-", 430, y + 5, { width: 100, align: 'right' });
        }

        // Grid line below row
        doc.moveTo(50, y + rowHeight).lineTo(550, y + rowHeight).strokeColor("#e0e0e0").stroke();
        doc.strokeColor("black"); // Reset
        
        y += rowHeight; // Move down manually
        doc.y = y; // Sync doc.y
      }

      // Total
      doc.moveDown();
      doc.fontSize(12);
      doc.text(
        formatHebrew(`סה"כ חשבוניות: ${invoices.length}`), 
        50, 
        doc.y + 10,
        { align: 'right', width: 500 }
      );
      doc.text(
        formatHebrew(`סה"כ לתשלום: `) + `${invoices
          .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
          .toLocaleString()}`,
        { align: "right", width: 500 }
      );

      // סיים את המסמך
      doc.end();
    } catch (err) {
      console.error("DOWNLOAD PDF ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  },

  // ===============================================
  // הורדת Excel של כל החשבוניות שהוגשו
  // ===============================================
  async downloadAllExcel(req, res) {
    try {
      // מצא חשבוניות שהוגשו
      const invoices = await Invoice.find({
        status: "הוגש"
      })
        .populate("supplierId", "name")
        .populate("projects.projectId", "name")
        .populate("submittedToProjectId", "name")
        .sort({ submittedAt: -1, createdAt: -1 });

      // הכן נתונים לאקסל
      const excelData = invoices.map((inv) => {
        return {
          "מספר חשבונית": inv.invoiceNumber,
          "תאריך": inv.createdAt
            ? new Date(inv.createdAt).toLocaleDateString("he-IL")
            : "",
          "שם": inv.supplierId?.name || inv.invitingName || "",
          "סכום": inv.totalAmount.toLocaleString(),
          "הוגש לפרויקט": inv.submittedToProjectId?.name || "",
          "תאריך הגשה": inv.submittedAt
            ? new Date(inv.submittedAt).toLocaleDateString("he-IL")
            : "",
        };
      });

      // צור workbook
      const ws = xlsx.utils.json_to_sheet(excelData);

      // הגדר רוחב עמודות
      ws["!cols"] = [
        { wch: 15 }, // מספר חשבונית
        { wch: 12 }, // תאריך
        { wch: 30 }, // שם
        { wch: 15 }, // סכום
        { wch: 25 }, // הוגש לפרויקט
        { wch: 15 }, // תאריך הגשה
      ];

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "כל החשבוניות שהוגשו");

      // המר ל-buffer
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      // שלח את הקובץ
      const date = new Date().toISOString().split("T")[0];
      const filename = `all_submitted_invoices_${date}.xlsx`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
    } catch (err) {
      console.error("DOWNLOAD ALL EXCEL ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // הורדת PDF של כל החשבוניות שהוגשו (כמו מסב"ה)
  // ===============================================
  async downloadAllPDF(req, res) {
    try {
      // מצא חשבוניות שהוגשו
      const invoices = await Invoice.find({
        status: "הוגש"
      })
        .populate("supplierId", "name")
        .populate("projects.projectId", "name")
        .populate("submittedToProjectId", "name")
        .sort({ submittedAt: -1, createdAt: -1 });

      // יצירת PDF
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      // נסיון טעינת פונט עברי (Windows)
      try {
        doc.font("C:\\Windows\\Fonts\\arial.ttf");
      } catch (e) {
        console.warn("Hebrew font not found, using default.");
      }

      // הגדר headers
      const date = new Date().toISOString().split("T")[0];
      const pdfFilename = `all_submitted_invoices_${date}.pdf`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdfFilename}"`
      );
      res.setHeader("Content-Type", "application/pdf");

      // pipe הפלט ל-response
      doc.pipe(res);

      // Header - Similar to Masave format
      doc.fontSize(20).text(formatHebrew("ריכוז חשבוניות שהוגשו"), {
        align: "center",
      });
      doc.fontSize(12).text(formatHebrew(`תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}`), {
        align: "center",
      });
      doc.moveDown(2);

      // Table Header
      const tableTop = doc.y;
      doc.fillColor("#f0f0f0").rect(50, tableTop, 500, 20).fill(); // Header background
      doc.fillColor("black");

      doc.fontSize(10);
      let y = tableTop + 5;
      
      doc.text(formatHebrew("מס' חשבונית"), 50, y, { width: 60, align: 'right' });
      doc.text(formatHebrew("תאריך"), 110, y, { width: 60, align: 'right' });
      doc.text(formatHebrew("שם ספק"), 170, y, { width: 100, align: 'right' });
      doc.text(formatHebrew("סכום"), 280, y, { width: 60, align: 'right' });
      doc.text(formatHebrew("פרויקט"), 350, y, { width: 100, align: 'right' });
      doc.text(formatHebrew("הוגש"), 460, y, { width: 80, align: 'right' });

      y += 20;
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#aaaaaa").stroke();

      // Table Rows
      for (const inv of invoices) {
        // y is set

        // Check if we need a new page
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(8);
        doc.text(inv.invoiceNumber || "", 50, y + 5, { width: 60, align: 'right' });
        doc.text(
          inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("he-IL") : "",
          110,
          y + 5,
          { width: 60, align: 'right' }
        );
        doc.text(formatHebrew(inv.supplierId?.name || inv.invitingName || ""), 170, y + 5, {
          width: 100,
          align: 'right'
        });
        doc.text(`${inv.totalAmount.toLocaleString()}`, 280, y + 5, { width: 60, align: 'right' });
        doc.text(formatHebrew(inv.submittedToProjectId?.name || ""), 350, y + 5, { width: 100, align: 'right' });
        doc.text(
          inv.submittedAt ? new Date(inv.submittedAt).toLocaleDateString("he-IL") : "",
          460,
          y + 5,
          { width: 80, align: 'right' }
        );

        // Grid line
        doc.moveTo(50, y + 20).lineTo(550, y + 20).strokeColor("#e0e0e0").stroke();
        doc.strokeColor("black");
        
        y += 20;
        doc.y = y;
      }

      // Total
      doc.moveDown();
      doc.fontSize(12);
      doc.text(
        formatHebrew(`סה"כ חשבוניות: ${invoices.length}`), 
        50, 
        doc.y + 10,
        { align: 'right', width: 500 }
      );
      doc.text(
        formatHebrew(`סה"כ לתשלום: `) + `${invoices
          .reduce((sum, inv) => sum + inv.totalAmount, 0)
          .toLocaleString()}`,
        { align: "right", width: 500 }
      );

      // סיים את המסמך
      doc.end();
    } catch (err) {
      console.error("DOWNLOAD ALL PDF ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  },
};

export default submissionControllers;
