// components/BankSelector.jsx
import { Bold } from 'lucide-react';
import React from 'react';
import Select from 'react-select';

const BankSelector = ({ banks, selectedBank, onChange, placeholder }) => {
  const options = banks.map((bank) => ({
    value: bank,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight:'bold', fontSize:'15px' }}>
        {bank.logoUrl && (
          <img
            src={bank.logoUrl}
            alt={`${bank.bankName} logo`}
            style={{ width: 20, height: 24, objectFit: 'contain' }}
            onError={(e) => (e.target.style.display = 'none')}
          />
        )}
        <span>{bank.bankName} - קוד: {bank.bankCode}</span>
      </div>
    ),
    // הוסף את הנתונים לחיפוש
    bankName: bank.bankName,
    bankCode: bank.bankCode
  }));

  return (
    <Select
      options={options}
      value={options.find((opt) => opt.value.bankCode === selectedBank?.bankCode) || null}
      onChange={(selected) => onChange(selected?.value || null)}
      placeholder={placeholder || 'בחר בנק'}
      isClearable
      isSearchable={true}
      formatOptionLabel={(option) => option.label}
      // תיקון ה-filterOption לחפש גם בקוד וגם בשם
      filterOption={(option, inputValue) => {
        if (!inputValue) return true;
        const searchTerm = inputValue.toLowerCase();
        return (
          option.data.bankName.toLowerCase().includes(searchTerm) ||
          option.data.bankCode.toLowerCase().includes(searchTerm)
        );
      }}
      styles={{
        control: (provided) => ({ ...provided, minHeight: 40 }),
        option: (provided) => ({ ...provided, display: 'flex', alignItems: 'center' }),
        singleValue: (provided) => ({ ...provided, display: 'flex', alignItems: 'center' }),
      }}
    />
  );
};

export default BankSelector;