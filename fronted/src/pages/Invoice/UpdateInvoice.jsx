import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import FileUploader from "../../Components/FileUploader";

// Icons (lucide-react)
import {
  FileText,
  ClipboardList,
  User as UserIcon,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Upload,
  Save,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import DateField from "../../Components/DateField";

const InvoiceEditPage = () => {
  const [invoice, setInvoice] = useState(null);

  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [invitingName, setInvitingName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [sum, setSum] = useState("");

  const [paid, setPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [createdAt, setCreatedAt] = useState("");
  const [documentType, setDocumentType] = useState("");

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const { data: invoiceData } = await api.get(`/invoices/${id}`);
        if (!invoiceData) {
          setLoading(false);
          return;
        }

        setInvoice(invoiceData);

        setInvoiceNumber(invoiceData.invoiceNumber ?? "");
        setSum(invoiceData.sum ?? "");
        setStatus(invoiceData.status ?? "");
        setDetail(invoiceData.detail ?? "");
        setInvitingName(invoiceData.invitingName ?? "");
        setDocumentType(invoiceData.documentType ?? "");
        setPaid(invoiceData.paid ?? "לא");

        if (invoiceData.createdAt) {
          const d = new Date(invoiceData.createdAt);
          setCreatedAt(d.toISOString().split("T")[0]);
        } else {
          setCreatedAt(new Date().toISOString().split("T")[0]);
        }

        if (invoiceData.paymentDate) {
          const d = new Date(invoiceData.paymentDate);
          setPaymentDate(d.toISOString().split("T")[0]);
        } else {
          setPaymentDate("");
        }

        setPaymentMethod(invoiceData.paymentMethod ?? "");

        const processed = await ensureFilesHydrated(invoiceData.files || []);
        setFiles(processed);
      } catch (err) {
        console.error("Error loading invoice:", err);
        toast.error("שגיאה בטעינת החשבונית", { className: "sonner-toast error rtl" });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchInvoice();
  }, [id]);

  const ensureFilesHydrated = async (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        if (file?.url || file?.fileUrl || file?.secure_url) {
          out.push({
            ...file,
            url: file.url || file.fileUrl || file.secure_url,
            name: file.name || file.originalName || file.filename || `קובץ ${i + 1}`,
          });
        } else if (file?._id) {
          const { data } = await api.get(`/files/${file._id}`);
          if (data) {
            out.push({
              ...data,
              url: data.url || data.fileUrl || data.secure_url,
              name: data.name || data.originalName || data.filename || `קובץ ${i + 1}`,
            });
          }
        } else if (file) {
          out.push({
            ...file,
            name: file.name || file.originalName || file.filename || `קובץ ${i + 1}`,
          });
        }
      } catch {
        if (file) {
          out.push({
            ...file,
            name: file.name || file.originalName || file.filename || `קובץ ${i + 1}`,
            url: file.url || file.fileUrl || file.secure_url || null,
          });
        }
      }
    }
    return out;
  };

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "תאריך לא זמין";

  const extractPublicIdFromUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/");
      const uploadIdx = parts.indexOf("upload");
      if (uploadIdx === -1 || parts.length <= uploadIdx + 1) return null;

      const relevant = parts.slice(uploadIdx + 1);
      if (relevant[0]?.startsWith("v")) relevant.shift();
      const fileNameWithExt = relevant.pop();
      const folder = relevant.join("/");
      const withoutExt = fileNameWithExt.replace(/\.[^/.]+$/, "");
      return folder ? `${folder}/${withoutExt}` : withoutExt;
    } catch {
      return null;
    }
  };

  const handlePaymentDateChange = (e) => {
    const newDate = e.target.value;
    setPaymentDate(newDate);
    setPaid(newDate ? "כן" : "לא");
  };

  const handlePaidChange = (e) => {
    const val = e.target.value;
    setPaid(val);
    if (val === "לא") {
      setPaymentDate("");
      setPaymentMethod("");
    }
  };

  const handleFileUpload = (selectedFiles) => {
    if (!selectedFiles?.length) {
      toast.error("לא נבחרו קבצים", { className: "sonner-toast error rtl" });
      return;
    }
    setFiles((prev) => [...(prev || []), ...selectedFiles]);
    toast.success(`${selectedFiles.length} קבצים נבחרו (יועלו בשמירה)`, {
      className: "sonner-toast success rtl",
    });
  };

  const handleRemoveFile = async (fileIndex) => {
    const fileToDelete = files[fileIndex];
    if (!fileToDelete) {
      toast.error("קובץ לא נמצא");
      return;
    }

    if (fileToDelete.isLocal) {
      const clone = [...files];
      clone.splice(fileIndex, 1);
      setFiles(clone);
      if (fileToDelete.tempUrl) URL.revokeObjectURL(fileToDelete.tempUrl);
      toast.success("הקובץ הוסר מהרשימה");
      return;
    }

    const clone = [...files];
    clone.splice(fileIndex, 1);
    setFiles(clone);

    const fileUrl = fileToDelete.url || fileToDelete.fileUrl;
    if (fileUrl) {
      const publicId = extractPublicIdFromUrl(fileUrl);
      if (publicId) {
        try {
          await api.delete("/upload/delete-cloudinary", {
            data: { publicId, resourceType: "raw" },
          });
          toast.success("הקובץ נמחק מ-Cloudinary");
        } catch {
          toast.warning("הוסר מהרשימה. בדוק ידנית אם נמחק מ-Cloudinary");
        }
      }
    }
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;
    const isLocal = file?.isLocal || false;
    if (!fileUrl && !isLocal) return <span className="text-slate-500">—</span>;

    if (isLocal) {
      return (
        <span className="text-gray-700 text-sm">
          📄 {file.name} {file.size ? `(${(file.size / 1024).toFixed(1)} KB)` : ""}{" "}
          <span className="text-orange-500 text-xs font-bold">(יועלה בשמירה)</span>
        </span>
      );
    }

    const ext = (fileUrl.split(".").pop() || "").toLowerCase();
    if (ext === "pdf") {
      return (
        <>
          <span className="text-gray-700">{file.name}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 hover:underline"
          >
            צפה ב-PDF
          </a>
        </>
      );
    }
    if (ext === "xlsx" || ext === "xls") {
      const openInExcelViewer = (url) => {
        const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
          url
        )}`;
        window.open(officeUrl, "_blank");
      };
      return (
        <>
          <span className="text-gray-700">{file.name}</span>
          <button
            type="button"
            onClick={() => openInExcelViewer(fileUrl)}
            className="ml-2 text-blue-600 hover:underline"
          >
            צפה באקסל
          </button>
        </>
      );
    }
    if (/\.(jpeg|jpg|png|gif)$/i.test(fileUrl)) {
      return (
        <>
          <span className="text-gray-700">{file.name}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 hover:underline"
          >
            צפה בתמונה
          </a>
        </>
      );
    }
    return (
      <>
        <span className="text-gray-700">{file.name}</span>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-blue-600 hover:underline"
        >
          הורד קובץ
        </a>
      </>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!invoiceNumber) {
      toast.error("חסר מספר חשבונית");
      setLoading(false);
      return;
    }
    if (!sum || Number(sum) <= 0) {
      toast.error("יש להזין סכום תקין");
      setLoading(false);
      return;
    }
    if (!status) {
      toast.error("חסר סטטוס חשבונית");
      setLoading(false);
      return;
    }
    if (!invitingName) {
      toast.error("חסר שם מזמין");
      setLoading(false);
      return;
    }
    if (!createdAt) {
      toast.error("יש לבחור תאריך יצירת החשבונית", { className: "sonner-toast error rtl" });
      setLoading(false);
      return;
    }

    if (paid === "כן" && (!paymentDate || !paymentMethod)) {
      toast.error("יש לבחור גם תאריך תשלום וגם צורת תשלום");
      setLoading(false);
      return;
    }

    try {
      const uploadedFiles = [];
      if (files?.length) {
        for (const f of files) {
          if (f.isLocal && f.file) {
            const fd = new FormData();
            fd.append("file", f.file);
            fd.append("folder", f.folder || "invoices");
            const { data } = await api.post("/upload", fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            uploadedFiles.push({
              name: f.name,
              url: data.file.url,
              type: f.type,
              size: f.size,
              publicId: data.file.publicId,
              resourceType: data.file.resourceType,
            });
          } else {
            uploadedFiles.push(f);
          }
        }
      }

      const formData = {
        invoiceNumber,
        sum: Number(sum),
        status,
        detail,
        invitingName,
        paid,
        files: uploadedFiles,
        createdAt,
        documentType,
        paymentDate: paid === "כן" ? paymentDate : null,
        paymentMethod: paid === "כן" ? paymentMethod : "",
      };

      const res = await api.put(`/invoices/${id}`, formData);

      toast.success("החשבונית עודכנה בהצלחה!", { className: "sonner-toast success rtl" });
      setInvoice(res.data);
      navigate(`/invoices`);
    } catch (err) {
      console.error("Error updating invoice:", err);
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || "שגיאה בעדכון החשבונית";
      toast.error(msg, { className: "sonner-toast error rtl" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text">
          טוען חשבונית...
        </h1>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex justify-center items-center">
        <div className="text-center">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-600">חשבונית לא נמצאה</h1>
        </div>
      </div>
    );
  }

  const PaidBadge =
    paid === "כן" ? (
      <span className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300">
        <CheckCircle2 className="w-5 h-5" /> שולם
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-400 to-slate-500 px-5 py-2.5 text-white text-sm font-bold shadow-lg shadow-slate-400/30">
        <XCircle className="w-5 h-5" /> לא שולם
      </span>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-12">
        {/* Hero Header */}
        <header className="max-w-6xl mx-auto mb-10">
          <div className="relative">
            {/* Decorative gradient bar */}
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>
            
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text">
                        עריכת חשבונית
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-slate-600">
                          ניהול מתקדם של מסמכים פינסיים
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
                    עדכן פרטי חשבונית, סטטוס תשלום, קבצים מצורפים ומידע נוסף במערכת ניהול החשבוניות המתקדמת
                  </p>
                </div>
                {PaidBadge}
              </div>
            </div>
          </div>
        </header>

        {/* Main Form Card */}
        <form
          onSubmit={handleSubmit}
          className="max-w-6xl mx-auto relative"
        >
          {/* Decorative elements */}
          <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-2xl"></div>
          
          <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {/* Top Info Bar with Gradient */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-6 flex flex-wrap items-center gap-6 justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <ClipboardList className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 block mb-1">מספר חשבונית</span>
                    <span className="font-bold text-xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text">
                      {invoiceNumber}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      תאריך חשבונית
                    </label>
                    <input
                      type="date"
                      value={createdAt}
                      onChange={(e) => setCreatedAt(e.target.value)}
                      className="rounded-xl border-2 border-amber-200 bg-white/90 px-3 py-2 text-sm font-semibold text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
                      onFocus={(e) => e.target.showPicker()}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-8 space-y-10">
              {/* Section: פרטי מסמך */}
              <section className="relative">
                <div className="absolute -right-4 top-0 w-1 h-full bg-gradient-to-b from-orange-500 to-amber-500 rounded-full"></div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text">
                    פרטי מסמך
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      סכום
                    </label>
                    <input
                      type="number"
                      value={sum}
                      onChange={(e) => setSum(e.target.value)}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                      placeholder="0.00 ₪"
                    />
                  </div>

                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">סטטוס</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all group-hover:border-amber-300"
                    >
                      <option value="הוגש">הוגש</option>
                      <option value="בעיבוד">בעיבוד</option>
                      <option value="לא הוגש">לא הוגש</option>
                    </select>
                  </div>

                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">סוג מסמך</label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 transition-all group-hover:border-yellow-300"
                      required
                    >
                      <option value="">בחר סוג מסמך…</option>
                      <option value="ח. עסקה">ח. עסקה</option>
                      <option value="ה. עבודה">ה. עבודה</option>
                      <option value="ד. תשלום">
                        ד. תשלום
                      </option>
                      <option value="חשבונית מס / קבלה">
                        חשבונית מס / קבלה
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1 group">
                    <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-orange-500" />
                      שם מזמין
                    </label>
                    <input
                      type="text"
                      value={invitingName}
                      onChange={(e) => setInvitingName(e.target.value)}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                      placeholder="הזן שם מזמין"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">פירוט</label>
                    <textarea
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      className="mt-2 w-full min-h-[120px] rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all resize-none group-hover:border-amber-300"
                      placeholder="הוסף פירוט נוסף על החשבונית..."
                    />
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full py-1">
                    פרטי תשלום
                  </span>
                </div>
              </div>

              {/* Section: תשלום */}
              <section className="relative">
                <div className="absolute -right-4 top-0 w-1 h-full bg-gradient-to-b from-amber-500 to-yellow-500 rounded-full"></div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text">
                    פרטי תשלום
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      האם שולם?
                    </label>
                    <select
                      value={paid}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaid(val);
                        if (val === "לא") {
                          setPaymentDate("");
                          setPaymentMethod("");
                        }
                      }}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all group-hover:border-emerald-300"
                    >
                      <option value="לא">לא</option>
                      <option value="כן">כן</option>
                    </select>
                  </div>

               <div className="group">
  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
    <Calendar className="w-4 h-4 text-emerald-500" />
    תאריך התשלום
  </label>

  {paid === "כן" ? (
    <DateField
      type="date"
      value={paymentDate}
      onChange={(val) => setPaymentDate(val)}
      className={`w-full p-3 border-2 rounded-xl font-medium transition-all focus:outline-none focus:ring-4
        ${
          !paymentDate
            ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20"
            : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20 group-hover:border-emerald-300"
        }`}
      placeholder="yyyy-mm-dd"
      required={paid === "כן"}
    />
  ) : (
    <div className="mt-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 rounded-xl px-4 py-3 text-center font-medium border-2 border-slate-200">
      החשבונית לא שולמה
    </div>
  )}
</div>


                  <div className="group">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                      צורת תשלום
                    </label>
                    {paid === "כן" ? (
                      <select
                        name="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`mt-2 w-full rounded-xl border-2 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 transition-all
                          ${
                            !paymentMethod
                              ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20"
                              : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20 group-hover:border-emerald-300"
                          }`}
                        required={paid === "כן"}
                      >
                        <option value="">בחר צורת תשלום…</option>
                        <option value="bank_transfer">העברה בנקאית</option>
                        <option value="check">צ׳ק</option>
                      </select>
                    ) : (
                      <input
                        disabled
                        value="—"
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-3 text-sm text-slate-400 font-medium text-center"
                      />
                    )}
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full py-1">
                    קבצים מצורפים
                  </span>
                </div>
              </div>

              {/* Section: קבצים */}
              <section className="relative">
                <div className="absolute -right-4 top-0 w-1 h-full bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg shadow-yellow-500/30">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text">
                    קבצים מצורפים
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 hover:border-orange-400 transition-all">
                    <FileUploader
                      onUploadSuccess={handleFileUpload}
                      folder="invoices"
                      label="העלה קבצים"
                    />
                  </div>

                  {files?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {files.map((file, i) => (
                        <div
                          key={i}
                          className="group relative flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/10 transition-all"
                        >
                          <div className="truncate flex items-center gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                              <FileText className="w-4 h-4 text-orange-600" />
                            </div>
                            {renderFile(file)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(i)}
                            className="mr-2 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-all"
                          >
                            הסר
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">אין קבצים מצורפים כרגע</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Footer with Action Button */}
            <div className="border-t-2 border-slate-100 bg-gradient-to-r from-slate-50/50 to-white/50 backdrop-blur-xl p-6">
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/invoices")}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <ClipLoader size={18} color="#ffffff" />
                      <span>מעדכן...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>שמור שינויים</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceEditPage;