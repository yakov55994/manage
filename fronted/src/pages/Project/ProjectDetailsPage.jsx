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
  TrendingDown,
  ArrowRight,
  Package,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext.jsx";
import CreatorInfo from "../../Components/CreatorInfo";
import SubmittedInvoices from "../../Components/SubmittedInvoices";

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isAdmin, isLimited, canViewProject, canEditProject, loading, user } = useAuth();

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

  // הפחתת תקציב
  const [budgetDeductionOpen, setBudgetDeductionOpen] = useState(false);
  const [budgetDeductionData, setBudgetDeductionData] = useState({
    reason: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [deducting, setDeducting] = useState(false);
  const [editDeductionIndex, setEditDeductionIndex] = useState(null); // אינדקס הפחתה לעריכה
  const [deleteDeductionModal, setDeleteDeductionModal] = useState({ open: false, index: null });

  // הוספת תקציב
  const [budgetAdditionOpen, setBudgetAdditionOpen] = useState(false);
  const [budgetAdditionData, setBudgetAdditionData] = useState({
    reason: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [adding, setAdding] = useState(false);
  const [editAdditionIndex, setEditAdditionIndex] = useState(null); // אינדקס הוספה לעריכה
  const [deleteAdditionModal, setDeleteAdditionModal] = useState({ open: false, index: null });

  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingSalaries, setLoadingSalaries] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportInvoiceLoading, setExportInvoiceLoading] = useState(false);
  const [kartesetLoading, setKartesetLoading] = useState(false);

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
            // בדיקה 1: אם הפרויקט נמצא במערך projects (כולל מילגה)
            const inProjects = invoice.projects?.some((p) => {
              const pid =
                typeof p.projectId === "string"
                  ? p.projectId
                  : p.projectId?._id;

              return String(pid) === String(id);
            });

            // בדיקה 2: אם זו חשבונית שיורדת מהפרויקט הזה (fundedFromProjectId)
            // זה מתאים למקרה שבו הפרויקט הנוכחי מממן חשבונית (מילגה/משכורת)
            const fundedId = typeof invoice.fundedFromProjectId === "string"
              ? invoice.fundedFromProjectId
              : invoice.fundedFromProjectId?._id;

            const isFundedFrom = fundedId && String(fundedId) === String(id);

            // בדיקה 3: בדוק אם אחד מהפרויקטים בחשבונית ממומן מהפרויקט הזה
            const hasProjectFundedFrom = invoice.projects?.some((p) => {
              const projectFundedId = typeof p.fundedFromProjectId === "string"
                ? p.fundedFromProjectId
                : p.fundedFromProjectId?._id;

              return projectFundedId && String(projectFundedId) === String(id);
            });

            return inProjects || isFundedFrom || hasProjectFundedFrom;
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

    // ✅ אם יש "אין צורך" בין הסוגים - תציג "אין צורך", אחרת "חשבונית מס/קבלה"
    const hasNoNeed = types.includes("אין צורך");
    const label = hasFinal
      ? (hasNoNeed ? "אין צורך" : "חשבונית מס/קבלה")
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
        <h1 className="mt-8 font-bold text-xl sm:text-2xl md:text-3xl text-slate-900">
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
          <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
            <AlertCircle className="w-16 h-16 text-white" />
          </div>
        </div>
        <h1 className="mt-8 font-bold text-xl sm:text-2xl md:text-3xl text-slate-900">
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

  // הפחתת תקציב (יצירה או עריכה)
  const handleBudgetDeduction = async () => {
    const { reason, amount, date, notes } = budgetDeductionData;

    if (!reason.trim()) {
      toast.error("נא להזין סיבת הפחתה");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("נא להזין סכום תקין");
      return;
    }

    try {
      setDeducting(true);

      let newDeductions = [...(project.budgetDeductions || [])];
      let newRemainingBudget = project.remainingBudget || 0;

      if (editDeductionIndex !== null) {
        // עריכה - החזרת הסכום הישן ואז הורדת החדש
        const oldAmount = newDeductions[editDeductionIndex].amount || 0;
        newRemainingBudget = newRemainingBudget + oldAmount - Number(amount);

        newDeductions[editDeductionIndex] = {
          ...newDeductions[editDeductionIndex],
          reason,
          amount: Number(amount),
          date,
          notes,
        };
      } else {
        // יצירה חדשה
        newRemainingBudget = newRemainingBudget - Number(amount);
        newDeductions.push({
          reason,
          amount: Number(amount),
          date,
          notes,
          createdAt: new Date().toISOString(),
          createdBy: user?.username || user?.name || "משתמש",
        });
      }

      await api.put(`/projects/${project._id}`, {
        ...project,
        remainingBudget: newRemainingBudget,
        budgetDeductions: newDeductions,
      });

      // עדכון הפרויקט המקומי
      setProject((prev) => ({
        ...prev,
        remainingBudget: newRemainingBudget,
        budgetDeductions: newDeductions,
      }));

      toast.success(editDeductionIndex !== null
        ? "הפחתת התקציב עודכנה בהצלחה"
        : `הופחתו ${Number(amount).toLocaleString()} ₪ מהתקציב`
      );
      setBudgetDeductionOpen(false);
      setEditDeductionIndex(null);
      setBudgetDeductionData({
        reason: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (error) {
      console.error("Error deducting budget:", error);
      toast.error("שגיאה בהפחתת תקציב");
    } finally {
      setDeducting(false);
    }
  };

  // פתיחת מודל עריכה להפחתה
  const openEditDeduction = (index) => {
    const deduction = project.budgetDeductions[index];
    setBudgetDeductionData({
      reason: deduction.reason || "",
      amount: deduction.amount?.toString() || "",
      date: deduction.date ? new Date(deduction.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: deduction.notes || "",
    });
    setEditDeductionIndex(index);
    setBudgetDeductionOpen(true);
  };

  // מחיקת הפחתה
  const handleDeleteDeduction = async () => {
    const index = deleteDeductionModal.index;
    if (index === null) return;

    try {
      setDeducting(true);

      const deductionToDelete = project.budgetDeductions[index];
      const amountToReturn = deductionToDelete.amount || 0;

      // החזרת הסכום לתקציב
      const newRemainingBudget = (project.remainingBudget || 0) + amountToReturn;
      const newDeductions = project.budgetDeductions.filter((_, i) => i !== index);

      await api.put(`/projects/${project._id}`, {
        ...project,
        remainingBudget: newRemainingBudget,
        budgetDeductions: newDeductions,
      });

      setProject((prev) => ({
        ...prev,
        remainingBudget: newRemainingBudget,
        budgetDeductions: newDeductions,
      }));

      toast.success(`הפחתת התקציב נמחקה והוחזרו ${amountToReturn.toLocaleString()} ₪ לתקציב`);
      setDeleteDeductionModal({ open: false, index: null });
    } catch (error) {
      console.error("Error deleting deduction:", error);
      toast.error("שגיאה במחיקת הפחתה");
    } finally {
      setDeducting(false);
    }
  };

  // הוספת תקציב (יצירה או עריכה)
  const handleBudgetAddition = async () => {
    const { reason, amount, date, notes } = budgetAdditionData;

    if (!reason.trim()) {
      toast.error("נא להזין סיבת הוספה");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("נא להזין סכום תקין");
      return;
    }

    try {
      setAdding(true);

      let newAdditions = [...(project.budgetAdditions || [])];
      let newRemainingBudget = project.remainingBudget || 0;

      if (editAdditionIndex !== null) {
        // עריכה - הורדת הסכום הישן ואז הוספת החדש
        const oldAmount = newAdditions[editAdditionIndex].amount || 0;
        newRemainingBudget = newRemainingBudget - oldAmount + Number(amount);

        newAdditions[editAdditionIndex] = {
          ...newAdditions[editAdditionIndex],
          reason,
          amount: Number(amount),
          date,
          notes,
        };
      } else {
        // יצירה חדשה
        newRemainingBudget = newRemainingBudget + Number(amount);
        newAdditions.push({
          reason,
          amount: Number(amount),
          date,
          notes,
          createdAt: new Date().toISOString(),
          createdBy: user?.username || user?.name || "משתמש",
        });
      }

      await api.put(`/projects/${project._id}`, {
        ...project,
        remainingBudget: newRemainingBudget,
        budgetAdditions: newAdditions,
      });

      // עדכון הפרויקט המקומי
      setProject((prev) => ({
        ...prev,
        remainingBudget: newRemainingBudget,
        budgetAdditions: newAdditions,
      }));

      toast.success(editAdditionIndex !== null
        ? "הוספת התקציב עודכנה בהצלחה"
        : `נוספו ${Number(amount).toLocaleString()} ₪ לתקציב`
      );
      setBudgetAdditionOpen(false);
      setEditAdditionIndex(null);
      setBudgetAdditionData({
        reason: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (error) {
      console.error("Error adding budget:", error);
      toast.error("שגיאה בהוספת תקציב");
    } finally {
      setAdding(false);
    }
  };

  // פתיחת מודל עריכה להוספה
  const openEditAddition = (index) => {
    const addition = project.budgetAdditions[index];
    setBudgetAdditionData({
      reason: addition.reason || "",
      amount: addition.amount?.toString() || "",
      date: addition.date ? new Date(addition.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: addition.notes || "",
    });
    setEditAdditionIndex(index);
    setBudgetAdditionOpen(true);
  };

  // מחיקת הוספה
  const handleDeleteAddition = async () => {
    const index = deleteAdditionModal.index;
    if (index === null) return;

    try {
      setAdding(true);

      const additionToDelete = project.budgetAdditions[index];
      const amountToRemove = additionToDelete.amount || 0;

      // הורדת הסכום מהתקציב
      const newRemainingBudget = (project.remainingBudget || 0) - amountToRemove;
      const newAdditions = project.budgetAdditions.filter((_, i) => i !== index);

      await api.put(`/projects/${project._id}`, {
        ...project,
        remainingBudget: newRemainingBudget,
        budgetAdditions: newAdditions,
      });

      setProject((prev) => ({
        ...prev,
        remainingBudget: newRemainingBudget,
        budgetAdditions: newAdditions,
      }));

      toast.success(`הוספת התקציב נמחקה והופחתו ${amountToRemove.toLocaleString()} ₪ מהתקציב`);
      setDeleteAdditionModal({ open: false, index: null });
    } catch (error) {
      console.error("Error deleting addition:", error);
      toast.error("שגיאה במחיקת הוספה");
    } finally {
      setAdding(false);
    }
  };

  const handleExportSalaries = async (retryCount = 0) => {
    const MAX_RETRIES = 2;

    try {
      setExportLoading(true);

      // ✅ שימוש ב-POST במקום GET כדי למנוע חסימה של antivirus/firewall
      const response = await api.post('/salaries/export',
        { projectIds: [project._id] },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary-export-${project.name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('קובץ סיכום משכורות הורד בהצלחה!');
    } catch (err) {
      console.error('Export salaries error:', err);

      // במקרה של 418, ננסה שוב אוטומטית
      if (err.response?.status === 418 && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // המתנה של שנייה
        return handleExportSalaries(retryCount + 1);
      }

      // טיפול מיוחד ב-404 - אין משכורות לפרויקט
      if (err.response?.status === 404) {
        let errorMessage = "לא נמצאו משכורות לפרויקט זה";

        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const errorData = JSON.parse(text);
            if (errorData.error) {
              errorMessage = errorData.error === "No salaries found for the selected projects"
                ? "לא נמצאו משכורות לפרויקט זה"
                : errorData.error;
            }
          } catch (e) {
            // נשאר עם ההודעה ברירת המחדל
          }
        }

        toast.error(errorMessage);
      }
      // טיפול מיוחד ב-418 - חסימת Antivirus/Firewall
      else if (err.response?.status === 418) {
        toast.error(
          'הבקשה נחסמה על ידי אנטי-וירוס או חומת אש. אנא נסה שנית או פנה למנהל מערכת.',
          { duration: 6000 }
        );
      }
      // שגיאות אחרות
      else {
        const errorMsg = err.response?.data?.error || err.message || 'שגיאה לא ידועה';
        toast.error(`שגיאה ביצירת סיכום משכורות: ${errorMsg}`);
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportInvoices = async (retryCount = 0) => {
    const MAX_RETRIES = 2;

    try {
      setExportInvoiceLoading(true);

      const response = await api.post('/invoices/export',
        { projectId: project._id },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-export-${project.name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('קובץ סיכום חשבוניות הורד בהצלחה!');
    } catch (err) {
      console.error('Export invoices error:', err);

      if (err.response?.status === 418 && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return handleExportInvoices(retryCount + 1);
      }

      if (err.response?.status === 404) {
        let errorMessage = "לא נמצאו חשבוניות לפרויקט זה";

        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const errorData = JSON.parse(text);
            if (errorData.error) {
              errorMessage = errorData.error === "No invoices found for this project"
                ? "לא נמצאו חשבוניות לפרויקט זה"
                : errorData.error;
            }
          } catch (e) {
            // fallback
          }
        }

        toast.error(errorMessage);
      } else if (err.response?.status === 418) {
        toast.error(
          'הבקשה נחסמה על ידי אנטי-וירוס או חומת אש. אנא נסה שנית או פנה למנהל מערכת.',
          { duration: 6000 }
        );
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'שגיאה לא ידועה';
        toast.error(`שגיאה ביצירת סיכום חשבוניות: ${errorMsg}`);
      }
    } finally {
      setExportInvoiceLoading(false);
    }
  };

  const handleExportKarteset = async () => {
    try {
      setKartesetLoading(true);
      const response = await api.post(
        "/karteset/project",
        { projectId: project._id },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `כרטסת-${project.name}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("כרטסת פרויקט הורדה בהצלחה!");
    } catch (err) {
      console.error("Export karteset error:", err);
      toast.error("שגיאה ביצירת כרטסת פרויקט");
    } finally {
      setKartesetLoading(false);
    }
  };

  // פרויקט ספציפי מתוך החשבונית

  const hasNonSalaryInvoices = filteredInvoices.some(inv => inv.type !== "salary");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">
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
              <div className="flex justify-center gap-3 sm:gap-4">
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
                      disabled={exportLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      <span>{exportLoading ? 'מוריד...' : 'ייצוא סיכום משכורות'}</span>
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

                {/* ייצוא סיכום חשבוניות */}
                {/* {!isSalaryProject && (
                  <button
                    onClick={handleExportInvoices}
                    disabled={exportInvoiceLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exportInvoiceLoading ? 'מוריד...' : 'ייצוא סיכום חשבוניות'}</span>
                  </button>
                )} */}

                {/* כרטסת פרויקט */}
                <button
                  onClick={handleExportKarteset}
                  disabled={kartesetLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all shadow-xl shadow-teal-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>{kartesetLoading ? "מוריד..." : "כרטסת"}</span>
                </button>

                {/* הוספת תקציב - לא למשתמש מוגבל */}
                {!isSalaryProject && !isLimited && canEditInvoices() && (
                  <button
                    onClick={() => setBudgetAdditionOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-xl shadow-emerald-500/30"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>הוספת תקציב</span>
                  </button>
                )}

                {/* הפחתת תקציב - לא למשתמש מוגבל */}
                {!isSalaryProject && !isLimited && canEditInvoices() && (
                  <button
                    onClick={() => setBudgetDeductionOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 gradient-to-r from-orange-600 to-amber-600from-red-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl shadow-red-500/30"
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>הפחתת תקציב</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Project Details Section */}
        <div className="relative mb-4 sm:mb-5 md:mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
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
            <div className="p-4 sm:p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 sm:p-5 md:p-6">
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

                {/* תקציב - לא מוצג למשתמש מוגבל */}
                {!isSalaryProject && !isLimited && (
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

        {/* ✅ Submitted Invoices Section - חשבוניות שהוגשו */}
        {canViewInvoices() && (
          <div className="mb-4 sm:mb-5 md:mb-6">
            <SubmittedInvoices projectId={id} projectName={project?.name} />
          </div>
        )}

        {/* היסטוריית הוספות תקציב - לא מוצג למשתמש מוגבל */}
        {!isSalaryProject && !isLimited && project?.budgetAdditions && project.budgetAdditions.length > 0 && (
          <div className="relative mb-4 sm:mb-5 md:mb-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-emerald-500/10 border border-white/50 overflow-hidden">
              {/* Section Header */}
              <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-1">
                <div className="bg-white/95 backdrop-blur-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      היסטוריית הוספות תקציב
                    </h2>
                    <span className="mr-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                      {project.budgetAdditions.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additions List */}
              <div className="p-4 sm:p-5 md:p-6">
                <div className="space-y-3">
                  {project.budgetAdditions.map((addition, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-slate-900">{addition.reason}</span>
                            <span className="text-xs text-slate-500">
                              ({formatDate(addition.date || addition.createdAt)})
                            </span>
                          </div>
                          {addition.notes && (
                            <p className="text-sm text-slate-600 mb-2">{addition.notes}</p>
                          )}
                          <p className="text-xs text-slate-500">
                            נוסף על ידי: {addition.createdBy || "לא ידוע"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-emerald-600">
                            +{Number(addition.amount).toLocaleString()} ₪
                          </span>
                          {/* כפתורי עריכה ומחיקה */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditAddition(index)}
                              className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
                              title="עריכה"
                            >
                              <Edit2 className="w-4 h-4 text-orange-600" />
                            </button>
                            <button
                              onClick={() => setDeleteAdditionModal({ open: true, index })}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                              title="מחיקה"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* סה"כ הוספות */}
                <div className="mt-4 p-3 rounded-xl bg-emerald-100 border-2 border-emerald-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800">סה"כ הוספות:</span>
                    <span className="text-xl font-bold text-emerald-700">
                      +{project.budgetAdditions.reduce((sum, a) => sum + Number(a.amount || 0), 0).toLocaleString()} ₪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* היסטוריית הפחתות תקציב - לא מוצג למשתמש מוגבל */}
        {!isSalaryProject && !isLimited && project?.budgetDeductions && project.budgetDeductions.length > 0 && (
          <div className="relative mb-4 sm:mb-5 md:mb-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-red-500/10 border border-white/50 overflow-hidden">
              {/* Section Header */}
              <div className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 p-1">
                <div className="bg-white/95 backdrop-blur-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-100 to-rose-100">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      היסטוריית הפחתות תקציב
                    </h2>
                    <span className="mr-auto px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-bold">
                      {project.budgetDeductions.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions List */}
              <div className="p-4 sm:p-5 md:p-6">
                <div className="space-y-3">
                  {project.budgetDeductions.map((deduction, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-slate-900">{deduction.reason}</span>
                            <span className="text-xs text-slate-500">
                              ({formatDate(deduction.date || deduction.createdAt)})
                            </span>
                          </div>
                          {deduction.notes && (
                            <p className="text-sm text-slate-600 mb-2">{deduction.notes}</p>
                          )}
                          <p className="text-xs text-slate-500">
                            הופחת על ידי: {deduction.createdBy || "לא ידוע"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-red-600">
                            -{Number(deduction.amount).toLocaleString()} ₪
                          </span>
                          {/* כפתורי עריכה ומחיקה */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditDeduction(index)}
                              className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
                              title="עריכה"
                            >
                              <Edit2 className="w-4 h-4 text-orange-600" />
                            </button>
                            <button
                              onClick={() => setDeleteDeductionModal({ open: true, index })}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                              title="מחיקה"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* סה"כ הפחתות */}
                <div className="mt-4 p-3 rounded-xl bg-red-100 border-2 border-red-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-800">סה"כ הפחתות:</span>
                    <span className="text-xl font-bold text-red-700">
                      -{project.budgetDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString()} ₪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isSalaryProject && (
          <>
            {/* Orders Section */}
            <div className="relative mb-4 sm:mb-5 md:mb-6">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
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

                <div className="p-4 sm:p-5 md:p-6">
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
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
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

            <div className="p-4 sm:p-5 md:p-6">
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
                <>
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
                            className={`cursor-pointer border-t transition-colors ${invoice.type === "salary"
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

                            {/* סוג חשבונית - משכורת, מילגה או רגילה */}
                            <td className="px-4 py-3 text-center">
                              {invoice.type === "salary" ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white shadow-lg">
                                  💰 משכורת
                                </span>
                              ) : invoice.fundedFromProjectId ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg">
                                  🎓 מילגה
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
                              {isFundedFromThisProject ? (
                                // אם זו חשבונית מילגה שיורדת מהפרויקט הזה - מציגים את הסכום הכולל
                                invoice?.totalAmount !== undefined ? (
                                  formatCurrencyWithAlert(invoice.totalAmount)
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )
                              ) : (
                                // אם זו חשבונית רגילה - מציגים רק את הסכום של הפרויקט הזה
                                proj?.sum !== undefined ? (
                                  formatCurrencyWithAlert(proj.sum)
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-center">
                              {invoice.status || "לא הוזן"}
                            </td>

                            {hasNonSalaryInvoices && (
                              <td className="px-4 py-3 text-sm font-bold text-center">
                                {invoice.type !== "salary" ? (invoice.supplierId?.name || "—") : ""}
                              </td>
                            )}

                            <td className="px-4 py-3 text-sm font-bold text-center">
                              {invoice.paid === "כן" ? (
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">שולם</span>
                              ) : invoice.paid === "יצא לתשלום" ? (
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">יצא לתשלום</span>
                              ) : invoice.paid === "לא לתשלום" ? (
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">לא לתשלום</span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">לא שולם</span>
                              )}
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

                {/* כפתור ייצוא חשבוניות */}
                {!isSalaryProject && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleExportInvoices}
                      disabled={exportInvoiceLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      <span>{exportInvoiceLoading ? 'מוריד...' : 'ייצוא סיכום חשבוניות'}</span>
                    </button>
                  </div>
                )}
                </>
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
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-xl"></div>

            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
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

              <div className="p-4 sm:p-5 md:p-6">
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
                        disabled={exportLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        <span>{exportLoading ? 'מוריד...' : 'ייצוא סיכום משכורות'}</span>
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
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl sm:rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 max-w-md w-full">
                <div className="text-center mb-4 sm:mb-5 md:mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">
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

        {/* Budget Deduction Modal */}
        {budgetDeductionOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
            <div className="relative w-full max-w-md mx-auto my-8">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    {editDeductionIndex !== null ? "עריכת הפחתת תקציב" : "הפחתת תקציב"}
                  </h3>
                  <button
                    onClick={() => {
                      setBudgetDeductionOpen(false);
                      setEditDeductionIndex(null);
                      setBudgetDeductionData({
                        reason: "",
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        notes: "",
                      });
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* סיבת ההורדה */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      סיבת ההורדה *
                    </label>
                    <input
                      type="text"
                      value={budgetDeductionData.reason}
                      onChange={(e) =>
                        setBudgetDeductionData((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="למשל: שינוי תקציב..."
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  {/* סכום */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      סכום *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={budgetDeductionData.amount}
                        onChange={(e) =>
                          setBudgetDeductionData((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-sm"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                        ₪
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      תקציב נותר: {formatCurrencyWithAlert(project?.remainingBudget)}
                    </p>
                  </div>

                  {/* תאריך */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      תאריך
                    </label>
                    <input
                      type="date"
                      value={budgetDeductionData.date}
                      onChange={(e) =>
                        setBudgetDeductionData((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  {/* הערות */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      הערות
                    </label>
                    <textarea
                      value={budgetDeductionData.notes}
                      onChange={(e) =>
                        setBudgetDeductionData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="הערות נוספות (אופציונלי)..."
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors resize-none text-sm"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-slate-50 px-4 py-3 flex gap-2">
                  <button
                    onClick={handleBudgetDeduction}
                    disabled={deducting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg disabled:opacity-50 text-sm"
                  >
                    {deducting ? "מעדכן..." : editDeductionIndex !== null ? "שמור שינויים" : "הפחת תקציב"}
                  </button>
                  <button
                    onClick={() => {
                      setBudgetDeductionOpen(false);
                      setEditDeductionIndex(null);
                      setBudgetDeductionData({
                        reason: "",
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        notes: "",
                      });
                    }}
                    disabled={deducting}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all text-sm"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Addition Modal */}
        {budgetAdditionOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
            <div className="relative w-full max-w-md mx-auto my-8">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    {editAdditionIndex !== null ? "עריכת הוספת תקציב" : "הוספת תקציב"}
                  </h3>
                  <button
                    onClick={() => {
                      setBudgetAdditionOpen(false);
                      setEditAdditionIndex(null);
                      setBudgetAdditionData({
                        reason: "",
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        notes: "",
                      });
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* סיבת ההוספה */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      סיבת ההוספה *
                    </label>
                    <input
                      type="text"
                      value={budgetAdditionData.reason}
                      onChange={(e) =>
                        setBudgetAdditionData((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="למשל: שינוי תקציב..."
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  {/* סכום */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      סכום *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={budgetAdditionData.amount}
                        onChange={(e) =>
                          setBudgetAdditionData((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                        ₪
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      תקציב נותר: {formatCurrencyWithAlert(project?.remainingBudget)}
                    </p>
                  </div>

                  {/* תאריך */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      תאריך
                    </label>
                    <input
                      type="date"
                      value={budgetAdditionData.date}
                      onChange={(e) =>
                        setBudgetAdditionData((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    />
                  </div>

                  {/* הערות */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      הערות
                    </label>
                    <textarea
                      value={budgetAdditionData.notes}
                      onChange={(e) =>
                        setBudgetAdditionData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="הערות נוספות (אופציונלי)..."
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors resize-none text-sm"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-slate-50 px-4 py-3 flex gap-2">
                  <button
                    onClick={handleBudgetAddition}
                    disabled={adding}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg disabled:opacity-50 text-sm"
                  >
                    {adding ? "מעדכן..." : editAdditionIndex !== null ? "שמור שינויים" : "הוסף תקציב"}
                  </button>
                  <button
                    onClick={() => {
                      setBudgetAdditionOpen(false);
                      setEditAdditionIndex(null);
                      setBudgetAdditionData({
                        reason: "",
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        notes: "",
                      });
                    }}
                    disabled={adding}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all text-sm"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Addition Confirmation Modal */}
        {deleteAdditionModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="relative w-full max-w-sm mx-auto">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-2xl shadow-2xl p-6">
                <div className="text-center mb-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-3">
                    <Trash2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    מחיקת הוספת תקציב
                  </h3>
                  <p className="text-slate-600 text-sm">
                    האם למחוק את ההוספה? הסכום יופחת מתקציב הפרויקט.
                  </p>
                  {deleteAdditionModal.index !== null && project?.budgetAdditions?.[deleteAdditionModal.index] && (
                    <p className="mt-2 text-lg font-bold text-emerald-600">
                      {Number(project.budgetAdditions[deleteAdditionModal.index].amount).toLocaleString()} ₪
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAddition}
                    disabled={adding}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {adding ? "מוחק..." : "מחק"}
                  </button>
                  <button
                    onClick={() => setDeleteAdditionModal({ open: false, index: null })}
                    disabled={adding}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Deduction Confirmation Modal */}
        {deleteDeductionModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="relative w-full max-w-sm mx-auto">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-2xl shadow-2xl p-6">
                <div className="text-center mb-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-3">
                    <Trash2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    מחיקת הפחתת תקציב
                  </h3>
                  <p className="text-slate-600 text-sm">
                    האם למחוק את ההפחתה? הסכום יוחזר לתקציב הפרויקט.
                  </p>
                  {deleteDeductionModal.index !== null && project?.budgetDeductions?.[deleteDeductionModal.index] && (
                    <p className="mt-2 text-lg font-bold text-red-600">
                      {Number(project.budgetDeductions[deleteDeductionModal.index].amount).toLocaleString()} ₪
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteDeduction}
                    disabled={deducting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {deducting ? "מוחק..." : "מחק"}
                  </button>
                  <button
                    onClick={() => setDeleteDeductionModal({ open: false, index: null })}
                    disabled={deducting}
                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all"
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
