import { useEffect, useMemo, useState } from "react";
import { X, Search, FileText, Users, Filter, CheckSquare, Square, Calendar, DollarSign } from "lucide-react";
import api from "../api/api.js";
import { toast } from "sonner";

export default function ExpenseLinkModal({
  open,
  onClose,
  expense,
  onLinked,
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices"); // invoices | salaries

  // חשבוניות
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilters, setInvoiceFilters] = useState({
    paymentStatus: "all",
    dateFrom: "",
    dateTo: "",
  });

  // משכורות
  const [salaries, setSalaries] = useState([]);
  const [selectedSalaryIds, setSelectedSalaryIds] = useState([]);
  const [salarySearch, setSalarySearch] = useState("");
  const [salaryFilters, setSalaryFilters] = useState({
    month: "",
    year: "",
  });

  const [showInvoiceFilters, setShowInvoiceFilters] = useState(false);
  const [showSalaryFilters, setShowSalaryFilters] = useState(false);

  // טעינת נתונים
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [invoicesRes, salariesRes] = await Promise.all([
          api.get("/invoices"),
          api.get("/salaries"),
        ]);

        setInvoices(invoicesRes.data?.data || invoicesRes.data || []);
        setSalaries(salariesRes.data?.data || salariesRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת נתונים");
      }
    };

    fetchData();
  }, [open]);

  // איפוס בחירות בעת פתיחה
  useEffect(() => {
    if (open && expense) {
      setSelectedInvoiceIds(expense.linkedInvoices?.map(inv => inv._id || inv) || []);
      setSelectedSalaryIds(expense.linkedSalaries?.map(sal => sal._id || sal) || []);
    }
  }, [open, expense]);

  // סינון חשבוניות
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // חיפוש טקסט
    if (invoiceSearch) {
      const s = invoiceSearch.toLowerCase();
      filtered = filtered.filter((inv) =>
        inv.supplierId?.name?.toLowerCase().includes(s) ||
        inv.invoiceNumber?.toString().includes(s) ||
        inv.totalAmount?.toString().includes(s)
      );
    }

    // סינון לפי סטטוס תשלום
    if (invoiceFilters.paymentStatus === "paid") {
      filtered = filtered.filter(inv => inv.paid === "כן");
    } else if (invoiceFilters.paymentStatus === "unpaid") {
      filtered = filtered.filter(inv => inv.paid !== "כן");
    }

    // סינון לפי תאריך
    if (invoiceFilters.dateFrom) {
      const from = new Date(invoiceFilters.dateFrom);
      filtered = filtered.filter(inv => new Date(inv.createdAt) >= from);
    }
    if (invoiceFilters.dateTo) {
      const to = new Date(invoiceFilters.dateTo);
      filtered = filtered.filter(inv => new Date(inv.createdAt) <= to);
    }

    return filtered;
  }, [invoices, invoiceSearch, invoiceFilters]);

  // סינון משכורות
  const filteredSalaries = useMemo(() => {
    let filtered = salaries;

    // חיפוש טקסט
    if (salarySearch) {
      const s = salarySearch.toLowerCase();
      filtered = filtered.filter((sal) =>
        sal.employeeName?.toLowerCase().includes(s) ||
        sal.totalAmount?.toString().includes(s)
      );
    }

    // סינון לפי חודש
    if (salaryFilters.month) {
      filtered = filtered.filter(sal => sal.month === parseInt(salaryFilters.month));
    }

    // סינון לפי שנה
    if (salaryFilters.year) {
      filtered = filtered.filter(sal => sal.year === parseInt(salaryFilters.year));
    }

    return filtered;
  }, [salaries, salarySearch, salaryFilters]);

  // Toggle בחירת חשבונית
  const toggleInvoice = (invoiceId) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  // Toggle בחירת משכורת
  const toggleSalary = (salaryId) => {
    setSelectedSalaryIds(prev =>
      prev.includes(salaryId)
        ? prev.filter(id => id !== salaryId)
        : [...prev, salaryId]
    );
  };

  // בחירת כל החשבוניות המסוננות
  const selectAllInvoices = () => {
    const allIds = filteredInvoices.map(inv => inv._id);
    setSelectedInvoiceIds(prev => {
      const newIds = [...prev];
      allIds.forEach(id => {
        if (!newIds.includes(id)) newIds.push(id);
      });
      return newIds;
    });
  };

  // ביטול בחירת כל החשבוניות המסוננות
  const deselectAllInvoices = () => {
    const filteredIds = filteredInvoices.map(inv => inv._id);
    setSelectedInvoiceIds(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  // בחירת כל המשכורות המסוננות
  const selectAllSalaries = () => {
    const allIds = filteredSalaries.map(sal => sal._id);
    setSelectedSalaryIds(prev => {
      const newIds = [...prev];
      allIds.forEach(id => {
        if (!newIds.includes(id)) newIds.push(id);
      });
      return newIds;
    });
  };

  // ביטול בחירת כל המשכורות המסוננות
  const deselectAllSalaries = () => {
    const filteredIds = filteredSalaries.map(sal => sal._id);
    setSelectedSalaryIds(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  // שמירה
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.put(`/expenses/${expense._id}/link`, {
        invoiceIds: selectedInvoiceIds,
        salaryIds: selectedSalaryIds,
      });

      toast.success("השיוך נשמר בהצלחה");
      onLinked?.(response.data.data);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירת השיוך");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("he-IL");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
    }).format(amount || 0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            שיוך הוצאה לחשבוניות / משכורות
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Expense Info */}
        <div className="bg-orange-50 px-6 py-3 border-b">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-slate-700">הוצאה:</span>
            <span>{expense?.description}</span>
            <span className="font-bold text-orange-600">{formatCurrency(expense?.amount)}</span>
            <span className="text-slate-500">{formatDate(expense?.date)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex-1 px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "invoices"
                ? "bg-orange-100 text-orange-700 border-b-2 border-orange-500"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-5 h-5" />
            חשבוניות ({selectedInvoiceIds.length})
          </button>
          <button
            onClick={() => setActiveTab("salaries")}
            className={`flex-1 px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "salaries"
                ? "bg-orange-100 text-orange-700 border-b-2 border-orange-500"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="w-5 h-5" />
            משכורות ({selectedSalaryIds.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "invoices" ? (
            <>
              {/* Invoice Search & Filters */}
              <div className="p-4 border-b bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="חיפוש לפי ספק, מספר חשבונית, סכום..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowInvoiceFilters(!showInvoiceFilters)}
                    className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                      showInvoiceFilters ? "bg-orange-100 border-orange-500 text-orange-700" : "border-slate-200 hover:border-orange-300"
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    סינון
                  </button>
                  <button
                    onClick={selectAllInvoices}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={deselectAllInvoices}
                    className="px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    נקה
                  </button>
                </div>

                {showInvoiceFilters && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">סטטוס תשלום:</label>
                      <select
                        value={invoiceFilters.paymentStatus}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:outline-none"
                      >
                        <option value="all">הכל</option>
                        <option value="paid">שולמו</option>
                        <option value="unpaid">לא שולמו</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">מתאריך:</label>
                      <input
                        type="date"
                        value={invoiceFilters.dateFrom}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">עד תאריך:</label>
                      <input
                        type="date"
                        value={invoiceFilters.dateTo}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setInvoiceFilters({ paymentStatus: "all", dateFrom: "", dateTo: "" })}
                      className="px-3 py-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      נקה סינון
                    </button>
                  </div>
                )}
              </div>

              {/* Invoice List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm text-slate-500 mb-2">
                  מציג {filteredInvoices.length} חשבוניות
                </div>
                <div className="space-y-2">
                  {filteredInvoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      onClick={() => toggleInvoice(invoice._id)}
                      className={`p-3 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 ${
                        selectedInvoiceIds.includes(invoice._id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:border-orange-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {selectedInvoiceIds.includes(invoice._id) ? (
                          <CheckSquare className="w-6 h-6 text-orange-500" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900">
                          {invoice.supplierId?.name || "ללא ספק"}
                        </div>
                        <div className="text-sm text-slate-500">
                          חשבונית #{invoice.invoiceNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatDate(invoice.createdAt)}
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          invoice.paid === "כן"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {invoice.paid === "כן" ? "שולם" : "לא שולם"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Salary Search & Filters */}
              <div className="p-4 border-b bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="חיפוש לפי שם עובד, סכום..."
                      value={salarySearch}
                      onChange={(e) => setSalarySearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowSalaryFilters(!showSalaryFilters)}
                    className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                      showSalaryFilters ? "bg-orange-100 border-orange-500 text-orange-700" : "border-slate-200 hover:border-orange-300"
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    סינון
                  </button>
                  <button
                    onClick={selectAllSalaries}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={deselectAllSalaries}
                    className="px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    נקה
                  </button>
                </div>

                {showSalaryFilters && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">חודש:</label>
                      <select
                        value={salaryFilters.month}
                        onChange={(e) => setSalaryFilters(prev => ({ ...prev, month: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:outline-none"
                      >
                        <option value="">הכל</option>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">שנה:</label>
                      <select
                        value={salaryFilters.year}
                        onChange={(e) => setSalaryFilters(prev => ({ ...prev, year: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:outline-none"
                      >
                        <option value="">הכל</option>
                        {[2023, 2024, 2025, 2026].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setSalaryFilters({ month: "", year: "" })}
                      className="px-3 py-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      נקה סינון
                    </button>
                  </div>
                )}
              </div>

              {/* Salary List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm text-slate-500 mb-2">
                  מציג {filteredSalaries.length} משכורות
                </div>
                <div className="space-y-2">
                  {filteredSalaries.map((salary) => (
                    <div
                      key={salary._id}
                      onClick={() => toggleSalary(salary._id)}
                      className={`p-3 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 ${
                        selectedSalaryIds.includes(salary._id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:border-orange-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {selectedSalaryIds.includes(salary._id) ? (
                          <CheckSquare className="w-6 h-6 text-orange-500" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900">
                          {salary.employeeName}
                        </div>
                        <div className="text-sm text-slate-500">
                          {salary.month}/{salary.year}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">
                          {formatCurrency(salary.totalAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            נבחרו: {selectedInvoiceIds.length} חשבוניות, {selectedSalaryIds.length} משכורות
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border-2 border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-colors disabled:opacity-50"
            >
              {loading ? "שומר..." : "שמור שיוך"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
