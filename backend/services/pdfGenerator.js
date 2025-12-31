import fs from "fs";
import path from "path";
import pdf from "html-pdf-node";
import banksData from "../path/to/banks_and_branches.json" assert { type: "json" };


export async function generateMasavPDF({ payments, companyInfo, executionDate }) {

  const templatePath = path.join(process.cwd(), "templates", "masav-report.html");
  const cssPath = path.join(process.cwd(), "templates", "masav-report.css");
  const tmpDir = path.join(process.cwd(), "tmp");

  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const tempHtmlPath = path.join(tmpDir, "masavReport.html");

  // --- Load HTML & CSS ---
  let html = fs.readFileSync(templatePath, "utf8");
  let css = fs.readFileSync(cssPath, "utf8");

  // --- Embed CSS inline ---
  const cssBlock = `<style>${css}</style>`;
  html = html.replace("{{css}}", cssBlock);


  function getBankCode(bankInput) {
    if (!bankInput) return "";

    const input = bankInput.toString().trim();

    // ✔ אם זה מספר בנק (כמו "22")
    if (/^\d+$/.test(input)) {
      return input.padStart(2, "0");
    }

    // ✔ אם זה שם בנק
    const bank = banksData.find(
      b => b.bankName.toLowerCase().trim() === input.toLowerCase()
    );

    return bank ? bank.bankCode : "";
  }

  // --- Build rows ---
  const rowsHTML = payments
    .map((p, i) => {

      const amount = (p.amount / 100).toLocaleString("he-IL");

      const bankCode = getBankCode(p.bankNumber);
      const branchCode = p.branchNumber?.toString().padStart(3, "0") || "";


      return `
        <tr>
          <td>${i + 1}</td>
          <td>${p.supplierName}</td>
          <td>${p.internalId}</td>
          <td>${bankCode}</td>
          <td>${branchCode}</td>
          <td>${p.accountNumber}</td>
          <td>${amount} ₪</td>
          <td>${p.invoiceNumbers || "-"}</td>
        </tr>`;
    })
    .join("");

  const totalAmount = (
    payments.reduce((sum, p) => sum + p.amount, 0) / 100
  ).toLocaleString("he-IL");

  const now = new Date().toLocaleString("he-IL");

  // --- Replace placeholders ---
  html = html
    .replace("{{companyName}}", companyInfo.companyName)
    .replace("{{instituteId}}", companyInfo.instituteId)
    .replace("{{senderId}}", companyInfo.senderId)
    .replace("{{executionDate}}", executionDate)
    .replace("{{generatedAt}}", now)
    .replace("{{rows}}", rowsHTML)
    .replace("{{total}}", totalAmount)
    .replace("{{count}}", payments.length)
    .replace("{{year}}", new Date().getFullYear());

  fs.writeFileSync(tempHtmlPath, html);

  // --- Generate PDF ---
  const file = { content: html };

  const pdfBuffer = await pdf.generatePdf(file, {
    format: "A4",
    printBackground: true
  });

  const pdfPath = path.join(tmpDir, `masav-report-${Date.now()}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);


  try {
    fs.unlinkSync(tempHtmlPath);
  } catch { }

  return pdfPath;
}
