// =======================================
// MASAV CONTROLLER
// =======================================

import { generateMasavFile } from "../services/masavService.js";

export default {
  // Generate Masav file
  async generateMasav(req, res) {
    try {
      const { payments, executionDate } = req.body;

      const fileContent = generateMasavFile(payments, executionDate);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=masav.txt");

      return res.send(fileContent);

    } catch (err) {
      console.error("❌ MASAV ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
