import { useEffect, useMemo, useState } from "react";
import { X, Search, FileText, Users, Filter, CheckSquare, Square, ShoppingCart } from "lucide-react";
import api from "../api/api.js";
import { toast } from "sonner";

export default function OrderLinkModal({
  open,
  onClose,
  order,
  onLinked,
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices"); // invoices | salaries | orders

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

  // הזמנות אחרות
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilters, setOrderFilters] = useState({
    status: "all",
  });

  const [showInvoiceFilters, setShowInvoiceFilters] = useState(false);
  const [showSalaryFilters, setShowSalaryFilters] = useState(false);
  const [showOrderFilters, setShowOrderFilters] = useState(false);

  // טעינת נתונים
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [invoicesRes, salariesRes, ordersRes] = await Promise.all([
          api.get("/invoices"),
          api.get("/salaries"),
          api.get("/orders"),
        ]);

        setInvoices(invoicesRes.data?.data || invoicesRes.data || []);
        setSalaries(salariesRes.data?.data || salariesRes.data || []);
        // סנן את ההזמנה הנוכחית מהרשימה
        const allOrders = ordersRes.data?.data || ordersRes.data || [];
        setOrders(allOrders.filter(o => o._id !== order?._id));
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת נתונים");
      }
    };

    fetchData();
  }, [open, order?._id]);

  // איפוס בחירות בעת פתיחה
  useEffect(() => {
    if (open && order) {
      setSelectedInvoiceIds(order.linkedInvoices?.map(inv => inv._id || inv) || []);
      setSelectedSalaryIds(order.linkedSalaries?.map(sal => sal._id || sal) || []);
      setSelectedOrderIds(order.linkedOrders?.map(ord => ord._id || ord) || []);
    }
  }, [open, order]);

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

    // סינון לפי תאריך תשלום
    if (invoiceFilters.dateFrom) {
      const from = new Date(invoiceFilters.dateFrom);
      filtered = filtered.filter(inv => inv.paymentDate && new Date(inv.paymentDate) >= from);
    }
    if (invoiceFilters.dateTo) {
      const to = new Date(invoiceFilters.dateTo);
      filtered = filtered.filter(inv => inv.paymentDate && new Date(inv.paymentDate) <= to);
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

  // סינון הזמנות
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // חיפוש טקסט
    if (orderSearch) {
      const s = orderSearch.toLowerCase();
      filtered = filtered.filter((ord) =>
        ord.orderNumber?.toString().includes(s) ||
        ord.projectName?.toLowerCase().includes(s) ||
        ord.sum?.toString().includes(s)
      );
    }

    // סינון לפי סטטוס
    if (orderFilters.status !== "all") {
      filtered = filtered.filter(ord => ord.status === orderFilters.status);
    }

    return filtered;
  }, [orders, orderSearch, orderFilters]);

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

  // Toggle בחירת הזמנה
  const toggleOrder = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
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

  // בחירת כל ההזמנות המסוננות
  const selectAllOrders = () => {
    const allIds = filteredOrders.map(ord => ord._id);
    setSelectedOrderIds(prev => {
      const newIds = [...prev];
      allIds.forEach(id => {
        if (!newIds.includes(id)) newIds.push(id);
      });
      return newIds;
    });
  };

  // ביטול בחירת כל ההזמנות המסוננות
  const deselectAllOrders = () => {
    const filteredIds = filteredOrders.map(ord => ord._id);
    setSelectedOrderIds(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  // שמירה
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.put(`/orders/${order._id}/link`, {
        invoiceIds: selectedInvoiceIds,
        salaryIds: selectedSalaryIds,
        orderIds: selectedOrderIds,
      });

      toast.success("השיוך נשמר בהצלחה");
      onLinked?.(response.data.data);
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "שגיאה בשמירת השיוך";
      toast.error(errorMessage);
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
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            שיוך הזמנה לחשבוניות / משכורות / הזמנות
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Order Info */}
        <div className="bg-blue-50 px-6 py-3 border-b">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-slate-700">הזמנה:</span>
            <span>#{order?.orderNumber}</span>
            <span className="text-slate-500">{order?.projectName}</span>
            <span className="font-bold text-blue-600">{formatCurrency(order?.sum)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex-1 px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "invoices"
                ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
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
                ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="w-5 h-5" />
            משכורות ({selectedSalaryIds.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === "orders"
                ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            הזמנות ({selectedOrderIds.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "invoices" && (
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
                      className="w-full pr-10 pl-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowInvoiceFilters(!showInvoiceFilters)}
                    className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                      showInvoiceFilters ? "bg-blue-100 border-blue-500 text-blue-700" : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    סינון
                  </button>
                  <button
                    onClick={selectAllInvoices}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
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
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="all">הכל</option>
                        <option value="paid">שולמו</option>
                        <option value="unpaid">לא שולמו</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">תאריך תשלום מ:</label>
                      <input
                        type="date"
                        value={invoiceFilters.dateFrom}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">תאריך תשלום עד:</label>
                      <input
                        type="date"
                        value={invoiceFilters.dateTo}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setInvoiceFilters({ paymentStatus: "all", dateFrom: "", dateTo: "" })}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {selectedInvoiceIds.includes(invoice._id) ? (
                          <CheckSquare className="w-6 h-6 text-blue-500" />
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
                        <div className="font-bold text-blue-600">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {invoice.paymentDate ? formatDate(invoice.paymentDate) : "לא שולם"}
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          invoice.paid === "כן"
                            ? "bg-green-100 text-green-700"
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
          )}

          {activeTab === "salaries" && (
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
                      className="w-full pr-10 pl-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowSalaryFilters(!showSalaryFilters)}
                    className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                      showSalaryFilters ? "bg-blue-100 border-blue-500 text-blue-700" : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    סינון
                  </button>
                  <button
                    onClick={selectAllSalaries}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
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
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
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
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">הכל</option>
                        {[2023, 2024, 2025, 2026].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setSalaryFilters({ month: "", year: "" })}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {selectedSalaryIds.includes(salary._id) ? (
                          <CheckSquare className="w-6 h-6 text-blue-500" />
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
                        <div className="font-bold text-blue-600">
                          {formatCurrency(salary.finalAmount || salary.totalAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "orders" && (
            <>
              {/* Order Search & Filters */}
              <div className="p-4 border-b bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="חיפוש לפי מספר הזמנה, פרויקט, סכום..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowOrderFilters(!showOrderFilters)}
                    className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                      showOrderFilters ? "bg-blue-100 border-blue-500 text-blue-700" : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    סינון
                  </button>
                  <button
                    onClick={selectAllOrders}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={deselectAllOrders}
                    className="px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    נקה
                  </button>
                </div>

                {showOrderFilters && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">סטטוס:</label>
                      <select
                        value={orderFilters.status}
                        onChange={(e) => setOrderFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="px-3 py-1 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="all">הכל</option>
                        <option value="הוגש">הוגש</option>
                        <option value="לא הוגש">לא הוגש</option>
                        <option value="בעיבוד">בעיבוד</option>
                        <option value="הוגש חלקי">הוגש חלקי</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setOrderFilters({ status: "all" })}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      נקה סינון
                    </button>
                  </div>
                )}
              </div>

              {/* Order List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm text-slate-500 mb-2">
                  מציג {filteredOrders.length} הזמנות
                </div>
                <div className="space-y-2">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord._id}
                      onClick={() => toggleOrder(ord._id)}
                      className={`p-3 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 ${
                        selectedOrderIds.includes(ord._id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {selectedOrderIds.includes(ord._id) ? (
                          <CheckSquare className="w-6 h-6 text-blue-500" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900">
                          הזמנה #{ord.orderNumber}
                        </div>
                        <div className="text-sm text-slate-500">
                          {ord.projectName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {formatCurrency(ord.sum)}
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          ord.status === "הוגש"
                            ? "bg-green-100 text-green-700"
                            : ord.status === "בעיבוד"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {ord.status}
                        </span>
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
            נבחרו: {selectedInvoiceIds.length} חשבוניות, {selectedSalaryIds.length} משכורות, {selectedOrderIds.length} הזמנות
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
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-colors disabled:opacity-50"
            >
              {loading ? "שומר..." : "שמור שיוך"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
