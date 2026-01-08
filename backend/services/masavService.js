// ================================================
// MASAV FILE SERVICE – לפי המפרט הרשמי של מס"ב 013
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
    // בדיקה שהמספר לא מורכב רק מאפסים
    if (p.internalId && /^0+$/.test(p.internalId)) {
      errors.push(`רשומה ${row}: מספר ע.מ/ת.ז חייב להיות 9 ספרות (לא אפסים) - ספק: ${p.supplierName}`);
    }
    if (!/^[0-9]+$/.test(String(p.amount).replace(/[^0-9]/g, ''))) {
      errors.push(`רשומה ${row}: סכום לא תקין`);
    }

  });

  return errors;
}

// ------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------

/**
 * מילוי משמאל באפסים
 */
function padLeft(value, length, char = '0') {
  return String(value || '').padStart(length, char);
}

/**
 * מילוי מימין ברווחים
 */
function padRight(value, length, char = ' ') {
  return String(value || '').substring(0, length).padEnd(length, char);
}

/**
 * פורמט תאריך YYYYMMDD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + month + day;
}

/**
 * פורמט שעה HHMM
 */
function formatTime(date = new Date()) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return hours + minutes;
}

// ------------------------------------------------
//  FILE GENERATION - פורמט K-1-5 (128 תווים)
// ------------------------------------------------

/**
 * פורמט תאריך DDMMYY
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

  // תאריך ביצוע התשלום (שהמשתמש בחר)
  const execDate = formatDateDDMMYY(executionDate);
  // תאריך יצירת הקובץ (היום)
  const creationDate = formatDateDDMMYY(new Date());

  let lines = [];
  let totalAmount = 0;

  // =====================================================
  // רשומת K - כותרת (128 תווים)
  // =====================================================
  // דוגמה: K92982289002512180001025121892982000000                 חינוך עם חיוך                                                        KOT
  let rowK = '';
  rowK += 'K';                                    // 1: סוג רשומה
  rowK += padLeft(instituteId, 8, '0');          // 2-9: מוסד/נושא (8)
  rowK += '00';                                   // 10-11: מטבע (2)
  rowK += execDate;                               // 12-17: תאריך תשלום DDMMYY (6)
  rowK += '0';                                    // 18: FILLER (1)
  rowK += '001';                                  // 19-21: מספר סידורי (3)
  rowK += '0';                                    // 22: FILLER (1)
  rowK += creationDate;                           // 23-28: תאריך יצירה DDMMYY (6)
  rowK += padLeft(senderId, 5, '0');             // 29-33: מוסד שולח (5)
  rowK += '000000';                               // 34-39: FILLER (6)
  // שם החברה צריך להיות מיושר לימין (רווחים משמאל)
  rowK += padLeft(companyName, 30, ' ');         // 40-69: שם המוסד (30)
  rowK += padRight('', 56, ' ');                 // 70-125: FILLER (56)
  rowK += 'KOT';                                  // 126-128: זיהוי כותרת (3)

  lines.push(rowK);

  // =====================================================
  // רשומת 1 - תנועה (128 תווים)
  // =====================================================
  // דוגמה: 192982289000000002053900000004702120515754364שלוה מיזמי שילוב00000009698000000000000000000113300000000000006000000000000000000
  payments.forEach(p => {
    const cleanAmount = String(p.amount).replace(/[^0-9]/g, '');
    const amountInAgorot = Number(cleanAmount);
    totalAmount += amountInAgorot;

    let row1 = '';
    row1 += '1';                                           // 1: סוג רשומה
    row1 += padLeft(instituteId, 8, '0');                 // 2-9: מוסד/נושא (8)
    row1 += '00';                                          // 10-11: מטבע (2)
    row1 += '000000';                                      // 12-17: FILLER (6)
    row1 += padLeft(p.bankNumber, 2, '0');                // 18-19: קוד בנק (2)
    row1 += padLeft(p.branchNumber, 3, '0');              // 20-22: מספר סניף (3)
    row1 += '0000';                                        // 23-26: סוג חשבון (4)
    row1 += padLeft(p.accountNumber, 9, '0');             // 27-35: מספר חשבון (9)
    row1 += '0';                                           // 36: FILLER (1)
    row1 += padLeft(p.internalId, 9, '0');                // 37-45: מס' זהות (9)
    row1 += padLeft(p.supplierName, 16, ' ');
    row1 += padLeft(amountInAgorot, 13, '0');             // 62-74: סכום (13)

    // אסמכתא - מספר חשבונית או מזהה
    const asmachtaRaw = p.invoiceNumbers || p.internalId || '';
    const asmachta = String(asmachtaRaw).replace(/[^0-9]/g, '');
    row1 += padLeft(asmachta, 20, '0');                   // 75-94: אסמכתא (20)

    row1 += '00000000';                                    // 95-102: תקופת תשלום (8)
    row1 += '000';                                         // 103-105: קוד מלל (3)
    row1 += '006';                                         // 106-108: סוג תנועה (3)
    row1 += padLeft('', 18, '0');                         // 109-126: FILLER (18)
    row1 += '  ';                                          // 127-128: FILLER (2)

    lines.push(row1);
  });

  // =====================================================
  // רשומת 5 - סיכום (128 תווים)
  // =====================================================
  // דוגמה: 59298228900251218000100000000096980000000000000000000000010000000
  let row5 = '';
  row5 += '5';                                    // 1: סוג רשומה
  row5 += padLeft(instituteId, 8, '0');          // 2-9: מוסד/נושא (8)
  row5 += '00';                                   // 10-11: מטבע (2)
  row5 += execDate;                               // 12-17: תאריך תשלום (6)
  row5 += '0';                                    // 18: FILLER (1)
  row5 += '001';                                  // 19-21: מספר סידורי (3)
  row5 += padLeft(totalAmount, 15, '0');         // 22-36: סכום התנועות (15)
  row5 += padLeft('', 15, '0');                  // 37-51: FILLER (15)
  row5 += padLeft(payments.length, 7, '0');      // 52-58: מספר התנועות (7)
  row5 += padLeft('', 7, '0');                   // 59-65: FILLER (7)
  row5 += padRight('', 63, ' ');                 // 66-128: FILLER (63)

  lines.push(row5);

  // ✅ וידוא שכל שורה היא בדיוק 128 תווים
  const validated = lines.map((line, idx) => {
    if (line.length !== 128) {
      console.warn(`שורה ${idx + 1} באורך ${line.length} במקום 128`);
      return line.padEnd(128, ' ').substring(0, 128);
    }
    return line;
  });

  return validated.join("\r\n");
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

  // נתוני בדיקה - סכום באגורות
  const pay = [{
    bankNumber: "20",
    branchNumber: "539",
    accountNumber: "470212",
    internalId: "515754364",
    supplierName: "שלוה מיזמי שילוב",
    amount: "969800",            // 9698.00 ש"ח
    invoiceNumbers: "1133"
  }];

  const result = generateMasavFile(company, pay, "2018-12-25");

  // קובץ תקין להשוואה
  const correctLines = [
    "K92982289002512180001025121892982000000                 חינוך עם חיוך                                                        KOT",
    "192982289000000002053900000004702120515754364שלוה מיזמי שילוב00000009698000000000000000000113300000000000006000000000000000000  ",
    "59298228900251218000100000000096980000000000000000000000010000000                                                               "
  ];

  const generatedLines = result.split("\r\n");

  generatedLines.forEach((line, i) => {
    const type = line[0];
    const typeName = type === 'K' ? 'כותרת' : type === '1' ? 'תנועה' : type === '5' ? 'סיכום' : 'לא ידוע';
    const isCorrectLength = line.length === 128;
    const matchesCorrect = line === correctLines[i];

    if (!matchesCorrect && correctLines[i]) {
      // מציאת ההבדלים
      for (let j = 0; j < Math.max(line.length, correctLines[i].length); j++) {
        if (line[j] !== correctLines[i][j]) {
          break;
        }
      }
    }
  });

  return result;
}