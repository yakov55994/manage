import fs from "fs";
import path from "path";
import pdf from "html-pdf-node";

export async function generateMasavPDF({ payments, companyInfo, executionDate }) {

  const templatePath = path.join(process.cwd(), "templates", "masav-report.html");
  const cssPath = path.join(process.cwd(), "templates", "masav-report.css");

  let html = fs.readFileSync(templatePath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  // 🚨 מחליפים את {{css}} בתוכן CSS
  html = html.replace("{{css}}", `<style>${css}</style>`);

  // יצירת שורות טבלה
  const rowsHTML = payments
    .map(
      (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.supplierName}</td>
          <td>${p.internalId}</td>
          <td>${p.bankNumber}</td>
          <td>${p.branchNumber}</td>
          <td>${p.accountNumber}</td>
          <td>${(p.amount / 100).toLocaleString("he-IL")}</td>
          <td>${p.invoiceNumbers || "-"}</td>
          <td>${p.projectNames || "-"}</td>
        </tr>`
    )
    .join("");

  // 🚨 מחליפים {{rows}}
  html = html.replace("{{rows}}", rowsHTML);

  // 🚨 מחליפים כל המשתנים
  html = html
    .replace("{{companyName}}", companyInfo.companyName)
    .replace("{{instituteId}}", companyInfo.instituteId)
    .replace("{{senderId}}", companyInfo.senderId)
    .replace("{{executionDate}}", executionDate)
    .replace("{{generatedAt}}", new Date().toLocaleString("he-IL"))
    .replace("{{count}}", payments.length)
    .replace(
      "{{total}}",
      (payments.reduce((a, p) => a + p.amount, 0) / 100).toLocaleString("he-IL")
    )
    .replace("{{year}}", new Date().getFullYear());

  const file = { content: html };

  const pdfBuffer = await pdf.generatePdf(file, {
    format: "A4",
    printBackground: true,
  });

  // שמירה
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const pdfPath = path.join(tmpDir, `masav-summary-${Date.now()}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);

  return pdfPath;
}

