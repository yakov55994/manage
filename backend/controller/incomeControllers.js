import incomeService from "../services/incomeService.js";
import expenseService from "../services/expenseService.js";
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

      // המרה למערך גולמי כדי למצוא את שורת הכותרת
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // חיפוש שורת הכותרת - מחפשים שורה שמכילה גם 'זכות' וגם 'חובה' (שורת הכותרת האמיתית)
      let headerRowIndex = rawData.findIndex(row =>
        row && row.length > 3 && row.some(cell => cell && cell.toString().includes('זכות')) && row.some(cell => cell && cell.toString().includes('חובה'))
      );

      // אם לא נמצא, חפש לפי 'תאריך ערך'
      if (headerRowIndex === -1) {
        headerRowIndex = rawData.findIndex(row =>
          row && row.some(cell => cell && cell.toString().includes('תאריך ערך'))
        );
      }

      // אם עדיין לא נמצא, נסה מהשורה הראשונה
      // if (headerRowIndex === -1) {
      //   console.log("⚠️  לא נמצאה שורת כותרת, משתמש בשורה 0");
      //   headerRowIndex = 0;
      // }


      // המר את הגיליון למערך JSON - נתחיל משורת הכותרת ונגדיר אותה בעצמנו
      // נקרא את שורת הכותרת כערכים
      const headerRow = rawData[headerRowIndex];

      // קריאת כל הנתונים החל מהשורה שאחרי הכותרת
      const dataRows = rawData.slice(headerRowIndex + 1);

      // המרה למבנה אובייקטים עם השדות שלנו
      const jsonData = dataRows.map(row => {
        if (!row || row.length === 0) return null;

        const obj = {};
        headerRow.forEach((header, index) => {
          if (header && typeof header === 'string') {
            obj[header.trim()] = row[index];
          }
        });
        return obj;
      }).filter(Boolean);

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "הקובץ ריק או לא תקין"
        });
      }

      // לוג לראות את שמות העמודות בקובץ
      // if (jsonData.length > 0) {
      //   console.log("📋 שמות העמודות בקובץ:", Object.keys(jsonData[0]));
      //   console.log("📊 דוגמה לשורה ראשונה:", jsonData[0]);
      //   console.log("📊 3 שורות ראשונות:", jsonData.slice(0, 3));
      // }

      // פונקציה להמרת מספר סידורי של Excel לתאריך
      const excelDateToJSDate = (serial) => {
        if (!serial || typeof serial !== 'number') return null;
        // Excel dates are stored as days since 1900-01-01
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info;
      };

      // המרת הנתונים לפורמט שלנו
      const incomesData = [];
      const expensesData = [];

      jsonData.forEach((row, index) => {
        // נסה למצוא את השדות לפי שמות אפשריים (תומך בעברית ואנגלית)
        let dateRaw =
          row["תאריך"] ||
          row["תאריך ערך"] ||
          row["Date"] ||
          row["date"] ||
          row["ת.ערך"] ||
          row["DATE"] ||
          row["תאריך ע"];

        // המר תאריך מפורמט Excel אם צריך
        let date = null;
        if (typeof dateRaw === 'number') {
          date = excelDateToJSDate(dateRaw);
        } else if (dateRaw) {
          date = new Date(dateRaw);
        }

        // ניקוי ופרסור סכומים
        const parseVal = (val) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          return parseFloat(val.toString().replace(/[^\d.-]/g, '')) || 0;
        };

        let credit = parseVal(row["זכות"] || row["סכום"] || row["Amount"] || row["amount"] || row["AMOUNT"] || row["סכום זכות"]);
        let debit = parseVal(row["חובה"] || row["Debit"] || row["סכום חובה"]);

        const description =
          row["תאור"] ||
          row["תיאור"] ||
          row["Description"] ||
          row["description"] ||
          row["פרטים"] ||
          row["DESCRIPTION"] ||
          row["הערות"];

        // קריאת אסמכתא בנפרד
        const reference =
          row["אסמכתא"] ||
          row["Reference"] ||
          row["reference"] ||
          row["מס' אסמכתא"] ||
          "";

        // קריאת יתרה
        const balance =
          row["יתרה"] ||
          row["Balance"] ||
          row["balance"] ||
          "";

        // קריאת סוג פעולה
        const transactionType =
          row["סוג פעולה"] ||
          row["סוג"] ||
          row["Type"] ||
          row["type"] ||
          "";

        const notes = req.body.notes || ""; // הערות כלליות מהטופס

        // דלג אם אין תאריך או תיאור
        if (!date || !description) return;

        // לוגיקה: זכות -> הכנסה
        if (credit > 0) {
          incomesData.push({
            date: date,
            amount: credit.toString(),
            description: description.toString(),
            notes: notes,
            reference: reference ? reference.toString() : "",
          });
        }
        // לוגיקה: חובה -> הוצאה
        else if (debit > 0) {
          expensesData.push({
            date: date,
            amount: debit.toString(),
            description: description.toString(),
            notes: notes,
            reference: reference ? reference.toString() : "",
            balance: balance ? balance.toString() : "",
            transactionType: transactionType ? transactionType.toString() : "",
          });
        }
      });

      if (incomesData.length === 0 && expensesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "לא נמצאו תנועות תקינות בקובץ (נדרש תאריך, תיאור וסכום בזכות או בחובה)"
        });
      }

      const results = { incomes: [], expenses: [] };

      // יצירת הכנסות
      if (incomesData.length > 0) {
        results.incomes = await incomeService.createBulkIncomes(req.user, incomesData);
      }

      // יצירת הוצאות
      if (expensesData.length > 0) {
        results.expenses = await expenseService.createBulkExpenses(req.user, expensesData);
      }

      res.status(201).json({
        success: true,
        message: `הועלו בהצלחה: ${results.incomes.length} הכנסות, ${results.expenses.length} הוצאות`,
        data: results,
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

  // עדכון הערות מרובה
  async bulkUpdateNotes(req, res) {
    try {
      const { incomeIds, notes } = req.body;
      if (!incomeIds || !Array.isArray(incomeIds) || incomeIds.length === 0) {
        return res.status(400).json({ success: false, message: "לא נבחרו הכנסות" });
      }
      const result = await incomeService.bulkUpdateNotes(req.user, incomeIds, notes);
      res.json({ success: true, data: result, message: `עודכנו ${result.modifiedCount} הכנסות` });
    } catch (e) {
      sendError(res, e);
    }
  },

  // שיוך הכנסה לחשבוניות, משכורות והזמנות
  async linkIncome(req, res) {
    try {
      const { invoiceIds, salaryIds, orderIds } = req.body;
      const income = await incomeService.linkIncome(
        req.user,
        req.params.incomeId,
        invoiceIds || [],
        salaryIds || [],
        orderIds || []
      );
      res.json({ success: true, data: income });
    } catch (e) {
      sendError(res, e);
    }
  },
};

export default incomeController;
