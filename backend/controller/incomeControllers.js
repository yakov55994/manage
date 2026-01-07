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
      const incomesData = jsonData.map((row, index) => {
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

        // סכום - רק זכות (הכנסות), חובה נתעלם
        let credit = row["זכות"] || row["סכום"] || row["Amount"] || row["amount"] || row["AMOUNT"] || row["סכום זכות"];
        const debit = row["חובה"] || row["Debit"];

        // אם זכות היא רווח (' ') או null/undefined, דלג
        if (!credit || credit === ' ' || credit === '') {
          return null;
        }

        // אם יש חובה אבל אין זכות, דלג (זו הוצאה)
        const amount = credit;

        const description =
          row["תאור"] ||
          row["תיאור"] ||
          row["Description"] ||
          row["description"] ||
          row["פרטים"] ||
          row["DESCRIPTION"] ||
          row["אסמכתא"] ||
          row["הערות"];

        const notes = req.body.notes || ""; // הערות כלליות מהטופס

        // דלג על שורות ריקות או שורות עם חובה בלבד (הוצאות)
        if (!date || !amount || !description) {
          // console.log(`⚠️  שורה ${index + headerRowIndex + 2} דולגה (לא הכנסה או חסרים נתונים):`, { date, amount, description, row });
          return null;
        }

        return {
          date: date,
          amount: amount.toString(),
          description: description.toString(),
          notes: notes,
          projectId: req.body.projectId || null,
        };
      }).filter(item => item !== null); // סינון שורות ריקות

      if (incomesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "לא נמצאו הכנסות תקינות בקובץ. וודאי שיש עמודות: תאריך, זכות, תיאור"
        });
      }

      // יצירת ההכנסות דרך ה-service (כדי שיעבור דרך הרשאות ויקבל userId)
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
