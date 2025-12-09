export function generateCreditFile(companyInfo, payments, date) {
  const lines = [];

  if (!Array.isArray(payments)) {
    throw new Error("payments must be an array");
  }

  // ======================================
  // BASIC FIELDS
  // ======================================
  const companyId = (companyInfo.companyId || "").toString().padStart(7, "0");
  const companyName = (companyInfo.companyName || "")
    .padEnd(16, " ")
    .substring(0, 16);

  // תאריך YYMMDD
  const formattedDate = date.padStart(6, "0");

  // מספר חשבון החברה – 12 ספרות
  const headerAccount = (companyInfo.accountNumber || "")
    .toString()
    .padStart(12, "0");

  // מספר רצף – במקרה שלך קבוע
  const sequenceNumber = "9002512040001";

  // סכום כולל
  let totalAmount = 0;
  payments.forEach(p => {
    totalAmount += Math.round((p.amount || 0) * 100);
  });

  // ======================================
  // HEADER LINE (K)
  // ======================================
  const header =
    "K" +                        // סוג שורה
    companyId +                  // מזהה חברה (7)
    sequenceNumber +             // מספר רצף (13)
    formattedDate +              // תאריך YYMMDD
    headerAccount +              // חשבון (12)
    "000000" +                   // אפסים (6)
    "".padEnd(17, " ") +         // רווחים (17)
    companyName +                // שם חברה (16)
    "".padEnd(64, " ") +         // רווחים (64)
    "KOT";                       // סיומת (3)

  lines.push(header);

  // ======================================
  // PAYMENT LINES (1)
  // ======================================
  payments.forEach((payment, index) => {
    const recordNumber = (index + 2).toString().padStart(10, "0");

    const bankCode = (payment.bankNumber || "").toString().padStart(6, "0");
    const branchCode = (payment.branchNumber || "").toString().padStart(5, "0");
    const accountNum = (payment.accountNumber || "").toString().padStart(7, "0");

    const supplierId = (payment.supplierId || "").toString().padStart(9, "0");

    const supplierName = (payment.name || "")
      .toString()
      .padEnd(16, " ")
      .substring(0, 16);

    const amountAgorot = Math.round((payment.amount || 0) * 100)
      .toString()
      .padStart(8, "0");

    const reference = (payment.invoiceNumber || "")
      .toString()
      .padStart(6, "0");

    const line =
      "1" +
      companyId +
      recordNumber +
      bankCode +
      branchCode +
      accountNum +
      supplierId +
      "AB" +               // קוד פעולה
      " " +                // רווח
      supplierName +
      amountAgorot +
      "".padStart(20, "0") +
      reference +
      "".padStart(30, "0") +
      "6" +
      "".padStart(21, "0");

    lines.push(line);
  });

  // ======================================
  // TRAILER LINE (5)
  // ======================================
  const totalRecords = (payments.length + 1).toString().padStart(7, "0");
  const totalAmountStr = totalAmount.toString().padStart(12, "0");
  const recordCount = payments.length.toString().padStart(6, "0");

  const trailer =
    "5" +
    companyId +
    sequenceNumber +
    totalRecords +
    totalAmountStr +
    "".padStart(18, "0") +
    recordCount +
    "".padEnd(74, " ");

  lines.push(trailer);

  // -------------------------------------------------
  // החזרת קובץ MASAV (ללא BOM — הכי בטוח לבנקים)
  // -------------------------------------------------
  return lines.join("\r\n");
}
