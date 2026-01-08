import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import OrderSelector from "../../Components/OrderSelector";

export default function ViewIncomes() {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [deleteModal, setDeleteModal] = useState({ open: false, incomeId: null });
  const [linkModal, setLinkModal] = useState({ open: false, incomeId: null });
  const [linking, setLinking] = useState(false);

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

      if (sortBy === "date") {
        comparison = new Date(b.date) - new Date(a.date);
      } else if (sortBy === "amount") {
        comparison = parseFloat(a.amount || 0) - parseFloat(b.amount || 0);
      } else if (sortBy === "description") {
        comparison = (a.description || "").localeCompare(b.description || "");
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

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

  const handleLinkToInvoice = async (invoice) => {
    try {
      setLinking(true);
      const currentIncome = incomes.find(i => i._id === linkModal.incomeId);

      // אם אין הזמנה - ביטול שיוך
      if (!invoice) {
        await api.put(`/incomes/${linkModal.incomeId}`, {
          orderId: null,
          isCredited: "לא",
          date: currentIncome.date,
          amount: currentIncome.amount,
          description: currentIncome.description,
          notes: currentIncome.notes,
        });
        toast.success("השיוך בוטל בהצלחה!");
      } else {
        // שיוך להזמנה חדשה
        await api.put(`/incomes/${linkModal.incomeId}`, {
          orderId: invoice._id,
          isCredited: "כן",
          date: currentIncome.date,
          amount: currentIncome.amount,
          description: currentIncome.description,
          notes: currentIncome.notes,
        });
        toast.success("ההכנסה שויכה להזמנה בהצלחה!");
      }

      // Refresh the incomes list to show updated data
      await fetchIncomes();

      setLinkModal({ open: false, incomeId: null });
    } catch (err) {
      console.error("Link error:", err);
      toast.error("שגיאה בעדכון השיוך");
    } finally {
      setLinking(false);
    }
  };

  // חישוב סה"כ
  const totalAmount = filteredIncomes.reduce(
    (sum, income) => sum + parseFloat(income.amount || 0),
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
              onClick={() => toggleSort("date")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                sortBy === "date"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
              }`}
            >
              <Calendar className="w-4 h-4" />
              תאריך
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleSort("amount")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                sortBy === "amount"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                sortBy === "description"
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

        {/* Incomes Table */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
            {filteredIncomes.length === 0 ? (
              <div className="text-center py-20">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-orange-400 opacity-50" />
                <p className="font-bold text-xl text-slate-600">
                  {searchTerm ? "לא נמצאו הכנסות" : "אין הכנסות להצגה"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                      <tr>
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
                          הזמנה
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-white">
                          זוכה
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
                      {filteredIncomes.map((income, index) => (
                        <tr
                          key={income._id}
                          className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${
                            index % 2 === 0 ? "bg-white" : "bg-orange-50/30"
                          }`}
                          onClick={() => navigate(`/incomes/${income._id}`)}
                        >
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
                            {income.orderNumber ? `הזמנה #${income.orderNumber}` : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {income.isCredited === "כן" ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                זוכה ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                לא זוכה
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
                                  setLinkModal({ open: true, incomeId: income._id });
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
                <div className="lg:hidden space-y-4 p-4">
                  {filteredIncomes.map((income) => (
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

                      {/* Invoice & Status */}
                      <div className="mb-3 flex items-center gap-3">
                        {income.orderNumber && (
                          <div className="flex-1">
                            <div className="text-xs text-slate-500 mb-1">הזמנה</div>
                            <div className="text-sm font-medium text-slate-700">
                              הזמנה #{income.orderNumber}
                            </div>
                          </div>
                        )}
                        <div>
                          {income.isCredited === "כן" ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                              זוכה ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              לא זוכה
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
                            setLinkModal({ open: true, incomeId: income._id });
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
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        {filteredIncomes.length > 0 && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
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

      {/* Link to Invoice Modal */}
      {linkModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-violet-500 rounded-3xl opacity-20 blur-2xl"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-6">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                    <Link className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      שייך הכנסה להזמנה
                    </h3>
                    <p className="text-xs text-slate-600">
                      בחר הזמנה לשיוך או בטל שיוך קיים
                    </p>
                  </div>
                </div>
              </div>

              <OrderSelector
                value={incomes.find(i => i._id === linkModal.incomeId)?.orderId?._id || null}
                onSelect={handleLinkToInvoice}
                allowClear={true}
                label="בחר הזמנה לשיוך"
                placeholder="חפש הזמנה..."
              />

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setLinkModal({ open: false, incomeId: null })}
                  disabled={linking}
                  className="px-5 py-2 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
