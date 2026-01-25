import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import {
  DollarSign,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  ArrowUpDown,
  Link,
  CheckSquare,
  Square,
  MessageSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";
import IncomeLinkModal from "../../Components/IncomeLinkModal";

export default function ViewIncomes() {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [deleteModal, setDeleteModal] = useState({ open: false, incomeId: null });
  const [linkModal, setLinkModal] = useState({ open: false, income: null });

  // Multi-select
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const lastSelectedIdRef = useRef(null);

  // Bulk notes modal
  const [bulkNotesModal, setBulkNotesModal] = useState({ open: false });
  const [bulkNotes, setBulkNotes] = useState("");

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/incomes");
      setIncomes(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching incomes:", err);
      toast.error("שגיאה בטעינת ההכנסות");
    } finally {
      setLoading(false);
    }
  };

  const filteredIncomes = incomes
    .filter((income) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        income.description?.toLowerCase().includes(q) ||
        income.notes?.toLowerCase().includes(q) ||
        income.orderNumber?.toString().includes(q) ||
        income.amount?.toString().includes(q)
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "createdAt") {
        comparison = new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === "date") {
        comparison = new Date(b.date) - new Date(a.date);
      } else if (sortBy === "amount") {
        comparison = parseFloat(a.amount || 0) - parseFloat(b.amount || 0);
      } else if (sortBy === "description") {
        comparison = (a.description || "").localeCompare(b.description || "");
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const groupIncomesByMonth = (incomes) => {
    return incomes.reduce((acc, income) => {
      if (!income.createdAt) return acc;

      const date = new Date(income.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!acc[key]) {
        acc[key] = {
          year: date.getFullYear(),
          month: date.getMonth(),
          incomes: [],
        };
      }

      acc[key].incomes.push(income);
      return acc;
    }, {});
  };

  const HEBREW_MONTHS = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];
  const groupedIncomes = groupIncomesByMonth(filteredIncomes);

  const groupedByMonthSorted = Object.values(groupedIncomes)
    .map(group => {
      const sortedGroupIncomes = [...group.incomes].sort((a, b) => {
        let comparison = 0;

        if (sortBy === "createdAt") {
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
        } else if (sortBy === "date") {
          comparison = new Date(a.date) - new Date(b.date);
        } else if (sortBy === "amount") {
          comparison = parseFloat(a.amount || 0) - parseFloat(b.amount || 0);
        } else if (sortBy === "description") {
          comparison = (a.description || "").localeCompare(b.description || "");
        }

        return sortOrder === "asc" ? comparison : -comparison;

      });

      return {
        ...group,
        incomes: sortedGroupIncomes,
      };
    })
    // מיון חודשים – תמיד מהחדש לישן
    .sort(
      (a, b) => new Date(b.year, b.month) - new Date(a.year, a.month)
    );


  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatCurrency = (num) => {
    if (!num) return "₪0";
    return `₪${parseFloat(num).toLocaleString("he-IL")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/incomes/${deleteModal.incomeId}`);
      setIncomes(prev => prev.filter(i => i._id !== deleteModal.incomeId));
      toast.success("ההכנסה נמחקה בהצלחה");
      setDeleteModal({ open: false, incomeId: null });
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("שגיאה במחיקת הכנסה");
    }
  };

  // טיפול בשיוך מוצלח
  const handleLinked = (updatedIncome) => {
    setIncomes(prev =>
      prev.map(inc => inc._id === updatedIncome._id ? updatedIncome : inc)
    );
    setLinkModal({ open: false, income: null });
  };

  // חישוב סה"כ
  const totalAmount = filteredIncomes.reduce(
    (sum, income) => sum + parseFloat(income.amount || 0),
    0
  );

  // Multi-select functions
  const toggleSelectIncome = (income, event = null) => {
    const currentId = income._id;
    const currentIndex = filteredIncomes.findIndex(i => i._id === currentId);

    const lastId = lastSelectedIdRef.current;
    const lastIndex = lastId
      ? filteredIncomes.findIndex(i => i._id === lastId)
      : -1;

    // בחירה רגילה — מעגנים
    if (!event?.shiftKey || lastIndex === -1) {
      setSelectedIncomes(prev => {
        const exists = prev.some(i => i._id === currentId);
        return exists
          ? prev.filter(i => i._id !== currentId)
          : [...prev, income];
      });

      // anchor נקבע רק פה
      lastSelectedIdRef.current = currentId;
      return;
    }

    // Shift selection — טווח אמיתי
    const start = Math.min(lastIndex, currentIndex);
    const end = Math.max(lastIndex, currentIndex);
    const range = filteredIncomes.slice(start, end + 1);

    setSelectedIncomes(prev => {
      const map = new Map(prev.map(i => [i._id, i]));
      range.forEach(i => map.set(i._id, i));
      return Array.from(map.values());
    });

    // לא מעדכנים anchor כאן
  };

  const selectAll = () => {
    setSelectedIncomes([...filteredIncomes]);
  };

  const selectNone = () => {
    setSelectedIncomes([]);
    lastSelectedIdRef.current = null;
  };

  const isSelected = (income) => selectedIncomes.some((i) => i._id === income._id);

  // Bulk notes update
  const handleBulkNotesUpdate = async () => {
    if (selectedIncomes.length === 0) {
      toast.error("לא נבחרו הכנסות");
      return;
    }

    try {
      const incomeIds = selectedIncomes.map((i) => i._id);
      await api.put("/incomes/bulk/notes", { incomeIds, notes: bulkNotes });
      toast.success(`עודכנו ${selectedIncomes.length} הכנסות`);
      setBulkNotesModal({ open: false });
      setBulkNotes("");
      setSelectedIncomes([]);
      await fetchIncomes();
    } catch (err) {
      console.error("Bulk notes error:", err);
      toast.error("שגיאה בעדכון הערות");
    }
  };

  // Get link display - returns JSX for multiple links
  const getLinkDisplay = (income) => {
    const links = [];

    // שיוכים מרובים חדשים
    if (income.linkedInvoices?.length > 0) {
      links.push(
        <span key="invoices" className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-1">
          {income.linkedInvoices.length} חשבוניות
        </span>
      );
    }
    if (income.linkedSalaries?.length > 0) {
      links.push(
        <span key="salaries" className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mr-1">
          {income.linkedSalaries.length} משכורות
        </span>
      );
    }
    if (income.linkedOrders?.length > 0) {
      links.push(
        <span key="orders" className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 mr-1">
          {income.linkedOrders.length} הזמנות
        </span>
      );
    }

    // שיוך ישן (orderId בודד)
    if (links.length === 0 && income.orderId && income.orderNumber) {
      return <span>הזמנה #{income.orderNumber}</span>;
    }
    if (links.length === 0 && income.invoiceId?.invoiceNumber) {
      return <span>חשבונית #{income.invoiceId.invoiceNumber}</span>;
    }
    if (links.length === 0 && income.supplierId?.name) {
      return <span>{income.supplierId.name}</span>;
    }
    if (links.length === 0 && income.linkedIncomeId?.description) {
      return <span>הכנסה: {income.linkedIncomeId.description.substring(0, 20)}...</span>;
    }

    if (links.length > 0) {
      return <div className="flex flex-wrap gap-1">{links}</div>;
    }

    return <span className="text-slate-400">—</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-2xl text-slate-900">
          טוען הכנסות...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      הכנסות
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      סה"כ {filteredIncomes.length} הכנסות
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/create-income")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">הכנסה חדשה</span>
                </button>
              </div>

              {/* Selection controls */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200 transition-all"
                >
                  <CheckSquare className="w-4 h-4" />
                  סמן הכל
                </button>
                <button
                  onClick={selectNone}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  <Square className="w-4 h-4" />
                  בטל הכל
                </button>
                {selectedIncomes.length > 0 && (
                  <>
                    <span className="px-3 py-2 bg-orange-100 text-orange-800 font-bold rounded-xl">
                      {selectedIncomes.length} נבחרו
                    </span>
                    <button
                      onClick={() => setBulkNotesModal({ open: true })}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      הוסף הערה לנבחרים
                    </button>
                  </>
                )}
              </div>

              {/* Search */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש לפי תיאור, הערות או מספר הזמנה..."
                    className="w-full pr-12 pl-4 py-3 border-2 border-orange-200 rounded-xl bg-white focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sort Controls */}
        <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleSort("createdAt")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${sortBy === "createdAt"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
              <Calendar className="w-4 h-4" />
              תאריך יצירה
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleSort("date")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${sortBy === "date"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
              <Calendar className="w-4 h-4" />
              תאריך חשבונית
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleSort("amount")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${sortBy === "amount"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
              <DollarSign className="w-4 h-4" />
              סכום
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleSort("description")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${sortBy === "description"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
            >
              <FileText className="w-4 h-4" />
              תיאור
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Incomes Groups */}
        {filteredIncomes.length > 0 ? (
          <div className="space-y-8">
            {groupedByMonthSorted.map((group) => (
              <div key={`${group.year}-${group.month}`} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
                {/* כותרת חודש ושנה */}
                <h2 className="text-xl font-bold text-slate-900 mb-6 ">
                  {HEBREW_MONTHS[group.month]} {group.year} <span className="text-sm"> ({group.incomes.length})</span>
                </h2>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                      <tr>
                        <th className="px-4 py-4 text-center text-sm font-bold text-white w-14">
                          <input
                            type="checkbox"
                            checked={selectedIncomes.length === filteredIncomes.length && filteredIncomes.length > 0}
                            onChange={(e) => e.target.checked ? selectAll() : selectNone()}
                            className="w-5 h-5 rounded border-2 border-white cursor-pointer accent-orange-500"
                          />
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          תאריך
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          סכום
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          תיאור
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          שויך ל
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          סטטוס
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          הערות
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-white">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-orange-100">
                      {group.incomes.map((income, index) => (
                        <tr
                          key={income._id}
                          className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-orange-50/30"} ${isSelected(income) ? "bg-orange-100" : ""}`}
                          onClick={() => navigate(`/incomes/${income._id}`)}
                        >
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected(income)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectIncome(income, e.nativeEvent);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded border-2 border-orange-300 cursor-pointer accent-orange-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {formatDate(income.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                              {formatCurrency(income.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {income.description}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {getLinkDisplay(income)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {income.isCredited === "כן" ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                שויך ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                לא שויך
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {income.notes ? (
                              <span className="truncate max-w-xs block">
                                {income.notes}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/incomes/${income._id}`);
                                }}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="צפייה"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/update-income/${income._id}`);
                                }}
                                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                title="עריכה"
                              >
                                <Edit2 className="w-4 h-4 text-orange-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkModal({ open: true, income: income });
                                }}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                title="שייך להזמנה"
                              >
                                <Link className="w-4 h-4 text-purple-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({ open: true, incomeId: income._id });
                                }}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="מחיקה"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {group.incomes.map((income) => (
                    <div
                      key={income._id}
                      onClick={() => navigate(`/incomes/${income._id}`)}
                      className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all border border-orange-100 p-4 cursor-pointer"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-orange-100">
                        <div>
                          <div className="text-xs text-slate-500">תאריך</div>
                          <div className="text-sm font-medium text-slate-700">
                            {formatDate(income.date)}
                          </div>
                        </div>
                        <div className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                          {formatCurrency(income.amount)}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 mb-1">תיאור</div>
                        <div className="text-sm font-medium text-slate-900">
                          {income.description}
                        </div>
                      </div>

                      {/* Link & Status */}
                      <div className="mb-3 flex items-center gap-3">
                        {getLinkDisplay(income) !== "—" && (
                          <div className="flex-1">
                            <div className="text-xs text-slate-500 mb-1">שויך ל</div>
                            <div className="text-sm font-medium text-slate-700">
                              {getLinkDisplay(income)}
                            </div>
                          </div>
                        )}
                        <div>
                          {income.isCredited === "כן" ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                              שויך ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              לא שויך
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      {income.notes && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-500 mb-1">הערות</div>
                          <div className="text-sm text-slate-600">
                            {income.notes}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/incomes/${income._id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>צפייה</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/update-income/${income._id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>עריכה</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkModal({ open: true, income: income });
                          }}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                          title="שייך להזמנה"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ open: true, incomeId: income._id });
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative mb-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden p-12 text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-orange-400 opacity-50" />
              <p className="font-bold text-xl text-slate-600">
                {searchTerm ? "לא נמצאו הכנסות" : "אין הכנסות להצגה"}
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        {filteredIncomes.length > 0 && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mt-8">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-700">סה"כ הכנסות:</span>
              <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-md w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  האם אתה בטוח?
                </h3>
                <p className="text-slate-600">
                  פעולה זו תמחק את ההכנסה לצמיתות ולא ניתן לשחזר אותה.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                >
                  מחק
                </button>
                <button
                  onClick={() => setDeleteModal({ open: false, incomeId: null })}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      <IncomeLinkModal
        open={linkModal.open}
        onClose={() => setLinkModal({ open: false, income: null })}
        income={linkModal.income}
        onLinked={handleLinked}
      />

      {/* Bulk Notes Modal */}
      {bulkNotesModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-lg w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-violet-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      הוספת הערה ל-{selectedIncomes.length} הכנסות
                    </h3>
                    <p className="text-xs text-slate-600">
                      ההערה תחליף את ההערות הקיימות
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBulkNotesModal({ open: false })}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="הכנס הערה..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={handleBulkNotesUpdate}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 transition-all shadow-lg"
                >
                  עדכן הערות
                </button>
                <button
                  onClick={() => setBulkNotesModal({ open: false })}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}