// =======================================
// MASAV CONTROLLER
// =======================================

import { generateCreditFile } from "../services/masavService.js";

export default {
  async generateMasav(req, res) {
    try {
      console.log("🟦 BODY RECEIVED:", req.body);
      console.log("🟪 payments:", req.body.payments);
      console.log("🟩 type:", typeof req.body.payments);

      const { payments, companyInfo, executionDate } = req.body;

      const fileContent = generateCreditFile(companyInfo, payments, executionDate);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=masav.txt");

      return res.send(fileContent);

    } catch (err) {
      console.error("❌ MASAV ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

