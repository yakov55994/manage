import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import {
  Users,
  Search,
  ArrowUpDown,
  Building2,
  DollarSign,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

export default function View_Salaries() {
  const navigate = useNavigate();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date, employeeName, finalAmount
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc

  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await api.get("/salaries");
      setSalaries(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching salaries:", err);
      toast.error("שגיאה בטעינת המשכורות");
    } finally {
      setLoading(false);
    }
  };

  const filteredSalaries = salaries
    .filter((salary) => {
      const q = searchTerm.toLowerCase();
      return (
        salary.employeeName?.toLowerCase().includes(q) ||
        salary.department?.toLowerCase().includes(q) ||
        salary.projectId?.name?.toLowerCase().includes(q) ||
        salary.createdByName?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison = new Date(b.date) - new Date(a.date);
      } else if (sortBy === "employeeName") {
        comparison = (a.employeeName || "").localeCompare(b.employeeName || "");
      } else if (sortBy === "finalAmount") {
        comparison = (a.finalAmount || 0) - (b.finalAmount || 0);
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
    return `₪${Number(num).toLocaleString("he-IL")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען משכורות...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    הצגת משכורות
                  </h1>
                  <p className="text-sm font-medium text-slate-600 mt-2">
                    סה"כ {filteredSalaries.length} משכורות
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 p-6 border border-white/50">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש לפי שם עובד, מחלקה, פרויקט..."
                  className="w-full pr-12 pl-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Sort Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSort("date")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
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
                  onClick={() => toggleSort("employeeName")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                    sortBy === "employeeName"
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
                >
                  <User className="w-4 h-4" />
                  שם
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleSort("finalAmount")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                    sortBy === "finalAmount"
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                      : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  סכום
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Salaries Table */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {filteredSalaries.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 mx-auto mb-4 text-orange-400 opacity-50" />
                <p className="font-bold text-xl text-slate-600">
                  {searchTerm ? "לא נמצאו משכורות" : "אין משכורות להצגה"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        שם עובד
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        מחלקה
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        פרויקט
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        שכר בסיס
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        תקורה
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        סכום סופי
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                        תאריך
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                        נוצר ע"י
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-orange-100">
                    {filteredSalaries.map((salary, index) => (
                      <tr
                        key={salary._id}
                        className={`hover:bg-orange-50/50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-orange-50/30"
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-orange-500" />
                            <span className="font-bold text-slate-900">
                              {salary.employeeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-slate-600">
                              {salary.department || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-slate-600">
                              {salary.projectId?.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="font-bold text-slate-700">
                            {formatCurrency(salary.baseAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            {salary.overheadPercent || 0}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                            {formatCurrency(salary.finalAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">
                          {formatDate(salary.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {salary.createdByName || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card */}
        {filteredSalaries.length > 0 && (
          <div className="relative mt-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 p-6 border border-white/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                  <p className="text-sm font-bold text-orange-600 mb-2">
                    סה"כ שכר בסיס
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(
                      filteredSalaries.reduce(
                        (sum, s) => sum + (s.baseAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                  <p className="text-sm font-bold text-amber-600 mb-2">
                    סה"כ סכום סופי
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatCurrency(
                      filteredSalaries.reduce(
                        (sum, s) => sum + (s.finalAmount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
                  <p className="text-sm font-bold text-yellow-600 mb-2">
                    מספר עובדים
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {filteredSalaries.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
