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
    "K" +
    fixLen(instituteId, 8, "0", "left") +  // 8
    "00" +                                 // 2
    execDate +                             // 6
    "0" +                                  // 1
    "001" +                                // 3
    "0" +                                  // 1
    execDate +                             // 6
    fixLen(senderId, 5, "0", "left") +     // 5
    fixLen("", 6, "0") +                   // 6
    fixCompanyNameRTL(companyName) +              // 30 ← שם מוסד כאן!
    fixLen("", 56) +                       // 56
    "KOT";                                 // 3

  console.log(header.split(""));
  console.log(header.length);
  console.log(header);
  console.log("1234567890123456789012345678901234567890123456789012345678901234567890")
  lines.push(header);

  // =====================================================
  // MOVEMENT RECORDS — TYPE 1
  // =====================================================
  let totalAmount = 0;

  payments.forEach((p) => {
    totalAmount += Number(p.amount);

    const line =
      "1" +
      fixLen(instituteId, 8, "0", "left") +
      "00" +
      "000000" +                               // filler
      fixLen(p.bankNumber, 2, "0", "left") +   // קוד בנק
      fixLen(p.branchNumber, 3, "0", "left") + // סניף
      "0000" +                                 // סוג חשבון
      fixLen(p.accountNumber, 9, "0") +        // מספר חשבון
      "0" +                                    // filler
      fixLen(p.internalId, 9, "0") +           // מזהה זכאי
      fixLen(p.supplierName, 16) +             // שם זכאי
      fixLen(String(p.amount), 13, "0") +      // סכום
      fixLen(p.internalId, 20, "0") +          // אסמכתא
      fixLen("0", 8, "0") +                    // תקופה
      "000" +                                  // קוד מלל
      "006" +                                  // סוג תנועה
      fixLen("", 18) +
      fixLen("", 2);

    lines.push(line);
  });

  // =====================================================
  // TRAILER — TYPE 5
  // =====================================================
  const trailer =
    "5" +
    fixLen(instituteId, 8, "0", "left") +
    "00" +
    execDate +
    "0" +
    "001" +
    fixLen(String(totalAmount), 15, "0") +   // סכום כללי
    fixLen("", 15, "0") +                    // filler
    fixLen(String(payments.length), 7, "0") +// מספר רשומות
    fixLen("", 63);

  lines.push(trailer);

  // =====================================================
  // END RECORD — חובה
  // =====================================================
  lines.push("9".repeat(128));

  return lines.join("\r\n");
}
