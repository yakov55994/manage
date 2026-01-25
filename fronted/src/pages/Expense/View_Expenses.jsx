import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import {
  TrendingDown,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  ArrowUpDown,
  CheckSquare,
  Square,
  MessageSquare,
  Link,
} from "lucide-react";
import { toast } from "sonner";
import ExpenseLinkModal from "../../Components/ExpenseLinkModal";

export default function ViewExpenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [deleteModal, setDeleteModal] = useState({ open: false, expenseId: null });
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const lastSelectedIdRef = useRef(null);
  const [bulkNoteModal, setBulkNoteModal] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [linkModal, setLinkModal] = useState({ open: false, expense: null });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/expenses");
      setExpenses(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      toast.error("שגיאה בטעינת ההוצאות");
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses
    .filter((expense) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        expense.description?.toLowerCase().includes(q) ||
        expense.notes?.toLowerCase().includes(q) ||
        expense.reference?.toString().includes(q) ||
        expense.amount?.toString().includes(q)
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

  const groupExpensesByMonth = (expenses) => {
    return expenses.reduce((acc, expense) => {
      if (!expense.createdAt) return acc;

      const date = new Date(expense.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!acc[key]) {
        acc[key] = {
          year: date.getFullYear(),
          month: date.getMonth(),
          expenses: [],
        };
      }

      acc[key].expenses.push(expense);
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

  const groupedExpenses = groupExpensesByMonth(filteredExpenses);

  const groupedByMonthSorted = Object.values(groupedExpenses)
    .map(group => {
      const sortedGroupExpenses = [...group.expenses].sort((a, b) => {
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
        expenses: sortedGroupExpenses,
      };
    })
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
      await api.delete(`/expenses/${deleteModal.expenseId}`);
      setExpenses(prev => prev.filter(e => e._id !== deleteModal.expenseId));
      toast.success("ההוצאה נמחקה בהצלחה");
      setDeleteModal({ open: false, expenseId: null });
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("שגיאה במחיקת הוצאה");
    }
  };

  // פונקציות בחירה
  const toggleSelectExpense = (expense, event = null) => {
    const currentId = expense._id;
    const currentIndex = filteredExpenses.findIndex(e => e._id === currentId);

    const lastId = lastSelectedIdRef.current;
    const lastIndex = lastId
      ? filteredExpenses.findIndex(e => e._id === lastId)
      : -1;

    // בחירה רגילה — מעגנים
    if (!event?.shiftKey || lastIndex === -1) {
      setSelectedExpenses(prev => {
        const exists = prev.some(e => e._id === currentId);
        return exists
          ? prev.filter(e => e._id !== currentId)
          : [...prev, expense];
      });

      // anchor נקבע רק פה
      lastSelectedIdRef.current = currentId;
      return;
    }

    // Shift selection — טווח אמיתי
    const start = Math.min(lastIndex, currentIndex);
    const end = Math.max(lastIndex, currentIndex);
    const range = filteredExpenses.slice(start, end + 1);

    setSelectedExpenses(prev => {
      const map = new Map(prev.map(e => [e._id, e]));
      range.forEach(e => map.set(e._id, e));
      return Array.from(map.values());
    });

    // לא מעדכנים anchor כאן
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
      lastSelectedIdRef.current = null;
    } else {
      setSelectedExpenses(filteredExpenses);
    }
  };

  const selectNone = () => {
    setSelectedExpenses([]);
    lastSelectedIdRef.current = null;
  };

  // עדכון הערות מרוכז
  const handleBulkNoteUpdate = async () => {
    try {
      const expenseIds = selectedExpenses.map(e => e._id);
      await api.put("/expenses/bulk/notes", { expenseIds, notes: bulkNote });

      // עדכון מקומי
      setExpenses(prev =>
        prev.map(exp =>
          expenseIds.includes(exp._id)
            ? { ...exp, notes: bulkNote }
            : exp
        )
      );

      toast.success(`עודכנו הערות ל-${selectedExpenses.length} הוצאות`);
      setBulkNoteModal(false);
      setBulkNote("");
      setSelectedExpenses([]);
    } catch (err) {
      console.error("Bulk note error:", err);
      toast.error("שגיאה בעדכון ההערות");
    }
  };

  // חישוב סה"כ
  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-2xl text-slate-900">
          טוען הוצאות...
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
                    <TrendingDown className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                      הוצאות
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      סה"כ {filteredExpenses.length} הוצאות
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/create-expense")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">הוצאה חדשה</span>
                </button>
              </div>

              {/* Search */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש לפי תיאור, הערות או אסמכתא..."
                    className="w-full pr-12 pl-4 py-3 border-2 border-orange-200 rounded-xl bg-white focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sort & Selection Controls */}
        <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/50">
          <div className="flex flex-wrap gap-2 items-center justify-between">
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
                תאריך הוצאה
                <ArrowUpDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => toggleSort("amount")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${sortBy === "amount"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
              >
                <TrendingDown className="w-4 h-4" />
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

            {/* כפתורי בחירה */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-all text-xs font-bold"
              >
                <CheckSquare className="w-4 h-4" />
                סמן הכל
              </button>
              <button
                onClick={selectNone}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-xs font-bold"
              >
                <Square className="w-4 h-4" />
                בטל הכל
              </button>
              {selectedExpenses.length > 0 && (
                <button
                  onClick={() => setBulkNoteModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-xs font-bold"
                >
                  <MessageSquare className="w-4 h-4" />
                  הוסף הערה ל-{selectedExpenses.length} נבחרים
                </button>
              )}
            </div>
          </div>

          {selectedExpenses.length > 0 && (
            <div className="mt-2 text-sm text-orange-600 font-medium">
              {selectedExpenses.length} הוצאות נבחרו • לחץ Shift + לחיצה לבחירת טווח
            </div>
          )}
        </div>

        {/* Expenses Groups */}
        {filteredExpenses.length > 0 ? (
          <div className="space-y-8">
            {groupedByMonthSorted.map((group) => (
              <div key={`${group.year}-${group.month}`} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/50">
                {/* כותרת חודש ושנה */}
                <h2 className="text-xl font-bold text-slate-900 mb-6 ">
                  {HEBREW_MONTHS[group.month]} {group.year} <span className="text-sm"> ({group.expenses.length})</span>
                </h2>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                      <tr>
                        <th className="px-4 py-4 text-center text-sm font-bold text-white">בחר</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">תאריך</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">סכום</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">תיאור</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">אסמכתא</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">הערות</th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">שויך</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-white">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-orange-100">
                      {group.expenses.map((expense, index) => (
                        <tr
                          key={expense._id}
                          className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${selectedExpenses.some(e => e._id === expense._id) ? "bg-orange-100" : index % 2 === 0 ? "bg-white" : "bg-orange-50/30"
                            }`}
                          onClick={() => navigate(`/expenses/${expense._id}`)}
                        >
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedExpenses.some(e => e._id === expense._id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectExpense(expense, e.nativeEvent);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 accent-orange-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {formatDate(expense.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                              {formatCurrency(expense.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {expense.reference || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {expense.notes ? (
                              <span className="truncate max-w-xs block">{expense.notes}</span>
                            ) : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {(expense.linkedInvoices?.length > 0 || expense.linkedSalaries?.length > 0 || expense.linkedOrders?.length > 0) ? (
                              <div className="space-y-1">
                                {expense.linkedInvoices?.length > 0 && (
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <Link className="w-3 h-3" />
                                    <span className="text-xs">
                                      {expense.linkedInvoices.length} חשבוניות
                                    </span>
                                  </div>
                                )}
                                {expense.linkedSalaries?.length > 0 && (
                                  <div className="flex items-center gap-1 text-purple-600">
                                    <Link className="w-3 h-3" />
                                    <span className="text-xs">
                                      {expense.linkedSalaries.length} משכורות
                                    </span>
                                  </div>
                                )}
                                {expense.linkedOrders?.length > 0 && (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <Link className="w-3 h-3" />
                                    <span className="text-xs">
                                      {expense.linkedOrders.length} הזמנות
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">לא שויך</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/expenses/${expense._id}`);
                                }}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="צפייה"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/update-expense/${expense._id}`);
                                }}
                                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                title="עריכה"
                              >
                                <Edit2 className="w-4 h-4 text-red-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkModal({ open: true, expense });
                                }}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                title="שיוך לחשבוניות/משכורות"
                              >
                                <Link className="w-4 h-4 text-purple-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({ open: true, expenseId: expense._id });
                                }}
                                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
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
                  {group.expenses.map((expense) => (
                    <div
                      key={expense._id}
                      onClick={() => navigate(`/expenses/${expense._id}`)}
                      className={`bg-white/90 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all border border-orange-100 p-4 cursor-pointer ${selectedExpenses.some(e => e._id === expense._id) ? "ring-2 ring-orange-500" : ""
                        }`}
                    >
                      {/* Checkbox + Header */}
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-orange-100">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.some(e => e._id === expense._id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectExpense(expense, e.nativeEvent);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 accent-orange-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500">תאריך</div>
                          <div className="text-sm font-medium text-slate-700">
                            {formatDate(expense.date)}
                          </div>
                        </div>
                        <div className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 mb-1">תיאור</div>
                        <div className="text-sm font-medium text-slate-900">
                          {expense.description}
                        </div>
                      </div>

                      {/* Reference */}
                      {expense.reference && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-500 mb-1">אסמכתא</div>
                          <div className="text-sm text-slate-700">{expense.reference}</div>
                        </div>
                      )}

                      {/* Notes */}
                      {expense.notes && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-500 mb-1">הערות</div>
                          <div className="text-sm text-slate-600">{expense.notes}</div>
                        </div>
                      )}

                      {/* שיוך */}
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 mb-1">שויך</div>
                        {(expense.linkedInvoices?.length > 0 || expense.linkedSalaries?.length > 0 || expense.linkedOrders?.length > 0) ? (
                          <div className="flex flex-wrap gap-2">
                            {expense.linkedInvoices?.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                                <Link className="w-3 h-3" />
                                {expense.linkedInvoices.length} חשבוניות
                              </span>
                            )}
                            {expense.linkedSalaries?.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs">
                                <Link className="w-3 h-3" />
                                {expense.linkedSalaries.length} משכורות
                              </span>
                            )}
                            {expense.linkedOrders?.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">
                                <Link className="w-3 h-3" />
                                {expense.linkedOrders.length} הזמנות
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">לא שויך</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/expenses/${expense._id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>צפייה</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/update-expense/${expense._id}`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>עריכה</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkModal({ open: true, expense });
                          }}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ open: true, expenseId: expense._id });
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
              <TrendingDown className="w-16 h-16 mx-auto mb-4 text-orange-400 opacity-50" />
              <p className="font-bold text-xl text-slate-600">
                {searchTerm ? "לא נמצאו הוצאות" : "אין הוצאות להצגה"}
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        {filteredExpenses.length > 0 && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mt-8">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-700">סה"כ הוצאות:</span>
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
            <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  האם אתה בטוח?
                </h3>
                <p className="text-slate-600">
                  פעולה זו תמחק את ההוצאה לצמיתות ולא ניתן לשחזר אותה.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
                >
                  מחק
                </button>
                <button
                  onClick={() => setDeleteModal({ open: false, expenseId: null })}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Note Modal */}
      {bulkNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-lg w-full">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-violet-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  הוספת הערה מרוכזת
                </h3>
                <p className="text-slate-600">
                  הוסף הערה ל-{selectedExpenses.length} הוצאות נבחרות
                </p>
              </div>

              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="הקלד הערה..."
                className="w-full p-4 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all resize-none"
                rows={4}
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBulkNoteUpdate}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 transition-all shadow-lg"
                >
                  עדכן הערות
                </button>
                <button
                  onClick={() => {
                    setBulkNoteModal(false);
                    setBulkNote("");
                  }}
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
      <ExpenseLinkModal
        open={linkModal.open}
        onClose={() => setLinkModal({ open: false, expense: null })}
        expense={linkModal.expense}
        onLinked={(updatedExpense) => {
          setExpenses(prev =>
            prev.map(exp => exp._id === updatedExpense._id ? updatedExpense : exp)
          );
        }}
      />
    </div>
  );
}
