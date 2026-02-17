import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export async function generateSalaryExportPDF({ salaries, projectName, isMultipleProjects = false }) {
  try {

    const templatePath = path.join(
      process.cwd(),
      "templates",
      "salary-export.html"
    );
    const cssPath = path.join(
      process.cwd(),
      "templates",
      "salary-export.css"
    );

    let html = fs.readFileSync(templatePath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");

    // Inject CSS
    html = html.replace("{{css}}", `<style>${css}</style>`);

    // Build rows - אם יש מספר פרויקטים, הוסף עמודת פרויקט
    const rowsHTML = salaries
      .map(
        (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.employeeName}</td>
          ${isMultipleProjects ? `<td>${s.projectId?.name || "-"}</td>` : ''}
          <td>${s.department || "-"}</td>
          <td>₪${Number(s.baseAmount || 0).toLocaleString("he-IL")}</td>
          <td>${s.overheadPercent || 0}%</td>
          <td>₪${Number(s.finalAmount || 0).toLocaleString("he-IL")}</td>
          <td>${new Date(s.date).toLocaleDateString("he-IL")}</td>
        </tr>
      `
      )
      .join("");

    const totalBase = salaries.reduce(
      (sum, s) => sum + Number(s.baseAmount || 0),
      0
    );
    const totalFinal = salaries.reduce(
      (sum, s) => sum + Number(s.finalAmount || 0),
      0
    );

    // עדכון כותרות הטבלה אם יש מספר פרויקטים
    if (isMultipleProjects) {
      html = html.replace(
        '<th>מחלקה</th>',
        '<th>פרויקט</th><th>מחלקה</th>'
      );
      html = html.replace(
        'colspan="3"',
        'colspan="4"'
      );
    }

    html = html
      .replace(/\{\{rows\}\}/g, rowsHTML)
      .replace(/\{\{projectName\}\}/g, projectName)
      .replace(/\{\{generatedAt\}\}/g, new Date().toLocaleString("he-IL"))
      .replace(/\{\{count\}\}/g, salaries.length)
      .replace(/\{\{totalBase\}\}/g, totalBase.toLocaleString("he-IL"))
      .replace(/\{\{totalFinal\}\}/g, totalFinal.toLocaleString("he-IL"))
      .replace(/\{\{year\}\}/g, new Date().getFullYear())
      .replace(/\{\{css\}\}/g, '');

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

    const pdfPath = path.join(tmpDir, `salary-export-${Date.now()}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfPath;
  } catch (error) {
    console.error("❌ Error in generateSalaryExportPDF:", error);
    throw error;
  }
}
