import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

export async function generateMasavPDF({ payments, companyInfo, executionDate }) {
  return new Promise((resolve, reject) => {
    try {
      // יצירת PDF עם PDFKit (ללא Puppeteer)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40
      });

      // שמירה
      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const pdfPath = path.join(tmpDir, `masav-summary-${Date.now()}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // כותרת
      doc.fontSize(20).text('דוח סיכום מס"ב', { align: 'center' });
      doc.moveDown();

      // פרטי חברה
      doc.fontSize(12);
      doc.text(`שם חברה: ${companyInfo.companyName}`);
      doc.text(`מספר מוסד: ${companyInfo.instituteId}`);
      doc.text(`מספר שולח: ${companyInfo.senderId}`);
      doc.text(`תאריך ביצוע: ${executionDate}`);
      doc.text(`תאריך יצירה: ${new Date().toLocaleString("he-IL")}`);
      doc.moveDown();

      // כותרות טבלה
      doc.fontSize(10).fillColor('#2980b9');
      const startY = doc.y;
      const colWidths = [30, 120, 70, 40, 40, 70, 80, 100, 180];
      const headers = ['#', 'שם ספק', 'ת.ז/ע.מ', 'בנק', 'סניף', 'חשבון', 'סכום', 'חשבוניות', 'פרויקטים'];

      let x = 40;
      headers.forEach((header, i) => {
        doc.text(header, x, startY, { width: colWidths[i], align: 'center' });
        x += colWidths[i];
      });

      doc.moveDown();
      doc.strokeColor('#2980b9').lineWidth(1)
         .moveTo(40, doc.y).lineTo(800, doc.y).stroke();
      doc.moveDown(0.5);

      // שורות טבלה
      doc.fontSize(9).fillColor('black');
      payments.forEach((p, i) => {
        const rowY = doc.y;

        // בדיקה אם צריך עמוד חדש
        if (rowY > 500) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        }

        const rowData = [
          String(i + 1),
          p.supplierName || '',
          p.internalId || '',
          p.bankNumber || '',
          p.branchNumber || '',
          p.accountNumber || '',
          (p.amount / 100).toLocaleString("he-IL") + ' ₪',
          p.invoiceNumbers || '-',
          p.projectNames || '-'
        ];

        x = 40;
        rowData.forEach((data, j) => {
          doc.text(data, x, rowY, { width: colWidths[j], align: 'center' });
          x += colWidths[j];
        });

        doc.moveDown(0.8);

        // קו מפריד
        if (i % 2 === 0) {
          doc.fillColor('#f5f5f5')
             .rect(40, rowY - 5, 760, 20)
             .fill();
          doc.fillColor('black');
        }
      });

      doc.moveDown();
      doc.strokeColor('black').lineWidth(2)
         .moveTo(40, doc.y).lineTo(800, doc.y).stroke();
      doc.moveDown();

      // סיכום
      const totalAmount = payments.reduce((a, p) => a + p.amount, 0) / 100;
      doc.fontSize(12).fillColor('black');
      doc.text(`סה"כ תשלומים: ${payments.length}`, 40, doc.y);
      doc.text(`סה"כ סכום: ${totalAmount.toLocaleString("he-IL")} ₪`, 40, doc.y, { align: 'right' });

      // סיום
      doc.end();

      stream.on('finish', () => {
        resolve(pdfPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
}

