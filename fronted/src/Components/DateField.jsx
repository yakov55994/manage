import { useRef } from "react";

const DateField = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const openPicker = () => inputRef.current?.showPicker?.();

  return (
    <div className="flex items-center gap-3 w-full">
      <input
        ref={inputRef}
        type="date"
        value={value?.slice(0, 10) || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
        placeholder="yyyy-mm-dd"
        required
      />
      {/* <button
        type="button"
        onClick={openPicker}
        className="h-11 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
        title="פתח בורר תאריך"
      >
        📅
      </button> */}
    </div>
  );
};
export default DateField;