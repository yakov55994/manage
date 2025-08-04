import { useEffect, useState } from "react";
import Select from 'react-select';

const BankAccountForm = () => {
  const [banks, setBanks] = useState([]);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [selectedBranchCode, setSelectedBranchCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    fetch("/data/banks_and_branches.json")
      .then((res) => res.json())
      .then((data) => setBanks(data))
      .catch((err) => console.error("שגיאה בטעינת רשימת הבנקים:", err));
  }, []);

  const selectedBank = banks.find((b) => b.bankCode === selectedBankCode);
  const branches = selectedBank ? selectedBank.branches : [];

  // תיקון ה-options לסניפים
  const branchOptions = branches.map(branch => ({
    value: branch.branchCode,
    label: `${branch.branchCode} - ${branch.city} - ${branch.address}`,
    // הוסף את הנתונים ישירות ב-option
    city: branch.city,
    address: branch.address,
    branchCode: branch.branchCode
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const bankName = selectedBank?.bankName || "";
    const branch = branches.find((b) => b.branchCode === selectedBranchCode);
    console.log({
      bankCode: selectedBankCode,
      bankName,
      branchCode: selectedBranchCode,
      branchCity: branch?.city,
      accountNumber,
    });
    alert("הפרטים נקלטו בהצלחה ✅");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto text-right">
      <div>
        <label className="block">בחר בנק:</label>
        <select
          value={selectedBankCode}
          onChange={(e) => {
            setSelectedBankCode(e.target.value);
            setSelectedBranchCode("");
          }}
          className="border p-2 w-full"
        >
          <option value="">-- בחר בנק --</option>
          {banks.map((bank) => (
            <option key={bank.bankCode} value={bank.bankCode}>
              {bank.bankCode} - {bank.bankName}
            </option>
          ))}
        </select>
      </div>

      {branches.length > 0 && (
        <div>
          <label className="block">בחר סניף:</label>
          <Select
            options={branchOptions}
            value={branchOptions.find(opt => opt.value === selectedBranchCode) || null}
            onChange={(selected) => setSelectedBranchCode(selected?.value || "")}
            placeholder="-- בחר סניף או הקלד לחיפוש --"
            isClearable
            isSearchable={true}
            // תיקון ה-filterOption
            filterOption={(option, inputValue) => {
              if (!inputValue) return true;
              const searchTerm = inputValue.toLowerCase();
              return (
                option.data.city.toLowerCase().includes(searchTerm) ||
                option.data.address.toLowerCase().includes(searchTerm) ||
                option.data.branchCode.toLowerCase().includes(searchTerm)
              );
            }}
            styles={{
              control: (provided) => ({ ...provided, minHeight: 40, padding: '2px' }),
            }}
            noOptionsMessage={({ inputValue }) => 
              inputValue ? `לא נמצאו סניפים עבור "${inputValue}"` : 'לא נמצאו סניפים'
            }
          />
        </div>
      )}

      <div>
        <label className="block">מספר חשבון:</label>
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="123456789"
          className="border p-2 w-full"
          required
        />
      </div>

      <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">
        שלח
      </button>
    </form>
  );
};

export default BankAccountForm;