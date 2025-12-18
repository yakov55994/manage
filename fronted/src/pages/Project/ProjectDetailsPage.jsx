import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import {
  Building2,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
  User,
  DollarSign,
  Calendar,
  FileText,
  Receipt,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Package,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext.jsx";
import CreatorInfo from "../../Components/CreatorInfo";

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isAdmin, canViewProject, canEditProject, loading, user } = useAuth();

  // ✅ פונקציות עזר לבדיקת הרשאות מודולים
  const canViewOrders = () => {
    if (isAdmin) return true;
    if (!user?.permissions) return false;

    const perm = user.permissions.find((p) => String(p.project) === String(id));

    const level = perm?.modules?.orders;
    return level === "view" || level === "edit";
  };

  const canViewInvoices = () => {
    if (isAdmin) return true;
    if (!user?.permissions) return false;

    const perm = user.permissions.find((p) => String(p.project) === String(id));

    const level = perm?.modules?.invoices;
    return level === "view" || level === "edit";
  };

  const canEditInvoices = () => {
    if (isAdmin) return true;
    if (user?.role === "accountant") return false; // accountant cannot create/edit invoices
    if (!user?.permissions) return false;

    const perm = user.permissions.find((p) => String(p.project) === String(id));

    return perm?.modules?.invoices === "edit";
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (!isAdmin && !canViewProject(id)) {
      navigate("/no-access");
    }
  }, [loading, user, isAdmin, id, navigate]);

  const [project, setProject] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingSalaries, setLoadingSalaries] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const fetchProjectDetails = async () => {
      try {
        setLoadingProject(true);
        setLoadingOrders(true);
        setLoadingInvoices(true);
        setLoadingSalaries(true);

        // 1️⃣ שלוף את הפרויקט
        const projectResponse = await api.get(`/projects/${id}`);
        const projectData = projectResponse.data?.data || {};
        setProject(projectData);
        setLoadingProject(false);

        // 2️⃣ שלוף את כל ההזמנות וסנן לפי פרויקט - רק אם יש הרשאה
        if (canViewOrders()) {
          const ordersResponse = await api.get("/orders");
          const allOrders = Array.isArray(ordersResponse.data?.data)
            ? ordersResponse.data.data
            : [];
          const projectOrders = allOrders.filter(
            (order) =>
              String(order.projectId?._id || order.projectId) === String(id)
          );
          setOrders(projectOrders);
        }
        setLoadingOrders(false);

        // 3️⃣ שלוף את כל החשבוניות וסנן לפי פרויקט - רק אם יש הרשאה
        if (canViewInvoices()) {
          const invoicesResponse = await api.get("/invoices");
          const allInvoices = Array.isArray(invoicesResponse.data?.data)
            ? invoicesResponse.data.data
            : [];
          const projectInvoices = allInvoices.filter((invoice) => {
            // בדיקה 1: אם הפרויקט נמצא במערך projects
            const inProjects = invoice.projects?.some((p) => {
              const pid =
                typeof p.projectId === "string"
                  ? p.projectId
                  : p.projectId?._id;

              return String(pid) === String(id);
            });

            // בדיקה 2: אם זו חשבונית מילגה שיורדת מהפרויקט הזה (fundedFromProjectId)
            const fundedId = typeof invoice.fundedFromProjectId === "string"
              ? invoice.fundedFromProjectId
              : invoice.fundedFromProjectId?._id;

            const isFundedFrom = fundedId && String(fundedId) === String(id);

            return inProjects || isFundedFrom;
          });

          setInvoices(projectInvoices);
        }
        setLoadingInvoices(false);

        // 4️⃣ שלוף משכורות שקשורות לפרויקט - רק אם יש הרשאה
        if (canViewInvoices()) {
          const salariesResponse = await api.get("/salaries");
          const allSalaries = Array.isArray(salariesResponse.data?.data)
            ? salariesResponse.data.data
            : [];
          const projectSalaries = allSalaries.filter(
            (salary) =>
              String(salary.projectId?._id || salary.projectId) === String(id)
          );
          setSalaries(projectSalaries);
        }
        setLoadingSalaries(false);
      } catch (error) {
        console.error("Error fetching project details:", error);
        toast.error("שגיאה בשליפת פרטי הפרויקט", {
          className: "sonner-toast error rtl",
        });
        setLoadingProject(false);
        setLoadingOrders(false);
        setLoadingInvoices(false);
        setLoadingSalaries(false);
      }
    };

    fetchProjectDetails();
  }, [id, loading, user]);
  const isSalaryProject = project?.type === "salary";

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const filteredOrders = orders
    ?.filter((o) => !statusFilter || o.status === statusFilter)
    ?.sort((a, b) => (sortOrder === "desc" ? b.sum - a.sum : a.sum - b.sum));

  const filteredInvoices = invoices
    ?.filter((inv) => !statusFilter || inv.status === statusFilter)
    ?.sort((a, b) => (sortOrder === "desc" ? b.sum - a.sum : a.sum - b.sum));

  const INTERIM_ALIASES = new Set(["ח. עסקה", "ה. עבודה", "ד. תשלום"]);

  const FINAL_ALIASES = new Set([
    "חשבונית מס/קבלה",
    "חשבונית מס / קבלה",
    "חשבונית מס-קבלה",
    "חשבונית מס קבלה",
    "אין צורך",  // 🆕 אין צורך גם נחשב כהושלם
  ]);

  const normalizeType = (t) => {
    if (!t) return "";
    return String(t)
      .replace(/\s+/g, " ")
      .replace(/\s*\/\s*/g, "/")
      .trim();
  };

  const extractDocTypes = (invoice) => {
    let raw = invoice?.documents ?? invoice?.documentType ?? [];
    if (typeof raw === "string") raw = [raw];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((d) => normalizeType(typeof d === "object" ? d?.type : d))
      .filter(Boolean);
  };

  const getActionState = (invoice) => {
    const types = extractDocTypes(invoice);

    const hasFinal = types.some((t) => FINAL_ALIASES.has(t));
    const hasInterim = types.some((t) => INTERIM_ALIASES.has(t));

    const status = hasFinal ? "הושלם" : "חסר";

    const label = hasFinal
      ? "חשבונית מס/קבלה"
      : types.find((t) => INTERIM_ALIASES.has(t)) || "";

    const color = hasFinal
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 "
      : "bg-amber-100 text-amber-700 border-amber-200 ";

    return { status, label, color };
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען פרטי פרויקט...
        </h1>
      </div>
    );
  }

  // If project failed to load (403 or other error), show access denied
  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 blur-3xl opacity-20 animate-pulse"></div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
            <AlertCircle className="w-16 h-16 text-white" />
          </div>
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          אין גישה לפרויקט זה
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          אין לך הרשאה לצפות בפרויקט זה
        </p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזור לרשימת הפרויקטים</span>
        </button>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num?.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "תאריך לא זמין";
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  function moveToInvoiceDetails(invoice) {
    navigate(`/invoices/${invoice._id}`);
  }

  function moveToOrderDetails(order) {
    navigate(`/orders/${order._id}`);
  }

  const formatCurrencyWithAlert = (num) => {
    if (num === null || num === undefined) return "אין עדיין תקציב";

    const number = Number(num);
    if (isNaN(number)) return "₪ 0";

    if (number < 0) {
      return (
        <span
          className="text-sm font-bold text-red-600 flex items-center gap-1"
          dir="ltr"
        >
          <AlertCircle className="w-4 h-4" />₪ -
          {Math.abs(number).toLocaleString("he-IL")}
        </span>
      );
    } else {
      return (
        <span className="text-sm font-bold text-emerald-600" dir="ltr">
          ₪ {number.toLocaleString("he-IL")}
        </span>
      );
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/projects/${project._id}`);
      toast.success("הפרוייקט נמחק בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("שגיאה במחיקת הפרויקט", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-project/${id}`);
  };

  const handleAddInvoiceForProject = () => {
    if (!project?._id) return;
    navigate(`/create-invoice?projectId=${project._id}`);
  };

  const handleExportSalaries = async () => {
    try {
      // ✅ השרת מצפה ל-projectIds (רבים) ולא projectId (יחיד)
      const response = await api.get(`/salaries/export?projectIds=${project._id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary-export-${project.name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('קובץ סיכום משכורות ירד בהצלחה!');
    } catch (err) {
      console.error('Export salaries error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'שגיאה לא ידועה';
      toast.error('שגיאה ביצירת סיכום משכורות: ' + errorMsg);
    }
  };

  // פרויקט ספציפי מתוך החשבונית

  const hasNonSalaryInvoices = filteredInvoices.some(inv => inv.type !== "salary");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    פרטי פרויקט
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      {project?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/projects")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לרשימה</span>
                </button>
                {isAdmin && (
                  <>
                    {(isAdmin || canEditProject(id)) && (
                      <>
                        <button
                          onClick={() => handleEdit(project._id)}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>עריכת פרויקט</span>
                        </button>

                        <button
                          onClick={() => setConfirmOpen(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl shadow-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>מחק פרויקט</span>
                        </button>
                      </>
                    )}
                  </>
                )}
                {/* כפתור הוספת חשבונית - רק אם יש הרשאת edit */}
                {/* אם זה משכורות – הוספת משכורת */}
                {isSalaryProject && canEditInvoices() && (
                  <>
                    <button
                      onClick={() =>
                        navigate(`/create-salary?projectId=${project._id}`)
                      }
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>הוספת משכורת</span>
                    </button>

                    <button
                      onClick={handleExportSalaries}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl shadow-blue-500/30"
                    >
                      <Download className="w-4 h-4" />
                      <span>ייצוא סיכום משכורות</span>
                    </button>
                  </>
                )}

                {/* אם זה לא משכורות – הוספת חשבונית */}
                {!isSalaryProject && canEditInvoices() && (
                  <button
                    onClick={handleAddInvoiceForProject}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>הוספת חשבונית</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Project Details Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {/* Section Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    פרטי הפרויקט
                  </h2>
                </div>
              </div>
            </div>

            {/* Project Info Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Project Name */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Building2 className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        שם הפרויקט
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Person */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        איש קשר
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project?.Contact_person || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {!isSalaryProject && (
                  <>
                    {/* Budget */}
                    <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-orange-100">
                          <DollarSign className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-orange-600 mb-1">
                            תקציב
                          </p>
                          <div className="text-sm font-bold text-slate-900">
                            {project?.budget
                              ? formatCurrencyWithAlert(project.budget)
                              : "עדיין אין תקציב"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Remaining Budget */}
                    <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-orange-100">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-orange-600 mb-1">
                            תקציב שנותר
                          </p>
                          <div className="font-bold">
                            {formatCurrencyWithAlert(project?.remainingBudget)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תאריך יצירה
                      </p>
                      <div className="font-bold">
                        {formatHebrewDate(project?.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        נוצר ע"י
                      </p>
                      <div className="font-bold">
                        {project.createdByName || "לא זמין"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {!isSalaryProject && (
          <>
            {/* Orders Section */}
            <div className="relative mb-6">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
                  <div className="bg-white/95 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                        <ShoppingCart className="w-5 h-5 text-orange-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        הזמנות של הפרויקט
                      </h2>
                      {canViewOrders() && (
                        <span className="mr-auto px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                          {filteredOrders?.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {!canViewOrders() ? (
                    // ❌ אין הרשאה
                    <div className="text-center py-12 text-slate-600">
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400 opacity-50" />
                      <p className="font-bold text-xl text-red-600">
                        אין הרשאה לצפות בהזמנות
                      </p>
                      <p className="text-sm mt-2 text-slate-500">
                        פנה למנהל המערכת לקבלת גישה
                      </p>
                    </div>
                  ) : loadingOrders ? (
                    <div className="flex items-center gap-3 text-slate-700 justify-center py-8">
                      <ClipLoader size={26} color="#3b82f6" />
                      <span>טוען הזמנות…</span>
                    </div>
                  ) : filteredOrders.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border-2 border-orange-200">
                      <table className="min-w-full text-right">
                        <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900">
                              מספר הזמנה
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900">
                              פרויקט
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900">
                              סכום
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900">
                              סטטוס
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {filteredOrders.map((order) => (
                            <tr
                              key={order._id}
                              onClick={() => moveToOrderDetails(order)}
                              className="cursor-pointer border-t border-orange-100 hover:bg-orange-50/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-bold">
                                {order.orderNumber}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold">
                                {order.projectName}
                              </td>
                              <td className="px-4 py-3">
                                {formatCurrencyWithAlert(order.sum)}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold">
                                {order.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-600">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-bold text-lg">לא נמצאו הזמנות</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}


        {/* Invoices Section */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <Receipt className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    חשבוניות של הפרויקט
                  </h2>
                  {canViewInvoices() && (
                    <span className="mr-auto px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                      {filteredInvoices.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {console.log("filteredInvoices ", filteredInvoices)}
            <div className="p-6">
              {!canViewInvoices() ? (
                // ❌ אין הרשאה
                <div className="text-center py-12 text-slate-600">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400 opacity-50" />
                  <p className="font-bold text-xl text-red-600">
                    אין הרשאה לצפות בחשבוניות
                  </p>
                  <p className="text-sm mt-2 text-slate-500">
                    פנה למנהל המערכת לקבלת גישה
                  </p>
                </div>
              ) : loadingInvoices ? (
                <div className="flex items-center gap-3 text-slate-700 justify-center py-8">
                  <ClipLoader size={26} color="#10b981" />
                  <span>טוען חשבוניות…</span>
                </div>

) : filteredInvoices.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border-2 border-orange-200">
                  <table className="min-w-full text-right">
                    <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                          מספר חשבונית
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                          סוג
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                          פרויקט
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                          סכום
                        </th>
                        <th className="px-12 py-3 text-xs font-bold text-orange-900 text-center">
                          סטטוס
                        </th>
                        {hasNonSalaryInvoices && (
                          <th className="px-12 py-3 text-xs font-bold text-orange-900 text-center">
                            שם הספק
                          </th>
                        )}
                        <th className="px-12 py-3 text-xs font-bold text-orange-900 text-center">
                          מצב תשלום
                        </th>
                        <th className="px-12 py-3 text-xs font-bold text-orange-900 text-center">
                          חוסר מסמך
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredInvoices.map((invoice) => {
                        const proj = invoice.projects.find((p) => {
                          const pid =
                            typeof p.projectId === "string"
                              ? p.projectId
                              : p.projectId?._id || p.projectId?.$oid;

                          return String(pid) === String(id);
                        });

                        // בדיקה אם זו חשבונית מילגה שיורדת מהפרויקט הזה
                        const fundedId = typeof invoice.fundedFromProjectId === "string"
                          ? invoice.fundedFromProjectId
                          : invoice.fundedFromProjectId?._id;
                        const isFundedFromThisProject = fundedId && String(fundedId) === String(id);

                        return (
                          <tr
                            key={invoice._id}
                            onClick={() => moveToInvoiceDetails(invoice)}
                            className={`cursor-pointer border-t transition-colors ${
                              invoice.type === "salary"
                                ? "bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-orange-200 hover:from-orange-100 hover:via-amber-100 hover:to-yellow-100"
                                : "border-emerald-100 hover:bg-emerald-50/50"
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-bold text-center">
                              <div className="flex items-center justify-center gap-2">
                                {invoice.invoiceNumber}
                                {invoice.type === "salary" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md animate-pulse">
                                    משכורת
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* סוג חשבונית - משכורת או רגילה */}
                            <td className="px-4 py-3 text-center">
                              {invoice.type === "salary" ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white shadow-lg">
                                  💰 משכורת
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md">
                                  רגיל
                                </span>
                              )}
                            </td>

                            {/* ✅ שם הפרויקט מתוך המערך או "מילגה" אם זו חשבונית שיורדת מפרויקט זה */}
                            <td className="px-4 py-3 text-sm font-bold text-center">
                              {isFundedFromThisProject ? (
                                <span className="text-purple-600 font-bold">
                                  {invoice.projects[0]?.projectName || invoice.projects[0]?.projectId?.name || "מילגה"}
                                  <span className="text-xs text-slate-500 block">
                                    (יורד מתקציב {project?.name})
                                  </span>
                                </span>
                              ) : (
                                proj?.projectName ||
                                proj?.projectId?.name ||
                                "—"
                              )}
                            </td>

                            {/* ✅ סכום הפרויקט מתוך המערך - רק סכום הפרויקט הנוכחי! */}
                            <td className="px-4 py-3 text-center">
                              {console.log(proj)}
                              {invoice?.totalAmount !== undefined ? (
                                formatCurrencyWithAlert(invoice.totalAmount)
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}{" "}
                            </td>
                            {console.log("invoice: ",)}
                            <td className="px-4 py-3 text-sm font-bold text-center">
                              {invoice.status || "לא הוזן"}
                            </td>

                            {hasNonSalaryInvoices && (
                              <td className="px-4 py-3 text-sm font-bold text-center">
                                {invoice.type !== "salary" ? (invoice.supplierId?.name || "—") : ""}
                              </td>
                            )}

                            {console.log(invoice.type)}

                            <td className="px-4 py-3 text-sm font-bold text-center">
                              {invoice.paid === "כן" ? "שולם" : "לא שולם"}
                            </td>

                            {/* חוסר מסמך וכו׳... */}
                            <td className="px-8 py-3 text-sm font-bold text-center">
                              {(() => {
                                const a = getActionState(invoice);
                                return (
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold border ${a.color}`}
                                  >
                                    {a.status} | {a.label}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-lg">לא נמצאו חשבוניות</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salaries Section - רק אם יש משכורות */}
        {salaries.length > 0 && (
          <div className="relative mt-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
                <div className="bg-white/95 backdrop-blur-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                      <DollarSign className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      משכורות של הפרויקט
                    </h2>
                    {canViewInvoices() && (
                      <span className="mr-auto px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                        {salaries.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loadingSalaries ? (
                  <div className="flex items-center gap-3 text-slate-700 justify-center py-8">
                    <ClipLoader size={26} color="#f97316" />
                    <span>טוען משכורות…</span>
                  </div>
                ) : salaries.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-xl border-2 border-orange-200">
                      <table className="min-w-full text-right">
                        <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                              שם עובד
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                              מחלקה
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                              סכום ברוטו
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                              תקורה (%)
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                              סכום סופי
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-orange-900 text-center">
                              תאריך
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {salaries.map((salary) => (
                            <tr
                              key={salary._id}
                              onClick={() => navigate(`/salaries/${salary._id}`)}
                              className="cursor-pointer border-t border-orange-100 hover:bg-orange-50/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-bold text-center">
                                {salary.employeeName}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {salary.department || "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {formatCurrencyWithAlert(salary.baseAmount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {salary.overheadPercent}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                {formatCurrencyWithAlert(salary.finalAmount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {formatDate(salary.date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* כפתור ייצוא משכורות */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleExportSalaries}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        <span>ייצוא סיכום משכורות</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-600">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-bold text-lg">לא נמצאו משכורות</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את הפרויקט לצמיתות.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg disabled:opacity-60"
                  >
                    {deleting ? "מוחק..." : "מחק"}
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    disabled={deleting}
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
    </div>
  );
};

export default ProjectDetailsPage;
