import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import {
  User,
  Edit2,
  ArrowRight,
  Receipt,
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  Landmark,
  CreditCard,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import CreatorInfo from '../../Components/CreatorInfo';

const SupplierDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const arr = (res) =>
    Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      console.log("🔥 SUPPLIER PAGE START LOAD id =", id);

      try {
        setLoading(true);
        setInvoicesLoading(true); // ← להתחיל טעינת חשבוניות

        const res = await api.get(`/suppliers/${id}`);
        const supplier = res?.data?.data;

        console.log("RAW RESPONSE:", res.data);
        console.log("FINAL SUPPLIER:", supplier);

        setSupplier(supplier);
        setInvoices(supplier?.invoices ?? []);

      } catch (err) {
        console.log("❌ ERROR FETCHING SUPPLIER:", err);
        toast.error("שגיאה בטעינת הספק", {
          className: "sonner-toast error rtl",
        });
      } finally {
        console.log("✅ FINALLY RAN - STOP LOADING");

        setLoading(false);
        setInvoicesLoading(false); // ← זה מה שהיה חסר!
      }
    };

    load();
  }, [id]);





  const INTERIM_TYPES = new Set(["ח. עסקה", "ה. עבודה", "ד. תשלום"]);
  const FINAL_TYPES = new Set([
    "חשבונית מס/קבלה",
    "חשבונית מס / קבלה", // עם רווחים – נתמוך גם בזה
    "חשבונית מס-קבלה",
    "חשבונית מס קבלה",
  ]);

  const normalizeType = (t) =>
    String(t || "")
      .replace(/\s+/g, " ") // רווחים כפולים
      .replace(/\s*\/\s*/g, "/") // רווחים סביב "/"
      .trim();

  const getActionState = (invoice) => {
    const t = normalizeType(invoice?.documentType);
    const okF = FINAL_TYPES.has(t);
    const okI = INTERIM_TYPES.has(t);

    const status = okF ? "הושלם" : "חסר";
    const label = okF ? "חשבונית מס/קבלה" : okI ? t : "";
    const color = okF
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

    return { status, label, color };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען פרטי ספק...
        </h1>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="text-center">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-600">ספק לא נמצא</h1>
          <button
            onClick={() => navigate("/suppliers")}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
          >
            חזור לרשימת ספקים
          </button>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num ? num.toLocaleString("he-IL") : "0";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatILS = (n) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
    }).format(Number(n || 0));

  const paidBadge = (paid) => (
    <span
      className={
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold " +
        (paid === "כן" || paid === true
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-amber-100 text-amber-700 border border-amber-200")
      }
    >
      {paid === "כן" || paid === true ? (
        <>
          <CheckCircle2 className="w-3 h-3" /> שולם
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3" /> לא שולם
        </>
      )}
    </span>
  );

  const pmHebrew = (pm) => {
    const map = {
      cash: "מזומן",
      card: "אשראי",
      transfer: "העברה בנקאית",
      check: "צ׳ק",
      other: "אחר",
    };
    return map[pm] || pm || "—";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background Elements */}
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
                  <User className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    פרטי ספק
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      {supplier.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/suppliers")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לרשימה</span>
                </button>
                <button
                  onClick={() => navigate(`/update-supplier/${id}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>עריכת ספק</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Supplier Details Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {/* Section Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <Building2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    פרטי הספק
                  </h2>
                </div>
              </div>
            </div>

            {/* Supplier Info Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        שם הספק
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {supplier.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Tax */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Hash className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        מספר עוסק
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatNumber(supplier.business_tax)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Phone className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        טלפון
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {supplier.phone || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Mail className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        אימייל
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {supplier.email || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        כתובת
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {supplier.address || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* createdAt */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-5 h-5 text-orange-600" />

                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תאריך יצירה
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatDate(supplier.date || "לא זמין")}
                      </p>
                    </div>
                  </div>
                </div>
                {/* createdByName */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-5 h-5 text-orange-600" />

                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        נוצר ע"י
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {supplier.createdByName || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        {



          supplier.bankDetails ? (
            <div className="relative mb-6">
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-500/10 border border-white/50 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-1">
                  <div className="bg-white/95 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100">
                        <Landmark className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        פרטי חשבון בנק
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <Landmark className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-emerald-600 mb-1">
                            שם הבנק
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {supplier.bankDetails?.bankName ? supplier.bankDetails.bankName : "לא זמין"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-emerald-600 mb-1">
                            מספר סניף
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {supplier.bankDetails.branchNumber || "לא זמין"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-emerald-600 mb-1">
                            מספר חשבון
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {supplier.bankDetails.accountNumber || "לא זמין"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mb-6">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-r-4 border-yellow-500 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-800">שים לב</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    לא נמצאו פרטי חשבון בנק עבור ספק זה.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Invoices Section */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100">
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    חשבוניות של הספק
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6">
              {invoicesLoading ? (
                <div className="flex items-center gap-3 text-slate-700 justify-center py-8">
                  <ClipLoader size={26} color="#8b5cf6" />
                  <span>טוען חשבוניות…</span>
                </div>
              ) : !invoices.length ? (
                <div className="text-center py-8 text-slate-600">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>לא נמצאו חשבוניות עבור ספק זה.</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  {/* <div className="mb-4 flex flex-wrap gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900">
                        סה״כ חשבוניות:
                      </span>
                      <span className="text-purple-700">{invoices.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900">
                        סה״כ סכום:
                      </span>
                      <span className="text-purple-700">
                        {formatILS(
                          invoices.reduce(
                            (acc, inv) => acc + Number(inv.sum || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div> */}

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border-2 border-purple-200">
                    <table className="min-w-full text-right">
                      <thead className="bg-gradient-to-r from-purple-100 to-indigo-100">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            #
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            פרויקט
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            מס׳ חשבונית
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            סכום
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            הוגש ?
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            סטטוס
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            שולם?
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            צורת תשלום
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            תאריך חשבונית
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            תאריך תשלום
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            קבצים
                          </th>
                          <th className="px-4 py-3 text-xs font-bold text-purple-900">
                            פעולות
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {invoices.map((inv, i) => (
                          <tr
                            key={inv._id || i}
                            role="button" // נגישות
                            tabIndex={0} // פוקוס עם מקלדת
                            aria-label={`פרטי חשבונית ${inv.invoiceNumber || ""
                              }`}
                            className="group border-t border-purple-100 hover:bg-purple-50/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/invoices/${inv._id}`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(`/invoices/${inv._id}`);
                              }
                            }}
                          >
                            <td className="px-4 py-3 text-sm">{i + 1}</td>

                            <td className="px-4 py-3 text-sm">
                              {inv.projectName || "—"}
                              {inv.projectId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // חשוב כדי לא להפעיל את onClick של השורה
                                    navigate(
                                      `/projects/${typeof inv.projectId === "object"
                                        ? inv.projectId._id
                                        : inv.projectId
                                      }`
                                    );
                                  }}
                                  className="mr-2 text-purple-600 hover:text-purple-800 inline-flex items-center gap-1"
                                  title="פתח פרויקט"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm font-bold">
                              {inv.invoiceNumber || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold">
                              {formatILS(inv.sum)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {inv.status || "—"}
                            </td>

                            <td className="px-4 py-3 text-sm">
                              {(() => {
                                const a = getActionState(inv);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border ${a.color}`}
                                  >
                                    {a.status} • {a.label}
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="px-4 py-3">{paidBadge(inv.paid)}</td>
                            <td className="px-4 py-3 text-sm">
                              {pmHebrew(inv.paymentMethod)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(inv.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(inv.paymentDate)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {Array.isArray(inv.files) ? inv.files.length : 0}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/invoices/${inv._id}`);
                                  }}
                                  className="px-3 py-1 text-xs rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold transition-all"
                                  title="פרטים"
                                >
                                  פרטים
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/update-invoice/${inv._id}`);
                                  }}
                                  className="px-3 py-1 text-xs rounded-lg bg-purple-700 text-white hover:bg-purple-800 font-bold transition-all"
                                  title="עריכה"
                                >
                                  עריכה
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailsPage;
