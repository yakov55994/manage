import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../api/api";
import { bankCodeMap } from "../utils/bankMap";


export default function MasavModal({ open, onClose, invoices }) {
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
    const [selected, setSelected] = useState([]);
    const [executionDate, setExecutionDate] = useState(
        new Date().toISOString().slice(0, 10)
>>>>>>> Stashed changes
=======
    const [selected, setSelected] = useState([]);
    const [executionDate, setExecutionDate] = useState(
        new Date().toISOString().slice(0, 10)
>>>>>>> Stashed changes
    );
    const [searchTerm, setSearchTerm] = useState("");

    // ============================
    // פונקציית בדיקת פרטי בנק
    // ============================
    function hasBankDetails(supplier) {
        if (!supplier?.bankDetails) return false;

        const bd = supplier.bankDetails;

        // קוד בנק אמיתי מתוך המפה
        const bankCode = bankCodeMap[bd.bankName] || null;

        return (
            bankCode &&
            /^[0-9]{2}$/.test(bankCode) &&

            bd.branchNumber &&
            /^[0-9]{1,3}$/.test(bd.branchNumber) &&

            bd.accountNumber &&
            /^[0-9]{5,12}$/.test(bd.accountNumber)
        );
    }


    // ============================
    // RESET ON OPEN
    // ============================
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

    // ============================
    // GENERATE MASAV FILE
    // ============================
    const generate = async () => {
        if (selected.length === 0) return toast.error("בחר חשבוניות");

        try {
            const withBankDetails = [];
            const withoutBankDetails = [];

            selected.forEach((inv) => {
                const s = inv.supplierId;
                if (!hasBankDetails(s)) {
                    withoutBankDetails.push(s.name);
                } else {
                    withBankDetails.push(inv);
                }
            });

            if (withBankDetails.length === 0) {
                return toast.error(
                    `אין פרטי בנק תקינים לחשבוניות: ${withoutBankDetails.join(", ")}`
                );
            }

            const payments = withBankDetails.map((inv) => {
                const s = inv.supplierId;
                const bd = s.bankDetails;

                return {
                    bankNumber: bankCodeMap[bd.bankName] || "00",
                    branchNumber: bd.branchNumber.padStart(3, "0"),
                    accountNumber: bd.accountNumber.padStart(9, "0"),
                    amount: Number(inv.totalAmount),  // 🎯 זה הפתרון
                    supplierName: s.name.substring(0, 16),
                    internalId: String(s.business_tax || "0").padStart(10, "0"),
                };
            });

            console.log("payments:", payments)


            // שליחת נתונים לשרת
            const res = await api.post(
                "/masav/generate",
                {
                    payments,
                    executionDate,
                    companyInfo: {
                        companyId: "1234567", // עדכן למה שיש לך
                        companyName: "My Company",
                        accountNumber: "12345678901",
                    },
                },
                { responseType: "blob" }
            );

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "masav.txt";
            link.click();

            // הודעה משולבת
            if (withoutBankDetails.length > 0) {
                toast.success(
                    <div className="space-y-2">
                        <div className="font-bold">
                            ✅ קובץ מס"ב נוצר בהצלחה עם {withBankDetails.length} חשבוניות
                        </div>
                        <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                            ⚠️ לא נכללו {withoutBankDetails.length} ספקים:
                            <div className="mt-1 font-semibold">{withoutBankDetails.join(", ")}</div>
                        </div>
                    </div>,
                    { duration: 8000 }
                );
            } else {
                toast.success(`✅ קובץ מס"ב נוצר בהצלחה! (${withBankDetails.length})`);
            }

            onClose();
        } catch (err) {
            const serverErrors = err.response?.data?.errors;

            if (serverErrors?.length) {
                toast.error(
                    <div className="text-right">
                        <b>לא ניתן לייצר קובץ מס״ב:</b>
                        <ul className="mt-2 list-disc pr-5">
                            {serverErrors.map((e, i) => (
                                <li key={i}>{e}</li>
                            ))}
                        </ul>
                    </div>
                );
            } else {
                toast.error("שגיאה ביצירת קובץ מס\"ב");
            }
        }

    };

    // ============================
    // FILTER SEARCH
    // ============================
    const filteredInvoices = invoices.filter((inv) => {
        const q = searchTerm.toLowerCase();
        console.log("INV:", inv);

        return (
            inv.invoiceNumber?.toString().includes(q) ||
            inv.supplierId?.name?.toLowerCase().includes(q) ||
            inv.sum?.toString().includes(q)
        );
    });

    const isAllSelected =
        filteredInvoices.length > 0 && selected.length === filteredInvoices.length;

    if (!open) return null;

    // ======================================================
    //                      UI
    // ======================================================
    return (
        <div className="fixed inset-0 z-[200] bg-black/50 flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute left-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition hover:rotate-90"
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold">ייצוא קובץ מס״ב</h2>
                    <p className="text-orange-100 text-sm mt-1">
                        בחר חשבוניות לייצוא לבנק
                    </p>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* EXECUTION DATE */}
                    <div className="mb-6 max-w-md">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            תאריך ביצוע:
                        </label>
                        <input
                            type="date"
                            value={executionDate}
                            onChange={(e) => setExecutionDate(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-orange-200 rounded-xl focus:border-orange-400"
                        />
                    </div>

                    {/* INVOICE LIST */}
                    <div className="relative bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl shadow-lg overflow-hidden">

                        {/* SEARCH + SELECT ALL */}
                        <div className="p-4 border-b-2 border-orange-100 bg-white/50 space-y-3">

                            {/* SELECT ALL */}
                            <label className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border-2 border-orange-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 accent-orange-500"
                                />
                                <span className="font-bold text-orange-900">
                                    בחר הכל ({filteredInvoices.length})
                                </span>
                            </label>

                            {/* SEARCH */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="חפש חשבונית, ספק או סכום..."
                                    className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400">
                                    🔍
                                </span>
                            </div>

                        </div>

                        {/* LIST */}
                        <div className="p-5 max-h-[400px] overflow-y-auto space-y-2">

                            {filteredInvoices.map((inv) => {
                                const isSelected = selected.some((x) => x._id === inv._id);
                                const hasNoBankDetails = !hasBankDetails(inv.supplierId);

                                return (
                                    <label
                                        key={inv._id}
                                        className={`flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer transition-all
                      ${isSelected
                                                ? hasNoBankDetails
                                                    ? "bg-red-50 border-red-300"
                                                    : "bg-orange-100 border-orange-300"
                                                : "bg-white border-orange-100 hover:bg-orange-50"
                                            }
                      border-2
                    `}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleInvoice(inv)}
                                                className="w-5 h-5 accent-orange-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {hasNoBankDetails && (
                                                        <span className="text-red-500">⚠️</span>
                                                    )}
                                                    <span className={`font-bold text-sm ${isSelected
                                                        ? hasNoBankDetails
                                                            ? "text-red-900"
                                                            : "text-orange-900"
                                                        : "text-slate-700"
                                                        }`}>
                                                        חשבונית #{inv.invoiceNumber}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {inv.supplierId?.name}
                                                </div>
                                            </div>
                                            <span className="font-bold text-orange-700">
                                                ₪{inv.sum?.toLocaleString()}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}

                            {filteredInvoices.length === 0 && (
                                <div className="text-center text-gray-400 p-6">לא נמצאו חשבוניות</div>
                            )}
                        </div>
                    </div>

                    {/* COUNT SUMMARY */}
                    {selected.length > 0 && (
                        <div className="mt-4 text-center">
                            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                                נבחרו {selected.length} חשבוניות • סה"כ ₪
                                {selected.reduce((sum, inv) => sum + inv.sum, 0).toLocaleString()}
                            </span>
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="p-6 border-t flex gap-3 bg-orange-50/50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold"
                    >
                        ביטול
                    </button>

                    <button
                        onClick={generate}
                        disabled={selected.length === 0}
                        className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-orange-600"
                    >
                        ייצא קובץ מס״ב ({selected.length})
                    </button>
                </div>

            </div>
        </div>
    );
}
