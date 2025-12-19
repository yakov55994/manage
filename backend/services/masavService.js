// ================================================
// MASAV FILE SERVICE – לפי המפרט הרשמי
// ================================================

function fixLen(str, len, pad = " ", dir = "right") {
  if (!str) str = "";
  if (str.length > len) return str.substring(0, len);
  return dir === "left" ? str.padStart(len, pad) : str.padEnd(len, pad);
}

// ------------------------------------------------
// VALIDATION
// ------------------------------------------------
export function validatePayments(payments = []) {
  const errors = [];

  if (!Array.isArray(payments) || payments.length === 0) {
    errors.push("לא נבחרו תשלומים למס\"ב");
    return errors;
  }

  payments.forEach((p, i) => {
    const row = i + 1;

    if (!/^[0-9]{2}$/.test(p.bankNumber)) {
      errors.push(`רשומה ${row}: קוד בנק חייב להיות 2 ספרות`);
    }
    if (!/^[0-9]{3}$/.test(p.branchNumber)) {
      errors.push(`רשומה ${row}: מספר סניף חייב להיות 3 ספרות`);
    }
    if (!/^[0-9]{9}$/.test(p.accountNumber)) {
      errors.push(`רשומה ${row}: מספר חשבון חייב להיות 9 ספרות`);
    }
    if (!p.supplierName?.trim()) {
      errors.push(`רשומה ${row}: שם ספק חסר`);
    }
    if (!/^[0-9]+$/.test(p.amount) || p.amount <= 0) {
      errors.push(`רשומה ${row}: סכום חייב להיות גדול מ-0`);
    }
    if (!/^[0-9]{9}$/.test(p.internalId)) {
      errors.push(`רשומה ${row}: מס׳ זהות/ספק חייב להיות 9 ספרות`);
    }
  });

  return errors;
}
function fixCompanyNameRTL(name) {
  // שם המוסד צריך להיות באורך 30 תווים לפי תקן.
  // כאן אנו דוחפים אותו ימינה כדי שיהיה בצד כמו בקובץ שקיבלת.
  return name.trim().padStart(30, " ");
}

// ------------------------------------------------
//  FILE GENERATION
// ------------------------------------------------
export function generateMasavFile(companyInfo, payments, executionDate) {
  const { instituteId, senderId, companyName } = companyInfo;

  // -----------------------------
  // תאריך ביצוע YYMMDD
  // -----------------------------
  const dateObj = new Date(executionDate);
  if (isNaN(dateObj)) throw new Error("תאריך ביצוע לא תקין");

  const execDate = dateObj.toISOString().slice(2, 10).replace(/-/g, "");
  const createDate = execDate;

  let lines = [];

  // =====================================================
  // HEADER — K
  // =====================================================
  const header =
    "K" +                                  // 1  - סוג רשומה
    fixLen(instituteId, 8, "0", "left") +  // 8  - מספר מוסד
    "00" +                                 // 2  - פילר
    execDate +                             // 6  - תאריך יצירה
    "0" +                                  // 1  - פילר
    "001" +                                // 3  - מספר קובץ
    "0" +                                  // 1  - פילר
    execDate +                             // 6  - תאריך ערך
    fixLen(senderId, 5, "0", "left") +     // 5  - מזהה שולח
    fixLen("", 6, "0") +                   // 6  - פילר
    fixCompanyNameRTL(companyName) +       // 30 - שם מוסד
    fixLen("", 56) +                       // 56 - פילר
    "KOT";                                 // 3  - זיהוי סוף רשומה
                                           // סה"כ: 128 תווים
  lines.push(header);

  // =====================================================
  // MOVEMENT RECORDS — TYPE 1
  // =====================================================
  let totalAmount = 0;

  payments.forEach((p) => {
    totalAmount += Number(p.amount);

    const line =
      "1" +                                         // 1   (1-1)   - סוג רשומה
      fixLen(instituteId, 8, "0", "left") +         // 8   (2-9)   - מספר בנק שולח
      "00" +                                        // 2   (10-11) - FILLER
      "000000000" +                                 // 9   (12-20) - מספר חשבון שולח
      fixLen(p.bankNumber, 2, "0", "left") +        // 2   (21-22) - קוד בנק נהנה
      fixLen(p.branchNumber, 3, "0", "left") +      // 3   (23-25) - קוד סניף נהנה
      "0000" +                                      // 4   (26-29) - FILLER
      fixLen(p.accountNumber, 9, "0", "left") +     // 9   (30-38) - מספר חשבון נהנה
      "0" +                                         // 1   (39-39) - FILLER
      fixLen(p.internalId, 9, "0", "left") +        // 9   (40-48) - ח.פ/ע.מ נהנה
      fixLen(p.supplierName, 16, " ", "right") +    // 16  (49-64) - שם נהנה
      fixLen(String(p.amount), 11, "0", "left") +   // 11  (65-75) - סכום העברה באגורות
      execDate +                                    // 6   (76-81) - תאריך ערך YYMMDD
      "00" +                                        // 2   (82-83) - FILLER
      fixLen(companyName, 16, " ", "right") +       // 16  (84-99) - שם לקוח השולח
      "006" +                                       // 3   (100-102) - קוד פעולה (006 = זיכוי)
      fixLen("", 11, " ") +                         // 11  (103-113) - FILLER
      fixLen("", 15, "0", "left");                  // 15  (114-128) - אינדקס הרשומה
                                                    // סה"כ: 128 תווים

    lines.push(line);
  });

  // =====================================================
  // TRAILER — TYPE 5
  // =====================================================
  const trailer =
    "5" +                                            // 1  - סוג רשומה
    fixLen(instituteId, 8, "0", "left") +            // 8  - מספר מוסד
    "00" +                                           // 2  - פילר
    execDate +                                       // 6  - תאריך יצירה
    "0" +                                            // 1  - פילר
    "001" +                                          // 3  - מספר קובץ
    fixLen(String(totalAmount), 15, "0", "left") +   // 15 - סכום כולל באגורות
    fixLen("", 15, "0") +                            // 15 - פילר
    fixLen(String(payments.length), 7, "0", "left") +// 7  - מספר רשומות
    fixLen("", 63);                                  // 63 - פילר
                                                     // סה"כ: 128 תווים
  lines.push(trailer);

  // =====================================================
  // END RECORD — חובה
  // =====================================================
  // lines.push("9".repeat(128));

  return lines.join("\r\n");
}
