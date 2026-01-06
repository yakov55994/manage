import incomeService from "../services/incomeService.js";
import { sendError } from "../utils/sendError.js";
import xlsx from "xlsx";

const incomeController = {
  // חיפוש הכנסות
  async searchIncomes(req, res) {
    try {
      const q = req.query.query || "";
      const results = await incomeService.searchIncomes(q);
      res.json(results);
    } catch (e) {
      console.error("❌ searchIncomes ERROR:", e);
      res.status(500).json({ message: "Search failed" });
    }
  },

  // קבלת כל ההכנסות
  async getAllIncomes(req, res) {
    try {
      const incomes = await incomeService.getAllIncomes(req.user);
      res.json({ success: true, data: incomes });
    } catch (e) {
      sendError(res, e);
    }
  },

  // קבלת הכנסה לפי ID
  async getIncomeById(req, res) {
    try {
      const income = await incomeService.getIncomeById(
        req.user,
        req.params.incomeId
      );
      res.json({ success: true, data: income });
    } catch (e) {
      sendError(res, e);
    }
  },

  // יצירת הכנסה בודדת
  async createIncome(req, res) {
    try {
      const income = await incomeService.createIncome(req.user, req.body);
      res.status(201).json({ success: true, data: income });
    } catch (e) {
      sendError(res, e);
    }
  },

  // העלאת קובץ אקסל ויצירת הכנסות מרובות
  async uploadExcelIncomes(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "לא הועלה קובץ"
        });
      }

      // קריאת הקובץ
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // המרה ל-JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "הקובץ ריק או לא תקין"
        });
      }

      // המרת הנתונים לפורמט שלנו
      const incomesData = jsonData.map((row) => {
        // נסה למצוא את השדות לפי שמות אפשריים
        const date = row["תאריך"] || row["Date"] || row["date"];
        const amount = row["זכות"] || row["סכום"] || row["Amount"] || row["amount"];
        const description = row["תיאור"] || row["Description"] || row["description"] || row["פרטים"];
        const notes = req.body.notes || ""; // הערות כלליות מהטופס

        if (!date || !amount || !description) {
          throw new Error(
            `שורה לא תקינה: חסר אחד מהשדות - תאריך: ${date}, זכות: ${amount}, תיאור: ${description}`
          );
        }

        return {
          date: new Date(date),
          amount: amount.toString(),
          description: description.toString(),
          notes: notes,
          projectId: req.body.projectId || null,
        };
      });

      // יצירת ההכנסות
      const createdIncomes = await incomeService.createBulkIncomes(
        req.user,
        incomesData
      );

      res.status(201).json({
        success: true,
        message: `${createdIncomes.length} הכנסות נוצרו בהצלחה`,
        data: createdIncomes,
      });
    } catch (e) {
      console.error("Excel upload error:", e);
      sendError(res, e);
    }
  },

  // עדכון הכנסה
  async updateIncome(req, res) {
    try {
      const income = await incomeService.updateIncome(
        req.user,
        req.params.incomeId,
        req.body
      );
      res.json({ success: true, data: income });
    } catch (e) {
      sendError(res, e);
    }
  },

  // מחיקת הכנסה
  async deleteIncome(req, res) {
    try {
      await incomeService.deleteIncome(req.user, req.params.incomeId);
      res.json({ success: true, message: "הכנסה נמחקה בהצלחה" });
    } catch (e) {
      sendError(res, e);
    }
  },
};

export default incomeController;
