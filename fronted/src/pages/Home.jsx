import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/api";
import { ClipLoader } from "react-spinners";
import {
  Briefcase,
  FileText,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowLeft,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  BudgetVsExpensesChart,
  IncomeVsExpensesChart,
  PaymentStatusChart,
  ChartCard,
} from "../Components/charts";

const Home = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isAuthenticated, canViewAnyProject, canViewModule } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({ budgetVsExpenses: [], incomeVsExpenses: [], paymentStatus: null });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "בוקר טוב";
    if (hour >= 12 && hour < 17) return "צהריים טובים";
    if (hour >= 17 && hour < 21) return "ערב טוב";
    return "לילה טוב";
  };

  const formatCurrency = (num) => {
    const n = Number(num) || 0;
    return `₪${n.toLocaleString("he-IL")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const result = {};

      if (isAdmin) {
        const [projectsRes, ordersRes, invoicesRes, suppliersRes, incomesRes, expensesRes] =
          await Promise.all([
            api.get("/projects"),
            api.get("/orders"),
            api.get("/invoices"),
            api.get("/suppliers"),
            api.get("/incomes"),
            api.get("/expenses"),
          ]);

        const projects = projectsRes.data?.data || [];
        const orders = ordersRes.data?.data || [];
        const invoices = invoicesRes.data?.data || [];
        const suppliers = suppliersRes.data?.data || [];
        const incomes = incomesRes.data?.data || [];
        const expenses = expensesRes.data?.data || [];

        // סיכומים
        result.projectsCount = projects.length;
        result.ordersCount = orders.length;
        result.ordersTotal = orders.reduce((s, o) => s + (Number(o.sum) || 0), 0);
        result.suppliersCount = suppliers.length;

        // חשבוניות
        const unpaidInvoices = invoices.filter((i) => i.paid !== "כן");
        const pendingPayment = invoices.filter((i) => i.paid === "יצא לתשלום");
        result.invoicesCount = invoices.length;
        result.unpaidCount = unpaidInvoices.length;
        result.unpaidAmount = unpaidInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
        result.pendingPaymentCount = pendingPayment.length;
        result.pendingPaymentAmount = pendingPayment.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);

        // הכנסות והוצאות
        result.totalIncome = incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        result.totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        result.balance = result.totalIncome - result.totalExpenses;

        // פרויקטים שחורגים מתקציב
        result.overBudgetProjects = projects.filter(
          (p) => p.budget > 0 && p.remainingBudget < 0
        );

        // פעילות אחרונה - 8 פריטים אחרונים
        const recentItems = [];
        invoices
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
          .forEach((inv) => {
            recentItems.push({
              type: "invoice",
              text: `חשבונית #${inv.invoiceNumber}`,
              detail: inv.supplierId?.name || inv.invitingName || "",
              amount: inv.totalAmount,
              date: inv.createdAt,
              path: `/invoices/${inv._id}`,
            });
          });
        orders
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
          .forEach((ord) => {
            recentItems.push({
              type: "order",
              text: `הזמנה #${ord.orderNumber}`,
              detail: ord.invitingName || "",
              amount: ord.sum,
              date: ord.createdAt,
              path: `/orders/${ord._id}`,
            });
          });
        result.recentActivity = recentItems
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 6);
      } else {
        // משתמש רגיל - רק מה שיש לו גישה
        const requests = [];
        const requestKeys = [];

        if (canViewAnyProject()) {
          requests.push(api.get("/projects"));
          requestKeys.push("projects");
        }
        if (canViewModule(null, "orders")) {
          requests.push(api.get("/orders"));
          requestKeys.push("orders");
        }
        if (canViewModule(null, "invoices")) {
          requests.push(api.get("/invoices"));
          requestKeys.push("invoices");
        }

        const responses = await Promise.all(requests);
        const dataMap = {};
        requestKeys.forEach((key, i) => {
          dataMap[key] = responses[i].data?.data || [];
        });

        result.projectsCount = dataMap.projects?.length || 0;
        result.ordersCount = dataMap.orders?.length || 0;
        result.ordersTotal = (dataMap.orders || []).reduce((s, o) => s + (Number(o.sum) || 0), 0);
        result.invoicesCount = dataMap.invoices?.length || 0;
      }

      setStats(result);

      // טעינת נתוני גרפים למנהל
      if (isAdmin) {
        try {
          const [budgetRes, incomeExpenseRes, paymentRes] = await Promise.all([
            api.get("/projects/analytics/budget-vs-expenses"),
            api.get("/analytics/income-vs-expenses?months=6"),
            api.get("/invoices/analytics/payment-status"),
          ]);
          setAnalyticsData({
            budgetVsExpenses: budgetRes.data?.data || [],
            incomeVsExpenses: incomeExpenseRes.data?.data || [],
            paymentStatus: paymentRes.data?.data || null,
          });
        } catch (analyticsErr) {
          console.error("Error fetching analytics:", analyticsErr);
        } finally {
          setAnalyticsLoading(false);
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // אם לא מחובר - דף נחיתה פשוט
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-gray-900 to-black -z-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-bl from-orange-500/20 to-amber-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-500/15 to-yellow-500/15 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="backdrop-blur-xl bg-white/10 p-8 sm:p-12 rounded-3xl shadow-2xl text-center border border-white/20 max-w-lg">
            <Settings className="w-16 h-16 text-orange-400 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-4">
              ניהולון
            </h1>
            <p className="text-lg text-gray-300 mb-8">מערכת ניהול פרויקטים וכספים</p>
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-orange-500/30"
            >
              התחברות למערכת
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <ClipLoader size={80} color="#f97316" loading />
        <p className="mt-6 text-lg font-bold text-slate-600">טוען נתונים...</p>
      </div>
    );
  }

  const hebrewDate = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getHebrewCalendarDate = () => {
    const toGematria = (num) => {
      const letters = [
        [400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"],
        [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"], [10, "י"],
        [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"],
      ];
      let result = "";
      let remaining = num;
      for (const [val, letter] of letters) {
        while (remaining >= val) {
          if (remaining === 15) { result += "טו"; remaining = 0; break; }
          if (remaining === 16) { result += "טז"; remaining = 0; break; }
          result += letter;
          remaining -= val;
        }
      }
      if (result.length > 1) {
        result = result.slice(0, -1) + "״" + result.slice(-1);
      } else if (result.length === 1) {
        result += "׳";
      }
      return result;
    };

    const formatter = new Intl.DateTimeFormat("he-u-ca-hebrew", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = formatter.formatToParts(new Date());
    const dayNum = parseInt(parts.find((p) => p.type === "day")?.value);
    const month = parts.find((p) => p.type === "month")?.value;
    const yearNum = parseInt(parts.find((p) => p.type === "year")?.value);

    return `${toGematria(dayNum)} ב${month} ${toGematria(yearNum % 1000)}`;
  };

  const hebrewCalendarDate = getHebrewCalendarDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pb-8">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Greeting Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 p-5 sm:p-8 border border-white/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                  {getGreeting()}, {user?.username || "משתמש"}
                </h1>
                <p className="text-sm sm:text-base text-slate-500 mt-1">{hebrewDate}</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{hebrewCalendarDate}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <Settings className="w-5 h-5" />
                <span className="font-bold text-sm">ניהולון</span>
              </div>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <>
            {/* Admin Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <SummaryCard
                icon={Briefcase}
                label="פרויקטים"
                value={stats?.projectsCount || 0}
                color="orange"
                onClick={() => navigate("/projects")}
              />
              <SummaryCard
                icon={ShoppingCart}
                label="סה״כ הזמנות"
                value={stats?.ordersCount || 0}
                subtitle={formatCurrency(stats?.ordersTotal)}
                color="blue"
                onClick={() => navigate("/orders")}
              />
              <SummaryCard
                icon={FileText}
                label="חשבוניות לא שולמו"
                value={stats?.unpaidCount || 0}
                subtitle={formatCurrency(stats?.unpaidAmount)}
                color="red"
                onClick={() => navigate("/invoices")}
              />
              <SummaryCard
                icon={DollarSign}
                label="יתרה (הכנסות - הוצאות)"
                value={formatCurrency(stats?.balance)}
                color={stats?.balance >= 0 ? "green" : "red"}
                onClick={() => navigate("/summary-page")}
              />
            </div>

            {/* Alerts + Income/Expenses Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Alerts */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-orange-500/10 p-5 sm:p-6 border border-white/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  דורש תשומת לב
                </h2>
                <div className="space-y-3">
                  {stats?.pendingPaymentCount > 0 && (
                    <AlertItem
                      icon={CreditCard}
                      text={`${stats.pendingPaymentCount} חשבוניות יצאו לתשלום`}
                      subtitle={formatCurrency(stats.pendingPaymentAmount)}
                      color="amber"
                      onClick={() => navigate("/invoices")}
                    />
                  )}
                  {stats?.overBudgetProjects?.length > 0 && (
                    <AlertItem
                      icon={TrendingDown}
                      text={`${stats.overBudgetProjects.length} פרויקטים חורגים מתקציב`}
                      subtitle={stats.overBudgetProjects.map((p) => p.name).join(", ")}
                      color="red"
                      onClick={() => navigate("/projects")}
                    />
                  )}
                  {(!stats?.pendingPaymentCount && !stats?.overBudgetProjects?.length) && (
                    <p className="text-slate-400 text-sm text-center py-4">הכל תקין, אין התראות</p>
                  )}
                </div>
              </div>

              {/* Income vs Expenses */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-orange-500/10 p-5 sm:p-6 border border-white/50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  סיכום כספי
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-800">הכנסות</span>
                    </div>
                    <span className="font-black text-green-700 text-lg">
                      {formatCurrency(stats?.totalIncome)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-800">הוצאות</span>
                    </div>
                    <span className="font-black text-red-700 text-lg">
                      {formatCurrency(stats?.totalExpenses)}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${
                    stats?.balance >= 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <span className={`font-bold ${stats?.balance >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      יתרה
                    </span>
                    <span className={`font-black text-xl ${stats?.balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatCurrency(stats?.balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <MiniStat label="ספקים" value={stats?.suppliersCount || 0} onClick={() => navigate("/suppliers")} />
              <MiniStat label="חשבוניות (סה״כ)" value={stats?.invoicesCount || 0} onClick={() => navigate("/invoices")} />
              <MiniStat
                label="הכנסות"
                value={formatCurrency(stats?.totalIncome)}
                onClick={() => navigate("/incomes")}
              />
              <MiniStat
                label="הוצאות"
                value={formatCurrency(stats?.totalExpenses)}
                onClick={() => navigate("/expenses")}
              />
            </div>

            {/* Recent Activity */}
            {stats?.recentActivity?.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-orange-500/10 p-5 sm:p-6 border border-white/50 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-orange-500" />
                  פעילות אחרונה
                </h2>
                <div className="space-y-2">
                  {stats.recentActivity.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => navigate(item.path)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-orange-50 cursor-pointer transition-colors border border-transparent hover:border-orange-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          item.type === "invoice"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600"
                        }`}>
                          {item.type === "invoice" ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{item.text}</p>
                          {item.detail && (
                            <p className="text-xs text-slate-500">{item.detail}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-slate-700">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                        <ArrowLeft className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <ChartCard
                title="תקציב מול הוצאות"
                subtitle="לפי פרויקט (10 המובילים)"
                icon={BarChart3}
                loading={analyticsLoading}
                color="orange"
              >
                <BudgetVsExpensesChart data={analyticsData.budgetVsExpenses} />
              </ChartCard>

              <ChartCard
                title="סטטוס תשלומים"
                subtitle="התפלגות חשבוניות"
                icon={PieChart}
                loading={analyticsLoading}
                color="purple"
              >
                <PaymentStatusChart data={analyticsData.paymentStatus} />
              </ChartCard>
            </div>

            <div className="mb-6">
              <ChartCard
                title="הכנסות מול הוצאות"
                subtitle="6 חודשים אחרונים"
                icon={LineChart}
                loading={analyticsLoading}
                color="green"
              >
                <IncomeVsExpensesChart data={analyticsData.incomeVsExpenses} />
              </ChartCard>
            </div>
          </>
        ) : (
          <>
            {/* Regular User Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {canViewAnyProject() && (
                <SummaryCard
                  icon={Briefcase}
                  label="הפרויקטים שלי"
                  value={stats?.projectsCount || 0}
                  color="orange"
                  onClick={() => navigate("/projects")}
                />
              )}
              {canViewModule(null, "orders") && (
                <SummaryCard
                  icon={ShoppingCart}
                  label="סה״כ הזמנות"
                  value={stats?.ordersCount || 0}
                  subtitle={formatCurrency(stats?.ordersTotal)}
                  color="blue"
                  onClick={() => navigate("/orders")}
                />
              )}
              {canViewModule(null, "invoices") && (
                <SummaryCard
                  icon={FileText}
                  label="חשבוניות"
                  value={stats?.invoicesCount || 0}
                  color="purple"
                  onClick={() => navigate("/invoices")}
                />
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-orange-500/10 p-5 sm:p-6 border border-white/50">
              <h2 className="text-lg font-bold text-slate-900 mb-4">קישורים מהירים</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {canViewAnyProject() && (
                  <QuickLink icon={Briefcase} text="פרויקטים" onClick={() => navigate("/projects")} />
                )}
                {canViewModule(null, "orders") && (
                  <QuickLink icon={ShoppingCart} text="הזמנות" onClick={() => navigate("/orders")} />
                )}
                {canViewModule(null, "invoices") && (
                  <QuickLink icon={FileText} text="חשבוניות" onClick={() => navigate("/invoices")} />
                )}
                {canViewModule(null, "suppliers") && (
                  <QuickLink icon={Users} text="ספקים" onClick={() => navigate("/suppliers")} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ================================
// Sub-components
// ================================

const colorMap = {
  orange: {
    bg: "from-orange-500 to-amber-500",
    light: "bg-orange-50 border-orange-200",
    text: "text-orange-600",
  },
  blue: {
    bg: "from-blue-500 to-cyan-500",
    light: "bg-blue-50 border-blue-200",
    text: "text-blue-600",
  },
  red: {
    bg: "from-red-500 to-rose-500",
    light: "bg-red-50 border-red-200",
    text: "text-red-600",
  },
  green: {
    bg: "from-green-500 to-emerald-500",
    light: "bg-green-50 border-green-200",
    text: "text-green-600",
  },
  purple: {
    bg: "from-purple-500 to-violet-500",
    light: "bg-purple-50 border-purple-200",
    text: "text-purple-600",
  },
  amber: {
    bg: "from-amber-500 to-yellow-500",
    light: "bg-amber-50 border-amber-200",
    text: "text-amber-600",
  },
};

function SummaryCard({ icon: Icon, label, value, subtitle, color = "orange", onClick }) {
  const c = colorMap[color];
  return (
    <div
      onClick={onClick}
      className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-orange-500/5 p-4 sm:p-5 border border-white/50 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.bg} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs sm:text-sm font-bold text-slate-500">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-900">{value}</p>
      {subtitle && <p className="text-sm font-bold text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function MiniStat({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white/70 backdrop-blur rounded-xl p-3 sm:p-4 border border-orange-100 cursor-pointer hover:bg-white/90 hover:shadow-md transition-all text-center"
    >
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-black text-slate-800">{value}</p>
    </div>
  );
}

function AlertItem({ icon: Icon, text, subtitle, color = "amber", onClick }) {
  const c = colorMap[color];
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl ${c.light} border cursor-pointer hover:shadow-md transition-all`}
    >
      <div className={`p-2 rounded-lg bg-gradient-to-br ${c.bg}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-slate-900">{text}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <ArrowLeft className="w-4 h-4 text-slate-300" />
    </div>
  );
}

function QuickLink({ icon: Icon, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:from-orange-100 hover:to-amber-100 hover:shadow-md transition-all"
    >
      <Icon className="w-6 h-6 text-orange-600" />
      <span className="text-sm font-bold text-slate-700">{text}</span>
    </button>
  );
}

export default Home;
