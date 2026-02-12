import express from "express";
import multer from "multer";
import { createSalary, getSalaries, exportSalaries, getSalaryById, updateSalary, deleteSalary, uploadSalariesExcel } from "../controller/salaryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// הגדרת multer לאחסון בזיכרון
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("ניתן להעלות רק קבצי Excel (.xlsx, .xls)"));
    }
  },
});

router.post("/", protect, createSalary);
router.get("/", protect, getSalaries);

// ✅ תמיכה גם ב-GET וגם ב-POST לייצוא (למנוע חסימה של antivirus)
router.get("/export", protect, exportSalaries);
router.post("/export", protect, exportSalaries);

// העלאת קובץ אקסל משכורות
router.post("/upload-excel", protect, upload.single("file"), uploadSalariesExcel);

router.get("/:id", protect, getSalaryById);
router.put("/:id", protect, updateSalary);
router.delete("/:id", protect, deleteSalary);
export default router;
