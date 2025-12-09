// =======================================
// MASAV CONTROLLER
// =======================================

import { generateCreditFile } from "../services/masavService.js";

export default {
  // Generate Masav file
  async generateMasav(req, res) {
    try {
      console.log("MASAV Request Body:", req.body);

      const { companyInfo, payments, executionDate } = req.body;
  async generateMasav(req, res) {
        try {
          console.log("🟦 BODY RECEIVED:", req.body);
          console.log("🟪 payments:", req.body.payments);
          console.log("🟩 type:", typeof req.body.payments);

          const { payments, companyInfo, executionDate } = req.body;

          const fileContent = generateCreditFile(companyInfo, payments, executionDate);

          if (!payments || payments.length === 0) {
            return res.status(400).json({ error: "אין תשלומים" });
          }

          res.setHeader("Content-Type", "text/plain; charset=windows-1255");
          res.setHeader("Content-Disposition", 'attachment; filename="masav.txt"');
          res.send(fileContent);
        } catch (err) {
          console.error("MASAV ERROR:", err);
          res.status(500).json({ error: err.message || "שגיאה ביצירת קובץ" });
        }
      }

    }
 }

}