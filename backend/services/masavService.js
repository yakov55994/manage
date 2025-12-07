// services/masavService.js

export function generateMasavFile(payments, date) {
  let lines = [];

  // HEADER (רשומת פתיחה)
  const header =
    "1" +                         // סוג רשומה
    "026" +                       // מספר מוסד משלם (לדוגמה)
    date.replace(/-/g, "") +      // תאריך YYYYMMDD
    "".padEnd(69, " ");           // השלמות
  lines.push(header);

  // RECORDS (רשומות תשלום)
  payments.forEach(p => {
    const line =
      "2" +                                     // סוג רשומה
      p.bankNumber.toString().padStart(2, "0") +         // בנק
      p.branchNumber.toString().padStart(3, "0") +       // סניף
      p.accountNumber.toString().padStart(9, "0") +      // חשבון
      (p.amount * 100).toFixed(0).padStart(13, "0") +    // סכום באגורות
      "".padEnd(60, " ");                                // שדות נוספים
    lines.push(line);
  });

  // TRAILER (סגירה)
  const trailer =
    "9" +                                     // סוג רשומה
    payments.length.toString().padStart(7, "0") +   // מספר רשומות
    "".padEnd(80, " ");                             // שדות השלמה
  lines.push(trailer);

  return lines.join("\n");
}
