import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../api/api";
import { bankCodeMap } from "../utils/bankMap";


export default function MasavModal({ open, onClose, invoices }) {
    const [selected, setSelected] = useState([]);
    const [executionDate, setExecutionDate] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [searchTerm, setSearchTerm] = useState("");

    // ============================
    // פונקציית בדיקת פרטי בנק
    // ============================
    function hasBankDetails(supplier) {
        if (!supplier?.bankDetails) return false;

        const bd = supplier.bankDetails;

        const bankCode = String(bankCodeMap[bd.bankName] || "000").padStart(3, "0");
        const branch = String(bd.branchNumber).padStart(3, "0");
        const account = bd.accountNumber?.padStart(13, "0");

        return (
            bankCode &&
            /^[0-9]{3}$/.test(bankCode) &&
            branch &&
            /^[0-9]{3}$/.test(branch) &&
            account &&
            /^[0-9]{13}$/.test(account)
        );
    }

    function validateClient(payments) {
        const errors = [];

        payments.forEach((p, i) => {
            const row = i + 1;

            if (!/^[0-9]{2}$/.test(p.bankNumber))
                errors.push(`שורה ${row}: קוד בנק חייב להיות 2 ספרות`);

            if (!/^[0-9]{3}$/.test(p.branchNumber))
                errors.push(`שורה ${row}: מספר סניף חייב להיות 3 ספרות`);

            if (!/^[0-9]{9}$/.test(p.accountNumber))
                errors.push(`שורה ${row}: מספר חשבון חייב להיות 9 ספרות`);

            if (!p.supplierName?.trim())
                errors.push(`שורה ${row}: שם ספק חסר`);

            if (!/^[0-9]+$/.test(p.amount) || p.amount <= 0)
                errors.push(`שורה ${row}: סכום חייב להיות גדול מ-0`);

            if (!/^[0-9]{9}$/.test(p.internalId))
                errors.push(`שורה ${row}: מזהה ספק חייב להיות 9 ספרות`);
        });

        return errors;
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
        if (selected.length === 0) {
            return toast.error("בחר חשבוניות");
        }

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
            return toast.error(`אין פרטי בנק תקינים: ${withoutBankDetails.join(", ")}`);
        }


        const payments = withBankDetails.map((inv) => {
            const s = inv.supplierId;
            const bd = s.bankDetails;

            // ⬅ פה התיקון
            const rawAccount = String(bd.accountNumber || "")
                .replace(/\D/g, "");  // מנקה תווים לא מספריים
            const account9 = rawAccount.slice(-9);    // רק 9 ספרות אחרונות

            return {
                bankNumber: String(bankCodeMap[bd.bankName] || "00").padStart(2, "0"),
                branchNumber: String(bd.branchNumber).padStart(3, "0"),
                accountNumber: account9.padStart(9, "0"),  // ⬅ זה המפתח
                amount: Math.round(inv.totalAmount * 100),
                supplierName: s.name,
                internalId: String(s.business_tax || "0").padStart(9, "0"),
            };
        });


        // ולידציה בצד לקוח
        const clientErrors = validateClient(payments);

        if (clientErrors.length > 0) {
            return toast.error(
                <div className="rtl text-right">
                    <b>השגיאות הבאות נמצאו:</b>
                    <ul className="mt-2 list-disc pr-5">
                        {clientErrors.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </div>,
                { duration: 8000 }
            );
        }

        // אם הכל תקין — נשלח לשרת
        try {
            const res = await api.post(
                "/masav/generate",
                {
                    payments,
                    executionDate, // מהטופס YYYY-MM-DD
                    companyInfo: {
                        instituteId: "92982289",
                        senderId: "92982",
                        companyName: "חינוך עם חיוך",
                    },
                },
                { responseType: "blob" }
            );

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = "masav.txt";
            link.click();

            toast.success("קובץ מס\"ב נוצר בהצלחה!");

            onClose();
        } catch (err) {
            toast.error("שגיאה ביצירת מס\"ב: " + err.message);
        }
    };

    // ============================
    // FILTER SEARCH
    // ============================
    const filteredInvoices = invoices.filter((inv) => {
        const q = searchTerm.toLowerCase();
        return (
            inv.invoiceNumber?.toString().includes(q) ||
            inv.supplierId?.name?.toLowerCase().includes(q) ||
            inv.totalAmount?.toString().includes(q)
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
                                                ₪{inv.totalAmount?.toLocaleString()}
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
                                {selected.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
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