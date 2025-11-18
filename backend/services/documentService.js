import PDFDocument from "pdfkit";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

export async function createDocumentsPDF(invoices, orders, files) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      let chunks = [];

      // אוסף את ה־Buffer
      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);

          // העלאה ל־Cloudinary
          const upload = await uploadBufferToCloudinary(
            pdfBuffer,
            `docs-${Date.now()}`
          );

          resolve(upload.secure_url);
        } catch (err) {
          reject(err);
        }
      });

      // ----- תוכן PDF -----
      doc.fontSize(22).text("דוח מסמכים מרוכז", { align: "center" });
      doc.moveDown();

      // חשבוניות
      doc.fontSize(16).text("חשבוניות", { underline: true });
      doc.moveDown();

      invoices.forEach((inv) => {
        doc.fontSize(12).text(
          `מספר: ${inv.invoiceNumber}
ספק: ${inv.supplier?.name || "-"}
פרויקט: ${inv.project?.name || "-"}
תאריך: ${new Date(inv.createdAt).toLocaleDateString()}
סכום: ${inv.total}
-----------------------------`
        );
        doc.moveDown(1);
      });

      doc.addPage();

      // הזמנות
      doc.fontSize(16).text("הזמנות", { underline: true });
      doc.moveDown();

      orders.forEach((order) => {
        doc.fontSize(12).text(
          `מספר: ${order.orderNumber}
ספק: ${order.supplier?.name || "-"}
פרויקט: ${order.project?.name || "-"}
תאריך: ${new Date(order.createdAt).toLocaleDateString()}
סכום: ${order.total}
-----------------------------`
        );
        doc.moveDown(1);
      });

      doc.addPage();

      // קבצים מצורפים
      doc.fontSize(16).text("קבצים מצורפים", { underline: true });
      doc.moveDown();

      files.forEach((f) => {
        doc.fontSize(12).text(
          `שם קובץ: ${f.name}
תאריך: ${new Date(f.createdAt).toLocaleDateString()}
-----------------------------`
        );
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

