import fs from "fs";
import path from "path";

// 🌟 טוען את קובץ הבנקים בצורה בטוחה שעובדת בכל Node
const banksPath = path.join(process.cwd(), "data", "banks_and_branches.json");
const banks = JSON.parse(fs.readFileSync(banksPath, "utf8"));

// ==========================================
// VALIDATOR
// ==========================================
export function validatePayments(payments) {
  const errors = [];

  payments.forEach((p, index) => {
    const row = index + 1;

    if (!/^\d{2}$/.test(p.bankNumber)) {
      errors.push(`רשומה ${row}: קוד בנק לא תקין (${p.bankNumber})`);
    }

    if (!/^\d{3}$/.test(p.branchNumber)) {
      errors.push(`רשומה ${row}: מספר סניף חייב להיות 3 ספרות`);
    }

    if (!/^\d{9}$/.test(p.accountNumber)) {
      errors.push(`רשומה ${row}: מספר חשבון חייב להיות 9 ספרות`);
    }

    if (!p.amount || p.amount <= 0) {
      errors.push(`רשומה ${row}: סכום תשלום חייב להיות גדול מ-0`);
    }

    if (!p.supplierName || p.supplierName.trim().length === 0) {
      errors.push(`רשומה ${row}: שם ספק חסר`);
    }

    if (p.supplierName.length > 16) {
      errors.push(`רשומה ${row}: שם ספק ארוך מדי (מקסימום 16 תווים)`);
    }

    if (!/^\d{10}$/.test(p.internalId)) {
      errors.push(`רשומה ${row}: מזהה ספק חייב להיות 10 ספרות`);
    }
  });

  return errors;
}

// ==========================================
// GENERATE MASAV FILE
// ==========================================
export function generateCreditFile(companyInfo, payments, executionDate) {
  const lines = [];

  // תאריך בפורמט YYMMDD
  const y = executionDate.slice(2, 4);
  const m = executionDate.slice(5, 7);
  const d = executionDate.slice(8, 10);
  const dateYYMMDD = `${y}${m}${d}`;

  const companyId = companyInfo.companyId.toString().padStart(7, "0");
  const sequence = `00${dateYYMMDD}0001`;
  const companyAccount = companyInfo.accountNumber.padStart(11, "0");

  const companyName = (companyInfo.companyName || "")
    .padEnd(30, " ")
    .substring(0, 30);

  // HEADER
  const header =
    "K" +
    companyId +
    sequence +
    dateYYMMDD +
    companyAccount +
    "000000" +
    "".padEnd(17, " ") +
    companyName +
    "".padEnd(52, " ") +
    "KOT";

  lines.push(header);

  // RECORDS
  let totalAgorot = 0;

  payments.forEach((p) => {
    const bankCode = p.bankNumber.padStart(2, "0");
    const branch = p.branchNumber.padStart(3, "0");
    const account = p.accountNumber.padStart(9, "0");

    const amountAgorot = Math.round(p.amount * 100)
      .toString()
      .padStart(10, "0");

    totalAgorot += Number(amountAgorot);

    const internalId = p.internalId.padStart(10, "0");

    const supplierName = (p.name || "")
      .padEnd(16, " ")
      .substring(0, 16);

    const line =
      "1" +
      companyId +
      "0000000" +
      bankCode +
      branch +
      account +
      amountAgorot +
      internalId +
      "AB" +
      " " +
      supplierName +
      "".padEnd(60, "0");

    lines.push(line);
  });

  // TRAILER
  const totalRecords = payments.length.toString().padStart(7, "0");
  const totalAgorotStr = totalAgorot.toString().padStart(12, "0");

  const trailer =
    "5" +
    companyId +
    sequence +
    totalRecords +
    totalAgorotStr +
    "".padStart(20, "0") +
    payments.length.toString().padStart(6, "0") +
    "".padEnd(74, " ");

  lines.push(trailer);

  // -------------------------------------------------
  // החזרת קובץ MASAV (ללא BOM — הכי בטוח לבנקים)
  // -------------------------------------------------
  return lines.join("\r\n");
}
