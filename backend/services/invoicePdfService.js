import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function generateInvoiceExportPDF({ invoices, projectName }) {
  try {
    const templatePath = path.join(
      process.cwd(),
      "templates",
      "invoice-export.html"
    );
    const cssPath = path.join(
      process.cwd(),
      "templates",
      "invoice-export.css"
    );

    let html = fs.readFileSync(templatePath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");

    // Inject CSS
    html = html.replace("{{css}}", `<style>${css}</style>`);

    // Build rows
    const rowsHTML = invoices
      .map(
        (inv, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${inv.invoiceNumber || "-"}</td>
          <td>${inv.supplierName || "-"}</td>
          <td>${inv.documentType || "-"}</td>
          <td>₪${Number(inv.amount || 0).toLocaleString("he-IL")}</td>
          <td>${inv.paid || "-"}</td>
          <td>${inv.date ? new Date(inv.date).toLocaleDateString("he-IL") : "-"}</td>
          <td>${inv.detail || ""}</td>
        </tr>
      `
      )
      .join("");

    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.amount || 0),
      0
    );

    html = html
      .replace(/\{\{rows\}\}/g, rowsHTML)
      .replace(/\{\{projectName\}\}/g, projectName)
      .replace(/\{\{generatedAt\}\}/g, new Date().toLocaleString("he-IL"))
      .replace(/\{\{count\}\}/g, invoices.length)
      .replace(/\{\{totalAmount\}\}/g, totalAmount.toLocaleString("he-IL"))
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
      landscape: true,
      printBackground: true,
    });

    await browser.close();

    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const pdfPath = path.join(tmpDir, `invoice-export-${Date.now()}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfPath;
  } catch (error) {
    console.error("Error in generateInvoiceExportPDF:", error);
    throw error;
  }
}
