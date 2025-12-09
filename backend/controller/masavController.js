// =======================================
// MASAV CONTROLLER
// =======================================

import { generateMasavFile } from "../services/masavService.js";

export default {
  // Generate Masav file
 async generateMasav(req, res) {
  try {
    console.log("MASAV Request Body:", req.body);

    const { companyInfo, payments, executionDate } = req.body;

    if (!payments || payments.length === 0) {
      return res.status(400).json({ error: "אין תשלומים" });
    }

    const fileContent = generateMasavFile({
      companyInfo: companyInfo || {
        companyId: "0000000",
        companyName: "לא ידוע",
        accountNumber: "000000000",
      },
      payments,
      executionDate,
    });

    res.setHeader("Content-Type", "text/plain; charset=windows-1255");
    res.setHeader("Content-Disposition", 'attachment; filename="masav.txt"');
    res.send(fileContent);
  } catch (err) {
    console.error("MASAV ERROR:", err);
    res.status(500).json({ error: err.message || "שגיאה ביצירת קובץ" });
  }
}

};
