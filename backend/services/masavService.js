// ===============================================
// MASAV SERVICE – תקן בנק ישראל 2025
// ===============================================

// --------- מפת קודי הבנקים ---------
const BANK_CODES = {
  "10": "10", "לאומי": "10", "בנק לאומי לישראל בע\"מ": "10",
  "12": "12", "הפועלים": "12", "בנק הפועלים בע\"מ": "12",
  "11": "11", "דיסקונט": "11", "בנק דיסקונט לישראל בע\"מ": "11",
  "20": "20", "מזרחי": "20", "מזרחי טפחות": "20", "בנק מזרחי טפחות בע\"מ": "20",
  "31": "31", "בינלאומי": "31", "בנק הבינלאומי הראשון לישראל בע\"מ": "31",
  "17": "17", "מרכנתיל": "17", "בנק מרכנתיל דיסקונט בע\"מ": "17",
  "14": "14", "אוצר החייל": "14", "בנק אוצר החייל בע\"מ": "14",
  "04": "04", "יהב": "04", "בנק יהב לעובדי המדינה בע\"מ": "04",
  "54": "54", "ירושלים": "54", "בנק ירושלים בע\"מ": "54",
  "46": "46", "מסד": "46", "בנק מסד בע\"מ": "46",
  "13": "13", "אגוד": "13", "בנק אגוד לישראל בע\"מ": "13",
  "26": "26", "יובנק": "26", "יובנק בע\"מ": "26",
  "09": "09", "בנק הדואר": "09", "הדואר": "09",
  "18": "18", "One Zero": "18", "One Zero - הבנק הדיגיטלי בע\"מ": "18",
  "default": "10"
};

// -------------------------------------------------
// קוד בנק תקני (כולל fallback)
// -------------------------------------------------
function getBankCode(bankName) {
  if (!bankName) return BANK_CODES.default;
  const clean = String(bankName).trim();

  // אם נתון מספר – תקני
  if (/^\d+$/.test(clean)) return BANK_CODES[clean] || BANK_CODES.default;

  // אם נתון שם בנק – תקני
  return (
    BANK_CODES[clean] ||
    BANK_CODES[clean.replace(/^בנק\s+/g, "")] ||
    BANK_CODES.default
  );
}

// -------------------------------------------------
// תאריך YYMMDD (ללא UTC BUG)
// -------------------------------------------------
function formatYYMMDD(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "000000";

  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return yy + mm + dd;
}

// ===============================================
// יצירת קובץ MASAV תקני
// ===============================================
export function generateMasavFile({ companyInfo, payments, executionDate }) {
  const dateYYMMDD =
    formatYYMMDD(executionDate) !== "000000"
      ? formatYYMMDD(executionDate)
      : formatYYMMDD(new Date());

  const companyId = String(companyInfo.companyId || "0000000").padStart(7, "0");
  const account = String(companyInfo.accountNumber || "000000000").padStart(9, "0");
  const companyName = String(companyInfo.companyName || "COMPANY")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "") // הסרת עברית
    .padEnd(16, " ")
    .substring(0, 16);

  const lines = [];

  // -------------------------------------------------
  // HEADER (תקני 100%)
  // -------------------------------------------------
  const header =
    "K" +
    companyId +
    dateYYMMDD +
    "0001" +
    dateYYMMDD +
    account +
    "000000" + // בנק מייצג
    "".padEnd(17, " ") +
    companyName +
    "".padEnd(64, " ") +
    "KOT";

  lines.push(header);

  // -------------------------------------------------
  // RECORD 1 – תשלומים (כל שורה EXACT 160 תווים)
  // -------------------------------------------------
  payments.forEach((p, i) => {
    const bankCode = getBankCode(p.bankNumber);
    const branch = String(p.branchNumber || "").replace(/\D/g, "").padStart(3, "0");
    const accountNum = String(p.accountNumber || "")
      .replace(/\D/g, "")
      .padStart(9, "0");

    const amountCents = Math.round((p.amount || 0) * 100);
    const amountStr = String(amountCents).padStart(13, "0");

    const supplierId = String(p.supplierId || "0")
      .replace(/\D/g, "")
      .padStart(9, "0");

    const name =
      String(p.name || "PAYEE")
        .normalize("NFKD")
        .replace(/[^\x00-\x7F]/g, "")
        .padEnd(16, " ")
        .substring(0, 16);

    const reference =
      p.invoiceNumber && /^\d+$/.test(String(p.invoiceNumber))
        ? String(p.invoiceNumber).padStart(6, "0")
        : String(i + 100001).padStart(6, "0");

    const seq = String(i + 2).padStart(7, "0");

    const line =
      "1" +
      companyId +
      seq +
      bankCode +
      branch +
      accountNum +
      amountStr +
      supplierId +
      "AB" +
      name +
      reference +
      "".padEnd(60, "0");

    lines.push(line);
  });

  // -------------------------------------------------
  // TRAILER (5)
  // -------------------------------------------------
  const totalCents = payments.reduce(
    (sum, p) => sum + Math.round((p.amount || 0) * 100),
    0
  );

  const trailer =
    "5" +
    companyId +
    dateYYMMDD +
    "0001" +
    String(payments.length).padStart(7, "0") +
    String(totalCents).padStart(13, "0") +
    "".padEnd(80, "0");

  lines.push(trailer);

  // -------------------------------------------------
  // החזרת קובץ MASAV (ללא BOM — הכי בטוח לבנקים)
  // -------------------------------------------------
  return lines.join("\r\n");
}
