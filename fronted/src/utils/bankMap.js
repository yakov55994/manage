import banks from "../../public/data/banks_and_branches.json";

// בניית מפה: שם בנק → קוד בנק
export const bankCodeMap = banks.reduce((map, b) => {
  map[b.bankName.trim()] = b.bankCode.trim();
  return map;
}, {});
