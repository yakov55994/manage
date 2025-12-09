import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../api/api";

export default function MasavModal({ open, onClose, invoices }) {
  const [selected, setSelected] = useState([]);
  const [executionDate, setExecutionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      setSelected([]);
      setSearchTerm("");
    }
  }, [open]);

  const toggleInvoice = (inv) => {
    if (selected.some((x) => x._id === inv._id)) {
      setSelected((prev) => prev.filter((x) => x._id !== inv._id));
    } else {
      setSelected((prev) => [...prev, inv]);
    }
  };

  const toggleSelectAll = () => {
    if (
      selected.length === filteredInvoices.length &&
      filteredInvoices.length > 0
    ) {
      setSelected([]);
    } else {
      setSelected(filteredInvoices);
    }
  };

  const generate = async () => {
    if (selected.length === 0) return toast.error("בחר חשבוניות");

    try {
      const withBankDetails = [];
      const withoutBankDetails = [];

      selected.forEach((inv) => {
        const s = inv.supplierId;
        if (
          !s?.bankDetails ||
          !s.bankDetails.bankName ||
          !s.bankDetails.branchNumber ||
          !s.bankDetails.accountNumber
        ) {
          withoutBankDetails.push({
            invoice: inv,
            supplierName: s?.name || "ספק לא ידוע",
          });
        } else {
          withBankDetails.push(inv);
        }
      });

      if (withBankDetails.length === 0) {
        const supplierNames = withoutBankDetails
          .map((x) => x.supplierName)
          .join(", ");
        return toast.error(`אין פרטי בנק לספקים: ${supplierNames}`);
      }

      const payments = withBankDetails.map((inv) => ({
        bankNumber: inv.supplierId.bankDetails.bankName,
        branchNumber: inv.supplierId.bankDetails.branchNumber,
        accountNumber: inv.supplierId.bankDetails.accountNumber,
        amount: inv.sum,
        name: inv.supplierId.name,
        supplierId: inv.supplierId.business_tax || "",
        invoiceNumber: inv.invoiceNumber,
      }));

      // 🟦 חובה — אחרת השרת מתפוצץ!
      const companyInfo = {
        companyId: "1234567",
        companyName: "My Company",
        accountNumber: "123456789012",
      };

      const res = await api.post(
        "/masav/generate",
        {
          companyInfo,
          payments,
          executionDate,
        },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "masav.txt";
      link.click();

      toast.success(`קובץ מס״ב נוצר בהצלחה (${withBankDetails.length})`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'שגיאה ביצירת קובץ מס"ב');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber?.toString().includes(searchLower) ||
      inv.supplierId?.name?.toLowerCase().includes(searchLower) ||
      inv.sum?.toString().includes(searchLower)
    );
  });

  const isAllSelected =
    filteredInvoices.length > 0 && selected.length === filteredInvoices.length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 hover:rotate-90"
          >
            <span className="text-white text-lg font-bold">✕</span>
          </button>
          <h2 className="text-2xl font-bold">ייצוא קובץ מס״ב</h2>
          <p className="text-orange-100 text-sm mt-1">
            בחר חשבוניות ליצוא לבנק
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Execution Date */}
          <div className="mb-6 max-w-md">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              תאריך ביצוע:
            </label>
            <input
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>

          {/* Selection Box */}
          <div className="relative bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl shadow-lg overflow-hidden">
            {/* Selected Invoices Tags */}
            {selected.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-100 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {selected.map((inv) => {
                    const hasNoBankDetails =
                      !inv.supplierId?.bankDetails ||
                      !inv.supplierId.bankDetails.bankName ||
                      !inv.supplierId.bankDetails.branchNumber ||
                      !inv.supplierId.bankDetails.accountNumber;

                    return (
                      <div
                        key={inv._id}
                        className={`group px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-white shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 ${
                          hasNoBankDetails
                            ? "bg-gradient-to-r from-red-500 to-rose-500"
                            : "bg-gradient-to-r from-orange-500 to-amber-500"
                        }`}
                      >
                        <span className="text-sm flex items-center gap-1">
                          {hasNoBankDetails && (
                            <span title="חסר פרטי בנק">⚠️</span>
                          )}
                          #{inv.invoiceNumber} — {inv.supplierId?.name}
                        </span>
                        <button
                          onClick={() => toggleInvoice(inv)}
                          className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 group-hover:rotate-90"
                        >
                          <span className="text-white text-xs font-bold">
                            ✕
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Box with Select All */}
            <div className="p-4 border-b-2 border-orange-100 bg-white/50 space-y-3">
              {/* Select All Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-300 transition-all">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
                <span className="font-bold text-orange-900">
                  בחר הכל{" "}
                  {filteredInvoices.length > 0 &&
                    `(${filteredInvoices.length})`}
                </span>
              </label>

              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש לפי מספר חשבונית, ספק או סכום..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Invoices List */}
            <div className="p-5 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-50">
              <div className="space-y-2">
                {filteredInvoices.map((inv) => {
                  const isSelected = selected.some((x) => x._id === inv._id);
                  const hasNoBankDetails =
                    !inv.supplierId?.bankDetails ||
                    !inv.supplierId.bankDetails.bankName ||
                    !inv.supplierId.bankDetails.branchNumber ||
                    !inv.supplierId.bankDetails.accountNumber;

                  return (
                    <label
                      key={inv._id}
                      className={`
                        flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer
                        transition-all duration-200 hover:scale-[1.02]
                        ${
                          isSelected
                            ? hasNoBankDetails
                              ? "bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 shadow-md"
                              : "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300 shadow-md"
                            : "bg-white border-2 border-orange-100 hover:border-orange-200 hover:bg-orange-50/50"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInvoice(inv)}
                          className="w-5 h-5 accent-orange-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {hasNoBankDetails && (
                              <span
                                className="text-red-500"
                                title="חסר פרטי בנק"
                              >
                                ⚠️
                              </span>
                            )}
                            <span
                              className={`font-bold text-sm ${
                                isSelected
                                  ? hasNoBankDetails
                                    ? "text-red-900"
                                    : "text-orange-900"
                                  : "text-slate-700"
                              }`}
                            >
                              חשבונית #{inv.invoiceNumber}
                            </span>
                            {isSelected && !hasNoBankDetails && (
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse"></div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            {inv.supplierId?.name}
                            {hasNoBankDetails && (
                              <span className="text-red-600 text-xs">
                                (ללא פרטי בנק)
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`font-bold ${
                            isSelected
                              ? hasNoBankDetails
                                ? "text-red-700"
                                : "text-orange-700"
                              : "text-slate-600"
                          }`}
                        >
                          ₪{inv.sum?.toLocaleString()}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Empty State */}
            {filteredInvoices.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>לא נמצאו חשבוניות</p>
              </div>
            )}
          </div>

          {/* Counter */}
          {selected.length > 0 && (
            <div className="mt-4 text-center">
              <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                נבחרו {selected.length} חשבוניות • סה"כ ₪
                {selected
                  .reduce((sum, inv) => sum + (inv.sum || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className="flex-shrink-0 p-6 bg-gradient-to-t from-orange-50/50 to-transparent border-t-2 border-orange-100">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all duration-200"
            >
              ביטול
            </button>
            <button
              onClick={generate}
              disabled={selected.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              ייצא קובץ מס״ב ({selected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
