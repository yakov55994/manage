// =======================================
// MASAV CONTROLLER
// =======================================

import { generateCreditFile, validatePayments } from "../services/masavService.js";
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
export default {
  async generateMasav(req, res) {
    try {
      const { payments, companyInfo, executionDate } = req.body;

<<<<<<< Updated upstream
      // 🔎 קודם בודקים תקינות!
      const errors = validatePayments(payments);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      // רק אם הכול תקין → מפיקים קובץ
=======
      // 🔎 בדיקת תקינות לפני הכל
      const errors = validatePayments(payments);

      if (errors.length > 0) {
        console.warn("❌ Validation errors:", errors);

        return res.status(400).json({
          success: false,
          message: "פרטי התשלומים אינם תקינים",
          errors,
        });
      }

      // 🟢 הכול תקין → הפקת קובץ מס"ב
>>>>>>> Stashed changes
      const fileContent = generateCreditFile(companyInfo, payments, executionDate);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=masav.txt");

      return res.send(fileContent);

    } catch (err) {
      console.error("❌ MASAV ERROR:", err);
<<<<<<< Updated upstream
      return res.status(500).json({ success: false, error: err.message });
=======

      return res.status(500).json({
        success: false,
        message: "שגיאה בעת הפקת קובץ מס\"ב",
        error: err.message,
      });
>>>>>>> Stashed changes
    }
  }
};
