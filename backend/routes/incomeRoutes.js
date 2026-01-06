import express from "express";
import incomeController from "../controller/incomeControllers.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";

const router = express.Router();

// הגדרת multer לאחסון בזיכרון
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // קבל רק קבצי Excel
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

// חיפוש הכנסות
router.get("/search", protect, incomeController.searchIncomes);

// קבלת כל ההכנסות
router.get("/", protect, incomeController.getAllIncomes);

// קבלת הכנסה לפי ID
router.get("/:incomeId", protect, incomeController.getIncomeById);

// יצירת הכנסה בודדת
router.post("/", protect, incomeController.createIncome);

// העלאת קובץ Excel
router.post(
  "/upload-excel",
  protect,
  upload.single("file"),
  incomeController.uploadExcelIncomes
);

// עדכון הכנסה
router.put("/:incomeId", protect, incomeController.updateIncome);

// מחיקת הכנסה
router.delete("/:incomeId", protect, incomeController.deleteIncome);

export default router;
