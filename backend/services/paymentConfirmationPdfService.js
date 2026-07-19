import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function generatePaymentConfirmationPDF({
  invoiceNumber,
  supplierName,
  detail,
  documentType,
  paymentMethodText,
  paymentDate,
  amount,
  bankName,
  branchNumber,
  accountNumber,
}) {
  try {
    const templatePath = path.join(
      process.cwd(),
      "templates",
      "payment-confirmation.html"
    );
    const cssPath = path.join(
      process.cwd(),
      "templates",
      "payment-confirmation.css"
    );

    let html = fs.readFileSync(templatePath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");

    // Inject CSS
    html = html.replace("{{css}}", `<style>${css}</style>`);

    html = html
      .replace(/\{\{invoiceNumber\}\}/g, invoiceNumber || "-")
      .replace(/\{\{supplierName\}\}/g, supplierName || "-")
      .replace(/\{\{detail\}\}/g, detail || "-")
      .replace(/\{\{documentType\}\}/g, documentType || "-")
      .replace(/\{\{paymentMethodText\}\}/g, paymentMethodText || "-")
      .replace(
        /\{\{paymentDate\}\}/g,
        paymentDate ? new Date(paymentDate).toLocaleDateString("he-IL") : "-"
      )
      .replace(/\{\{amount\}\}/g, Number(amount || 0).toLocaleString("he-IL"))
      .replace(/\{\{bankName\}\}/g, bankName || "-")
      .replace(/\{\{branchNumber\}\}/g, branchNumber || "-")
      .replace(/\{\{accountNumber\}\}/g, accountNumber || "-")
      .replace(/\{\{generatedAt\}\}/g, new Date().toLocaleString("he-IL"))
      .replace(/\{\{year\}\}/g, new Date().getFullYear())
      .replace(/\{\{css\}\}/g, "");

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const pdfPath = path.join(
      tmpDir,
      `payment-confirmation-${Date.now()}.pdf`
    );
    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfPath;
  } catch (error) {
    console.error("Error in generatePaymentConfirmationPDF:", error);
    throw error;
  }
}
