// ================================================
// MASAV FILE SERVICE – לפי המפרט הרשמי של מס"ב
// ================================================

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
    if (!/^[0-9]{1,9}$/.test(p.accountNumber)) {
      errors.push(`רשומה ${row}: מספר חשבון חייב להיות עד 9 ספרות`);
    }
    if (!p.supplierName?.trim()) {
      errors.push(`רשומה ${row}: שם ספק חסר`);
    }
    if (!/^[0-9]+$/.test(p.amount) || Number(p.amount) <= 0) {
      errors.push(`רשומה ${row}: סכום חייב להיות גדול מ-0`);
    }
    if (!/^[0-9]{1,9}$/.test(p.internalId)) {
      errors.push(`רשומה ${row}: מס׳ זהות/ספק חייב להיות עד 9 ספרות`);
    }
  });

  return errors;
}

// ------------------------------------------------
//  FILE GENERATION - לפי המפרט הרשמי
// ------------------------------------------------

/**
 * מזריקה נתונים לתוך מערך תווים במיקום מדויק
 * @param {Array} rowArray - המערך המייצג את השורה (128 תאים)
 * @param {number} position - מיקום התחלה (1-128)
 * @param {string|number} data - הנתון להזרקה
 * @param {number} length - אורך השדה המוקצה
 * @param {string} padChar - תו מילוי (רווח או אפס)
 * @param {string} align - "left" = padding משמאל (למספרים), "right" = padding מימין (לטקסט)
 */
function putAt(rowArray, position, data, length, padChar = "0", align = "left") {
  let str = String(data || "").substring(0, length);
  // align="left" אומר שה-padding הוא משמאל (המספר/טקסט צמוד לימין) - מתאים למספרים
  // align="right" אומר שה-padding הוא מימין (הטקסט צמוד לשמאל) - מתאים לעברית
  str = align === "left" ? str.padStart(length, padChar) : str.padEnd(length, padChar);

  for (let i = 0; i < length; i++) {
    rowArray[(position - 1) + i] = str[i];
  }
}

/**
 * פורמט תאריך DDMMYY מאובייקט Date
 */
function formatDateDDMMYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return day + month + year;
}

export function generateMasavFile(companyInfo, payments, executionDate) {
  const { instituteId, senderId, companyName } = companyInfo;
  const execDate = formatDateDDMMYY(executionDate);

  let lines = [];

  // =====================================================
  // רשומת K - כותרת (Header) - לפי מפרט רשמי
  // =====================================================
  // אורך רשומה: 128 תווים
  let kRow = new Array(128).fill(" ");

  // 1. זיהוי רשומה (פוזיציה 1, אורך 1)
  putAt(kRow, 1, "K", 1, " ", "right");

  // 2. מוסד/נושא (פוזיציות 2-9, אורך 8)
  putAt(kRow, 2, instituteId, 8, "0", "left");

  // 3. מטבע (פוזיציות 10-11, אורך 2) - '00'
  putAt(kRow, 10, "00", 2, "0", "left");

  // 4. תאריך התשלום DDMMYY (פוזיציות 12-17, אורך 6)
  putAt(kRow, 12, execDate, 6, "0", "left");

  // 5. FILLER (פוזיציה 18, אורך 1) - '0'
  putAt(kRow, 18, "0", 1, "0", "left");

  // 6. מספר סידורי (פוזיציות 19-21, אורך 3) - '001'
  putAt(kRow, 19, "001", 3, "0", "left");

  // 7. FILLER (פוזיציה 22, אורך 1) - '0'
  putAt(kRow, 22, "0", 1, "0", "left");

  // 8. תאריך יצירת הסרט DDMMYY (פוזיציות 23-28, אורך 6)
  putAt(kRow, 23, execDate, 6, "0", "left");

  // 9. מוסד שולח (פוזיציות 29-33, אורך 5)
  putAt(kRow, 29, senderId, 5, "0", "left");

  // 10. FILLER אפסים (פוזיציות 34-39, אורך 6)
  putAt(kRow, 34, "000000", 6, "0", "left");

  // 11. שם המוסד/נושא (פוזיציות 40-69, אורך 30) - צמוד לימין = padding משמאל
  putAt(kRow, 40, companyName, 30, " ", "left");

  // 12. FILLER ריק (פוזיציות 70-125, אורך 56) - כבר מלא ברווחים

  // 13. זיהוי כותרת (פוזיציות 126-128, אורך 3)
  putAt(kRow, 126, "KOT", 3, " ", "right");

  lines.push(kRow.join(""));

  // =====================================================
  // רשומת 1 - תנועה (Movement) - לפי מפרט רשמי
  // =====================================================
  let totalAmount = 0;

  payments.forEach(p => {
    // הסכום באגורות
    totalAmount += Number(p.amount);
    let row = new Array(128).fill("0");

<<<<<<< Updated upstream
    // 1. זיהוי רשומה (פוזיציה 1, אורך 1)
    putAt(row, 1, "1", 1, " ", "right");
=======
    const line =
      "1" +                                         // 1   (1)     - סוג רשומה
      fixLen(instituteId, 8, "0", "left") +         // 8   (2-9)   - מספר מוסד
      "00" +                                        // 2   (10-11) - FILLER
      "000000000" +                                 // 9   (12-20) - מספר חשבון שולח
      fixLen(p.bankNumber, 2, "0", "left") +        // 2   (21-22) - קוד בנק נהנה
      fixLen(p.branchNumber, 3, "0", "left") +      // 3   (23-25) - קוד סניף נהנה
      "000000" +                                    // 6   (26-31) - FILLER
      fixLen(p.internalId, 9, "0", "left") +        // 9   (32-40) - ח.פ נהנה
      fixLen(p.accountNumber, 9, "0", "left") +     // 9   (41-49) - מספר חשבון נהנה
      "0" +                                         // 1   (50)    - FILLER
      fixLen(p.supplierName, 16, " ", "right") +    // 16  (51-66) - שם נהנה
      fixLen(String(p.amount), 11, "0", "left") +   // 11  (67-77) - סכום באגורות
      "01" +                                        // 2   (78-79) - קוד מסלול
      execDate.slice(2,6) +                         // 4   (80-83) - תאריך MMDD
      "00" +                                        // 2   (84-85) - FILLER
      fixLen("", 43, " ");                          // 43  (86-128) - FILLER
                                                    // סה"כ: 128 תווים
>>>>>>> Stashed changes

    // 2. מוסד/נושא (פוזיציות 2-9, אורך 8)
    putAt(row, 2, instituteId, 8, "0", "left");

    // 3. מטבע (פוזיציות 10-11, אורך 2) - '00'
    putAt(row, 10, "00", 2, "0", "left");

    // 4. FILLER (פוזיציות 12-17, אורך 6) - '000000'
    putAt(row, 12, "000000", 6, "0", "left");

    // 5. קוד בנק (פוזיציות 18-19, אורך 2)
    putAt(row, 18, p.bankNumber, 2, "0", "left");

    // 6. מספר סניף (פוזיציות 20-22, אורך 3)
    putAt(row, 20, p.branchNumber, 3, "0", "left");

    // 7. סוג חשבון לזיכוי (פוזיציות 23-26, אורך 4) - אפסים
    putAt(row, 23, "0000", 4, "0", "left");

    // 8. מספר חשבון (פוזיציות 27-35, אורך 9)
    putAt(row, 27, p.accountNumber, 9, "0", "left");

    // 9. FILLER (פוזיציה 36, אורך 1) - '0'
    putAt(row, 36, "0", 1, "0", "left");

    // 10. מס' זיהוי של הזכאי - ת.ז. (פוזיציות 37-45, אורך 9)
    putAt(row, 37, p.internalId, 9, "0", "left");

    // 11. שם הזכאי (פוזיציות 46-61, אורך 16) - מימין לשמאל
    putAt(row, 46, p.supplierName, 16, " ", "right");

    // 12. סכום לתשלום (פוזיציות 62-74, אורך 13) - 11 ש"ח + 2 אגורות
    // הסכום מגיע באגורות (כמו בקוד המקורי)
    putAt(row, 62, p.amount, 13, "0", "left");

    // 13. מס' מזהה לזכאי במוסד/אסמכתא (פוזיציות 75-94, אורך 20)
    // אפשר להשתמש ב-internalId או בשדה נפרד
    const asmachta = p.asmachta || p.internalId || "";
    putAt(row, 75, asmachta, 20, "0", "left");

    // 14. תקופת התשלום (פוזיציות 95-102, אורך 8) - YYMM YYMM
    const period = p.paymentPeriod || "00000000";
    putAt(row, 95, period, 8, "0", "left");

    // 15. קוד מלל (פוזיציות 103-105, אורך 3) - אפסים
    putAt(row, 103, "000", 3, "0", "left");

    // 16. סוג תנועה (פוזיציות 106-108, אורך 3) - '006' לזיכוי רגיל
    putAt(row, 106, "006", 3, "0", "left");

    // 17. FILLER אפסים (פוזיציות 109-126, אורך 18)
    putAt(row, 109, "000000000000000000", 18, "0", "left");

    // 18. FILLER ריק (פוזיציות 127-128, אורך 2)
    putAt(row, 127, "  ", 2, " ", "right");

    lines.push(row.join(""));
  });

  // =====================================================
  // רשומת 5 - סיכום (Trailer) - לפי מפרט רשמי
  // =====================================================
  let sRow = new Array(128).fill(" ");

<<<<<<< Updated upstream
  // 1. זיהוי רשומה (פוזיציה 1, אורך 1)
  putAt(sRow, 1, "5", 1, " ", "right");

  // 2. מוסד/נושא (פוזיציות 2-9, אורך 8)
  putAt(sRow, 2, instituteId, 8, "0", "left");

  // 3. מטבע (פוזיציות 10-11, אורך 2) - '00'
  putAt(sRow, 10, "00", 2, "0", "left");

  // 4. תאריך התשלום (פוזיציות 12-17, אורך 6)
  putAt(sRow, 12, execDate, 6, "0", "left");

  // 5. FILLER (פוזיציה 18, אורך 1) - '0'
  putAt(sRow, 18, "0", 1, "0", "left");

  // 6. מספר סידורי (פוזיציות 19-21, אורך 3) - '001'
  putAt(sRow, 19, "001", 3, "0", "left");

  // 7. סכום התנועות (פוזיציות 22-36, אורך 15)
  putAt(sRow, 22, totalAmount, 15, "0", "left");

  // 8. FILLER אפסים (פוזיציות 37-51, אורך 15)
  putAt(sRow, 37, "000000000000000", 15, "0", "left");

  // 9. מספר התנועות (פוזיציות 52-58, אורך 7)
  putAt(sRow, 52, payments.length, 7, "0", "left");

  // 10. FILLER אפסים (פוזיציות 59-65, אורך 7)
  putAt(sRow, 59, "0000000", 7, "0", "left");

  // 11. FILLER ריק (פוזיציות 66-128, אורך 63) - כבר מלא ברווחים

  lines.push(sRow.join(""));

  // ✅ וידוא שכל שורה היא בדיוק 128 תווים
  lines = lines.map(line => line.padEnd(128, " "));
=======
  // =====================================================
  // END RECORD — חובה
  // =====================================================
>>>>>>> Stashed changes

  return lines.join("\r\n");
}

// ------------------------------------------------
// פונקציה להרצה ובדיקה עצמית
// ------------------------------------------------
export function testMasav() {
  const company = {
    instituteId: "92982289",
    senderId: "92982",
    companyName: "חינוך עם חיוך"
  };

  // נתונים שמתאימים לקובץ התקין
  // שים לב: הסכום באגורות! 969800 = 9698.00 ש"ח
  const pay = [{
    bankNumber: "20",
    branchNumber: "539",
    accountNumber: "470212",
    internalId: "515754364",      // מס' זהות - חובה!
    supplierName: "שלוה מיזמי שילוב",
    amount: "969800",             // סכום באגורות (9698.00 ש"ח)
    asmachta: "1133"              // אסמכתא
  }];

  const result = generateMasavFile(company, pay, "2018-12-25");
  console.log("--- Generated File Content ---");
  console.log(result);
  console.log("\n--- Line lengths ---");
  result.split("\r\n").forEach((line, i) => {
    console.log(`Line ${i + 1}: ${line.length} chars`);
  });

  // השוואה לקובץ התקין
  const correctLines = [
    "K92982289002512180001025121892982000000                 חינוך עם חיוך                                                        KOT",
    "192982289000000002053900000004702120515754364שלוה מיזמי שילוב00000009698000000000000000000113300000000000006000000000000000000  ",
    "59298228900251218000100000000096980000000000000000000000010000000                                                               "
  ];

  console.log("\n--- Comparison with correct file ---");
  const generatedLines = result.split("\r\n");
  for (let i = 0; i < 3; i++) {
    const match = generatedLines[i] === correctLines[i];
    console.log(`Line ${i + 1}: ${match ? '✓ MATCH' : '✗ DIFFERENT'}`);
    if (!match) {
      console.log(`  Expected: ${correctLines[i]}`);
      console.log(`  Got:      ${generatedLines[i]}`);
    }
  }

  return result;
}

// הרצת הבדיקה
testMasav();