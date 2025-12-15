import fs from "fs";
import path from "path";
import pdf from "html-pdf-node";

export async function generateSalaryExportPDF({ salaries, projectName }) {
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

  // Build rows
  const rowsHTML = salaries
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.employeeName}</td>
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

  html = html
    .replace("{{rows}}", rowsHTML)
    .replace("{{projectName}}", projectName)
    .replace("{{generatedAt}}", new Date().toLocaleString("he-IL"))
    .replace("{{count}}", salaries.length)
    .replace("{{totalBase}}", totalBase.toLocaleString("he-IL"))
    .replace("{{totalFinal}}", totalFinal.toLocaleString("he-IL"))
    .replace("{{year}}", new Date().getFullYear());

  const file = { content: html };

  const pdfBuffer = await pdf.generatePdf(file, {
    format: "A4",
    printBackground: true,
  });

  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const pdfPath = path.join(tmpDir, `salary-export-${Date.now()}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);

  return pdfPath;
}
