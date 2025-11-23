import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
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
  Download,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const InvoiceDetailsPage = () => {
  const { projectId, id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        const response = await api.get(`/invoices/${id}`);
        const invoiceData = response.data.data;

        if (!invoiceData) {
          setLoading(false);
          return;
        }

        if (invoiceData.files && invoiceData.files.length > 0) {
          const processedFiles = [];

          for (let i = 0; i < invoiceData.files.length; i++) {
            const file = invoiceData.files[i];

            try {
              if (file && (file.url || file.fileUrl || file.secure_url)) {
                processedFiles.push({
                  ...file,
                  url: file.url || file.fileUrl || file.secure_url,
                  name:
                    file.name ||
                    file.originalName ||
                    file.filename ||
                    `קובץ ${i + 1}`,
                });
                continue;
              }

              if (file && file._id) {
                const fileRes = await api.get(`/files/${file._id}`);
                if (fileRes.data) {
                  processedFiles.push({
                    ...fileRes.data,
                    name:
                      fileRes.data.name ||
                      fileRes.data.originalName ||
                      fileRes.data.filename ||
                      `קובץ ${i + 1}`,
                  });
                }
              } else {
                if (file) {
                  processedFiles.push({
                    ...file,
                    name:
                      file.name ||
                      file.originalName ||
                      file.filename ||
                      `קובץ ${i + 1}`,
                  });
                }
              }
            } catch (fileError) {
              console.error(`Error fetching file ${i + 1}:`, fileError);
              if (file) {
                processedFiles.push({
                  ...file,
                  name:
                    file.name ||
                    file.originalName ||
                    file.filename ||
                    `קובץ ${i + 1}`,
                  url: file.url || file.fileUrl || file.secure_url || null,
                });
              }
            }
          }

          invoiceData.files = processedFiles;
        } else {
          invoiceData.files = [];
        }

        setInvoice(invoiceData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching invoice details:", error);
        toast.error("שגיאה בטעינת פרטי החשבונית", {
          className: "sonner-toast error rtl",
        });
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoiceDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען פרטי חשבונית...
        </h1>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-600">חשבונית לא נמצאה</h1>
          <button
            onClick={() => navigate("/invoices")}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
          >
            חזור לרשימת חשבוניות
          </button>
        </div>
      </div>
    );
  }

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file, index) => {
    const fileUrl = file?.url || file?.fileUrl;
    const fileName = file?.name || `קובץ ${index + 1}`;

    if (!fileUrl) {
      return (
        <div className="text-red-500 text-sm">שגיאה: לא נמצא קישור לקובץ</div>
      );
    }

    const fileExtension = fileUrl.split(".").pop().toLowerCase();

    if (fileExtension === "pdf") {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            צפה ב-PDF
          </a>
        </div>
      );
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <button
            onClick={() => openInExcelViewer(fileUrl)}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            צפה באקסל
          </button>
        </div>
      );
    } else if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            צפה בתמונה
          </a>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">
              {fileName}
            </span>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            הורד
          </a>
        </div>
      );
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-invoice/${id}`);
  };

  const handleDelete = async () => {
    try {
      if (!invoice?._id) return;
      setDeleting(true);
      await api.delete(`/invoices/${invoice._id}`);

      toast.success("החשבונית נמחקה בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate(`/invoices`);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("שגיאה במחיקת החשבונית", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

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
                  <Receipt className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    פרטי חשבונית
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      מספר {invoice.invoiceNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/invoices")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לרשימה</span>
                </button>
                <button
                  onClick={() => handleEdit(invoice._id)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>ערוך חשבונית</span>
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl shadow-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>מחק חשבונית</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Invoice Details Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    פרטי החשבונית
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Supplier Name */}
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
                        {invoice.invitingName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invoice Number */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Hash className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        מספר חשבונית
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.invoiceNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sum */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <DollarSign className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        סכום
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatNumber(invoice.sum)} ₪
                      </p>
                    </div>
                  </div>
                </div>

                {/* Created Date */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תאריך חשבונית
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatHebrewDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detail */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        פירוט
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.detail || "לא הוזן פירוט"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Building2 className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        פרויקט
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.projectName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        סטטוס חשבונית
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Date */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תאריך התשלום
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.paymentDate
                          ? formatHebrewDate(invoice.paymentDate)
                          : "לא שולם"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Type */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        סוג מסמך
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.documentType || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        צורת תשלום
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {invoice.paymentMethod === "check"
                          ? "צ'יק"
                          : invoice.paymentMethod === "bank_transfer"
                          ? "העברה בנקאית"
                          : "לא הוגדר"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100">
                    <Paperclip className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    קבצים מצורפים
                  </h2>
                  {invoice.files && invoice.files.length > 0 && (
                    <span className="mr-auto px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                      {invoice.files.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {invoice.files && invoice.files.length > 0 ? (
                <div className="space-y-3">
                  {invoice.files.map((file, index) => (
                    <div key={index}>{renderFile(file, index)}</div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-lg">אין קבצים מצורפים</p>
                </div>
              )}
            </div>
          </div>
        </div>

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
                    האם למחוק את החשבונית?
                  </h3>
                  <p className="text-slate-600">הפעולה בלתי הפיכה.</p>
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

export default InvoiceDetailsPage;
