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
  // -------------------------------
  //  יצירת תיקיית tmp אם לא קיימת
  // -------------------------------
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // -------------------------------
  //  טוען את קבצי התבנית
  // -------------------------------
  const templatePath = path.join(process.cwd(), "templates", "masav-report.html");
  const cssPath = path.join(process.cwd(), "templates", "masav-report.css");

  if (!fs.existsSync(templatePath)) {
    throw new Error("masav-report.html לא נמצא");
  }
  if (!fs.existsSync(cssPath)) {
    throw new Error("masav-report.css לא נמצא");
  }

  let html = fs.readFileSync(templatePath, "utf8");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  // -------------------------------
  //  בניית שורות הטבלה
  // -------------------------------
  const rowsHTML = payments
    .map((p, i) => {
      const amount = (p.amount / 100).toLocaleString("he-IL");
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${p.supplierName}</td>
          <td>${p.internalId}</td>
          <td>${p.bankName}</td>
          <td>${p.branchNumber}</td>
          <td>${p.accountNumber}</td>
          <td>${amount} ₪</td>
          <td>${p.invoiceNumbers || "-"}</td>
        </tr>
      `;
    })
    .join("");

  const totalAmount = (
    payments.reduce((sum, p) => sum + p.amount, 0) / 100
  ).toLocaleString("he-IL");

  const now = new Date().toLocaleString("he-IL");

  // -------------------------------
  //  החלפת כל ה־placeholders ב־HTML
  // -------------------------------
  html = html
    .replace("{{css}}", `<style>${cssContent}</style>`)
    .replace("{{companyName}}", companyInfo.companyName)
    .replace("{{instituteId}}", companyInfo.instituteId)
    .replace("{{senderId}}", companyInfo.senderId)
    .replace("{{executionDate}}", executionDate)
    .replace("{{generatedAt}}", now)
    .replace("{{rows}}", rowsHTML)
    .replace("{{total}}", totalAmount)
    .replace("{{count}}", payments.length)
    .replace("{{year}}", new Date().getFullYear());

  // -------------------------------
  //  שמירת ה־HTML הזמני
  // -------------------------------
  const tempHtmlPath = path.join(tmpDir, "masavReport.html");
  fs.writeFileSync(tempHtmlPath, html);

  // -------------------------------
  //  הפקת PDF (תומך Render ולוקאל)
  // -------------------------------
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("file://" + tempHtmlPath, {
    waitUntil: "networkidle0",
  });

  const outputPath = path.join(tmpDir, `masav-report-${Date.now()}.pdf`);

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  // -------------------------------
  //  ניקוי ה־HTML הזמני
  // -------------------------------
  try {
    fs.unlinkSync(tempHtmlPath);
    console.log("Temp HTML deleted:", tempHtmlPath);
  } catch (err) {
    console.log("Failed to delete temp HTML:", err.message);
  }

  return outputPath;
}
