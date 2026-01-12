import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";

import {
  Receipt,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
  User,
  Hash,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Paperclip,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";

const InvoiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { user, isAdmin } = useAuth();

  // פונקציית בדיקת הרשאה עבור משתמש מול פרויקטי החשבונית
  const canUserViewInvoice = (invoiceData) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "accountant") return true; // accountant can view all invoices

    return invoiceData.projects.some((proj) =>
      user.permissions.some(
        (p) =>
          String(p.project) === String(proj.projectId) &&
          (p.modules?.invoices === "view" || p.modules?.invoices === "edit")
      )
    );
  };

  // טוען חשבונית
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const res = await api.get(`/invoices/${id}`);
        const data = res.data?.data;

        if (!data) {
          setLoading(false);
          return;
        }

        // בדיקת הרשאות
        if (!canUserViewInvoice(data)) {
          toast.error("אין לך הרשאה לצפות בחשבונית זו", {
            className: "sonner-toast error rtl",
          });
          navigate("/invoices");
          return;
        }

        // עיבוד קבצים
        data.files = (data.files || []).map((file, i) => ({
          ...file,
          name: file.name || file.originalName || `קובץ ${i + 1}`,
          url: file.url || file.fileUrl || file.secure_url,
        }));

        setInvoice(data);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת החשבונית");
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [id, user]);

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("he-IL");
  };

  const handleDelete = async () => {
    if (!invoice?._id) return;

    try {
      setDeleting(true);
      await api.delete(`/invoices/${invoice._id}`);
      toast.success("החשבונית נמחקה בהצלחה");
      navigate("/invoices");
    } catch (err) {
      toast.error("שגיאה במחיקה");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-orange-50">
        <ClipLoader size={90} color="#f97316" />
        <h1 className="mt-6 text-2xl font-bold">טוען חשבונית...</h1>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-orange-50">
        <AlertCircle className="w-20 h-20 text-red-500" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">חשבונית לא נמצאה</h1>
        <button
          onClick={() => navigate("/invoices")}
          className="mt-6 px-6 py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-800"
        >
          חזור לרשימה
        </button>
      </div>
    );
  }

  const hasNonSalaryInvoices = invoice.type !== "salary";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* HEADER */}
        <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Receipt className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>

                <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black mt-4 text-slate-900 flex items-center gap-3">
                  <span>חשבונית #{invoice.invoiceNumber}</span>
                  {invoice.fundedFromProjectId && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-base font-bold bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg">
                      מילגה 🎓
                    </span>
                  )}
                </h1>

                <div className="flex gap-3 sm:gap-4 mt-6">
            <button
              onClick={() => navigate("/invoices")}
              className="px-6 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold"
            >
              <ArrowRight className="inline-block w-4 h-4 ml-1" />
              חזרה
            </button>

            {/* כפתור עריכה - לא מוצג לרואת חשבון */}
            {user?.role !== "accountant" && (
              <button
                onClick={() => navigate(`/update-invoice/${invoice._id}`)}
                className="px-6 py-3 rounded-xl bg-orange-600 text-white font-bold shadow"
              >
                <Edit2 className="inline-block w-4 h-4 ml-1" />
                עריכה
              </button>
            )}

            {/* כפתור מחיקה - רק מנהל */}
            {isAdmin && (
              <button
                onClick={() => setConfirmOpen(true)}
                className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold shadow"
              >
                <Trash2 className="inline-block w-4 h-4 ml-1" />
                מחיקה
              </button>
            )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* DETAILS */}
        <div className="bg-white/90 shadow-lg rounded-2xl sm:rounded-3xl p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-orange-100">
        {/* סכום כולל */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            סכום כולל:{" "}
            <span className="text-green-700">
              {Number(invoice?.totalAmount || 0).toLocaleString()} ₪
            </span>
          </h2>
        </div>

        {/* שדות כלליים */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:p-5 md:p-6 mb-8">
          {
            hasNonSalaryInvoices && (

              <DetailCard
                label="שם ספק"
                icon={<User />}
                value={invoice.supplierId?.name || "לא הוזן"}
              />

            )}

          <DetailCard
            label="שם מזמין"
            icon={<User />}
            value={invoice.invitingName || "לא זמין"}
          />

          <DetailCard
            label="תאריך יצירה"
            icon={<Calendar />}
            value={formatDate(invoice.createdAt)}
          />

          <DetailCard
            label="סוג מסמך"
            icon={<FileText />}
            value={invoice.documentType}
          />

          <DetailCard
            label="סטטוס תשלום"
            icon={<CheckCircle2 />}
            value={
              invoice.paid === "כן"
                ? "שולם"
                : invoice.paid === "יצא לתשלום"
                ? "יצא לתשלום"
                : "לא שולם"
            }
          />

          <DetailCard
            label="תאריך תשלום"
            icon={<Calendar />}
            value={invoice.paymentDate ? formatDate(invoice.paymentDate) : "—"}
          />

          <DetailCard
            label="אמצעי תשלום"
            icon={<CreditCard />}
            value={
              invoice.paymentMethod === "bank_transfer"
                ? "העברה בנקאית"
                : invoice.paymentMethod === "check"
                  ? "צ'ק"
                  : "—"
            }
          />

          {/* ✅ אם זה צ'ק - הצג מספר צ'ק */}
          {invoice.paymentMethod === "check" && invoice.checkNumber && (
            <DetailCard
              label="מספר צ'ק"
              icon={<Hash />}
              value={invoice.checkNumber}
            />
          )}

          {/* ✅ אם זה צ'ק - הצג תאריך פירעון */}
          {invoice.paymentMethod === "check" && invoice.checkDate && (
            <DetailCard
              label="תאריך פירעון צ'ק"
              icon={<Calendar />}
              value={formatDate(invoice.checkDate)}
            />
          )}

          <DetailCard
            label="פירוט"
            icon={<FileText />}
            value={invoice.detail || "—"}
          />

          <DetailCard
            label="נוצר ע״י"
            icon={<User />}
            value={invoice.createdByName || "—"}
          />

          {/* ✅ הצגת סטטוס הגשה */}
          <DetailCard
            label="סטטוס הגשה"
            icon={<FileText />}
            value={
              invoice.status === "הוגש"
                ? <span className="font-bold text-green-600">הוגש ✓</span>
                : <span className="text-gray-500">לא הוגש</span>
            }
          />

          {/* ✅ אם הוגש - הצג לאיזה פרויקט */}
          {invoice.status === "הוגש" && invoice.submittedToProjectId && (
            <DetailCard
              label="הוגש לפרויקט"
              icon={<Building2 />}
              value={invoice.submittedToProjectId?.name || "טוען..."}
            />
          )}

          {/* ✅ אם הוגש - הצג תאריך הגשה */}
          {invoice.status === "הוגש" && invoice.submittedAt && (
            <DetailCard
              label="תאריך הגשה"
              icon={<Calendar />}
              value={formatDate(invoice.submittedAt)}
            />
          )}

          {/* תווית מילגה - אם החשבונית יורדת מפרויקט מילגה */}
          {invoice.fundedFromProjectId && (
            <>
              <DetailCard
                label="סוג חשבונית"
                icon={<Sparkles />}
                value="מילגה 🎓"
              />
              <DetailCard
                label="ממומן מפרויקט"
                icon={<Building2 />}
                value={
                  typeof invoice.fundedFromProjectId === "object"
                    ? invoice.fundedFromProjectId?.name || "—"
                    : invoice.projects?.find(
                        (p) => p.projectName !== "מילגה"
                      )?.projectName || "—"
                }
              />
            </>
          )}
        </div>

        {/* PROJECTS */}
        <div className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Building2 className="w-6 h-6 text-orange-600" />
            פרויקטים בחשבונית
          </h2>

          <div className="space-y-4">
            {invoice.projects
              .filter((proj) => {
                // ✅ סנן פרויקט מילגה מהתצוגה - הוא לא צריך להופיע כי אין לו תקציב משלו
                return proj.projectName !== "מילגה";
              })
              .map((proj, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-lg">{proj.projectName}</p>
                  </div>

                  <div className="text-right font-bold text-green-700">
                    {(proj.sum || 0).toLocaleString()} ₪
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* FILES */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Paperclip className="w-6 h-6 text-purple-600" />
            קבצים מצורפים
          </h2>

          {invoice.files.length === 0 && (
            <p className="text-slate-600 text-center py-6">אין קבצים</p>
          )}

          <div className="space-y-3">
            {invoice.files.map((file, idx) => (
              <FileItem key={idx} file={file} />
            ))}
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-2xl font-bold text-center mb-4">
              למחוק חשבונית?
            </h3>
            <p className="text-center text-slate-700 mb-4 sm:mb-5 md:mb-6">
              פעולה זו בלתי הפיכה.
            </p>

            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold"
              >
                {deleting ? "מוחק..." : "מחק"}
              </button>

              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 bg-slate-200 py-3 rounded-xl font-bold"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

const DetailCard = ({ label, value, icon }) => (
  <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
    <div className="flex gap-3 items-start">
      <div className="p-2 rounded-lg bg-orange-100">{icon}</div>
      <div className="flex-1">
        <p className="text-xs font-bold text-orange-600">{label}</p>
        <p className="font-bold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

const FileItem = ({ file }) => {
  const url = file.url;
  const name = file.name;

  return (
    <div className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-slate-600" />
        <span className="font-medium">{name}</span>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-bold flex items-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        פתח
      </a>
    </div>
  );
};

export default InvoiceDetailsPage;
