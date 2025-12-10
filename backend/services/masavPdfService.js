// import fs from "fs";
// import path from "path";
// import puppeteer from "puppeteer-core";

// export async function generateMasavPDF({ payments, companyInfo, executionDate }) {
//   const templatePath = path.join(process.cwd(), "templates", "masav-report.html");
//   const cssPath = path.join(process.cwd(), "templates", "masav-report.css");

//   // טוען את ה-HTML
//   let html = fs.readFileSync(templatePath, "utf8");

//   // מייצר שורות טבלה
//   const rowsHTML = payments
//     .map((p, i) => {
//       const amount = (p.amount / 100).toLocaleString("he-IL");
//       return `
//         <tr>
//           <td>${i + 1}</td>
//           <td>${p.supplierName}</td>
//           <td>${p.internalId}</td>
//           <td>${p.bankName}</td>
//           <td>${p.branchNumber}</td>
//           <td>${p.accountNumber}</td>
//           <td>${amount} ₪</td>
//           <td>${p.invoiceNumbers || "-"}</td>
//         </tr>
//       `;
//     })
//     .join("");

//   // סכום כולל
//   const totalAmount = (
//     payments.reduce((sum, p) => sum + p.amount, 0) / 100
//   ).toLocaleString("he-IL");

//   const now = new Date().toLocaleString("he-IL");

//   // ⭐️ מחליפים גם את cssPath בתוך ה־HTML
//   html = html
//     .replace("{{cssPath}}", cssPath.replace(/\\/g, "/"))
//     .replace("{{companyName}}", companyInfo.companyName)
//     .replace("{{instituteId}}", companyInfo.instituteId)
//     .replace("{{senderId}}", companyInfo.senderId)
//     .replace("{{executionDate}}", executionDate)
//     .replace("{{generatedAt}}", now)
//     .replace("{{rows}}", rowsHTML)
//     .replace("{{total}}", totalAmount)
//     .replace("{{count}}", payments.length)
//     .replace("{{year}}", new Date().getFullYear());

//   // שומר HTML זמני
//   const tempHtmlPath = path.join(process.cwd(), "tmp", "masavReport.html");
//   fs.writeFileSync(tempHtmlPath, html);

//   // מפעיל Chrome מותקן
//   const browser = await puppeteer.launch({
//     headless: "new",
//     executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });

//   const page = await browser.newPage();
//   await page.goto("file://" + tempHtmlPath, { waitUntil: "networkidle0" });

//   const outputPath = path.join(process.cwd(), "tmp", `masav-report-${Date.now()}.pdf`);

//   await page.pdf({
//     path: outputPath,
//     format: "A4",
//     printBackground: true,
//   });

//   await browser.close();

//   return outputPath;
// }

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function generateMasavPDF({ payments, companyInfo, executionDate }) {
  console.log("🔥🔥 THIS IS THE REAL generateMasavPDF FILE 🔥🔥");
  console.log("🔥 PAYMENTS IN FUNCTION:", payments);
  console.log("🔥 FIRST PAYMENT:", payments?.[0]);
  console.log("📄 MASAV PDF STARTED");

  // ---------------------------
  // TMP FOLDER CHECK
  // ---------------------------
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    console.log("📁 tmp folder missing → creating…");
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const templatePath = path.join(process.cwd(), "templates", "masav-report.html");
  const cssPath = path.join(process.cwd(), "templates", "masav-report.css");

  // ---------------------------
  // LOAD HTML TEMPLATE
  // ---------------------------
  if (!fs.existsSync(templatePath)) {
    console.error("❌ ERROR: masav-report.html not found!", templatePath);
    throw new Error("Missing masav-report.html");
  }
  console.log("📄 HTML template loaded:", templatePath);

  let html;
  try {
    html = fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    console.error("❌ ERROR reading HTML:", err);
    throw err;
  }

  // ---------------------------
  // LOAD CSS
  // ---------------------------
  if (!fs.existsSync(cssPath)) {
    console.error("❌ ERROR: masav-report.css not found!", cssPath);
    throw new Error("Missing masav-report.css");
  }
  console.log("🎨 CSS loaded:", cssPath);

  let css;
  try {
    css = fs.readFileSync(cssPath, "utf8");
  } catch (err) {
    console.error("❌ ERROR reading CSS:", err);
    throw err;
  }

  // ---------------------------
  // BUILD ROWS
  // ---------------------------
  console.log(`📊 Building ${payments.length} table rows…`);
  const rowsHTML = payments
    .map((p, i) => {
      const amount = (p.amount / 100).toLocaleString("he-IL");
      const bankCode = p.bankNumber?.toString().padStart(2, "0") || "";
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
  </tr>
      `;
    })
    .join("");

  console.log("📊 Rows built successfully.");

  const totalAmount = (
    payments.reduce((sum, p) => sum + p.amount, 0) / 100
  ).toLocaleString("he-IL");

  // ---------------------------
  // INJECT DATA INTO HTML
  // ---------------------------
  try {
    html = html
      .replace("{{css}}", `<style>${css}</style>`)
      .replace("{{companyName}}", companyInfo.companyName)
      .replace("{{instituteId}}", companyInfo.instituteId)
      .replace("{{senderId}}", companyInfo.senderId)
      .replace("{{executionDate}}", executionDate)
      .replace("{{generatedAt}}", new Date().toLocaleString("he-IL"))
      .replace("{{rows}}", rowsHTML)
      .replace("{{total}}", totalAmount)
      .replace("{{count}}", payments.length)
      .replace("{{year}}", new Date().getFullYear());
  } catch (err) {
    console.error("❌ ERROR injecting HTML placeholders:", err);
    throw err;
  }

  // ---------------------------
  // SAVE TEMP HTML
  // ---------------------------
  const htmlFile = path.join(tmpDir, "masavReport.html");
  try {
    fs.writeFileSync(htmlFile, html);
  } catch (err) {
    console.error("❌ ERROR saving temp HTML:", err);
    throw err;
  }
  console.log("📄 Temporary HTML saved:", htmlFile);

  // ---------------------------
  // LAUNCH PUPPETEER
  // ---------------------------
  console.log("🧪 Launching Puppeteer…");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    console.error("❌ PUPPETEER LAUNCH ERROR:", err);
    throw err;
  }

  console.log("🟢 Puppeteer launched successfully.");

  // ---------------------------
  // CREATE PDF
  // ---------------------------
  const pdfFile = path.join(tmpDir, `masav-${Date.now()}.pdf`);

  try {
    const page = await browser.newPage();
    await page.goto("file://" + htmlFile, { waitUntil: "networkidle0" });

    await page.pdf({
      path: pdfFile,
      format: "A4",
      printBackground: true,
    });
  } catch (err) {
    console.error("❌ ERROR DURING PDF GENERATION:", err);
    throw err;
  }

  await browser.close();
  console.log("📌 PDF created:", pdfFile);

  // ---------------------------
  // DELETE TEMP HTML
  // ---------------------------
  try {
    fs.unlinkSync(htmlFile);
    console.log("🗑 Deleted temp HTML:", htmlFile);
  } catch (err) {
    console.error("⚠ Could not delete temp HTML:", err.message);
  }

  console.log("✅ MASAV PDF DONE");
  return pdfFile;
}
