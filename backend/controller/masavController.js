// =======================================
// MASAV CONTROLLER
// =======================================

import { generateMasavFile, validatePayments } from "../services/masavService.js";

export default {
  async generateMasav(req, res) {
    try {
      const { payments, companyInfo, executionDate } = req.body;

      const errors = validatePayments(payments);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const fileContent = generateMasavFile(companyInfo, payments, executionDate);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=masav.txt");
      return res.send(fileContent);

    } catch (err) {
      console.error("❌ MASAV ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "שגיאה בעת הפקת קובץ מס\"ב",
        error: err.message,
      });
    }
  }
};
