// components/BankSelector.jsx
import React from "react";
import Select from "react-select";

const BankSelector = ({ banks, selectedBank, onChange, placeholder }) => {
  const options = banks.map((bank) => ({
    value: bank,
    label: (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: "bold",
          fontSize: "15px",
        }}
      >
        {bank.logoUrl && (
          <img
            src={bank.logoUrl}
            alt={`${bank.bankName} logo`}
            style={{ width: 22, height: 26, objectFit: "contain" }}
            onError={(e) => (e.target.style.display = "none")}
          />
        )}
        <span>
          {bank.bankName} — קוד: {bank.bankCode}
        </span>
      </div>
    ),
    bankName: bank.bankName,
    bankCode: bank.bankCode,
  }));

  return (
    <Select
      options={options}
      value={
        options.find((opt) => opt.value.bankCode === selectedBank?.bankCode) ||
        null
      }
      onChange={(selected) => onChange(selected?.value || null)}
      placeholder={placeholder || "בחר בנק"}
      isClearable
      isSearchable={true}
      formatOptionLabel={(option) => option.label}
      // 🔥 כדי שהדף לא יחתוך את התפריט
      menuPortalTarget={document.body}
      menuPosition="fixed"
      // 🔥 כדי להבטיח שזה מעל כל דבר (כולל כפתורים)
      styles={{
        control: (provided) => ({
          ...provided,
          minHeight: 48,
          borderWidth: "2px",
          borderColor: "#e2e8f0",
          borderRadius: "12px",
          paddingRight: "4px",
          boxShadow: "none",
          "&:hover": { borderColor: "#f59e0b" },
          "&:focus-within": {
            borderColor: "#f59e0b",
            boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.25)",
          },
        }),

        menuPortal: (base) => ({
          ...base,
          zIndex: 999999, // 🔥 חובה
        }),

        menu: (provided) => ({
          ...provided,
          zIndex: 999999,
          borderRadius: 12,
          overflow: "hidden",
        }),

        option: (provided, state) => ({
          ...provided,
          fontSize: "14px",
          padding: "10px 14px",
          backgroundColor: state.isFocused ? "#fff7e6" : "white",
          color: "#334155",
        }),

        singleValue: (provided) => ({
          ...provided,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }),
      }}
      // 🔍 חיפוש גם לפי שם וגם לפי קוד
      filterOption={(option, inputValue) => {
        if (!inputValue) return true;

        const search = inputValue.toLowerCase();
        return (
          option.data.bankName.toLowerCase().includes(search) ||
          option.data.bankCode.toLowerCase().includes(search)
        );
      }}
    />
  );
};

export default BankSelector;
