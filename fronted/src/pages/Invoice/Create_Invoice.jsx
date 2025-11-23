import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import FileUploader from "../../Components/FileUploader";
import { toast } from "sonner";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
import DateField from "../../Components/DateField.jsx";
import {
  FileText,
  ClipboardList,
  User as UserIcon,
  Calendar,
  CreditCard,
  Upload,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "check", label: "צ׳ק" },
];

const CreateInvoice = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceIndexToDelete, setInvoiceIndexToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

const { user, loading: authLoading } = useAuth();

useEffect(() => {
  const fetchProjects = async () => {
    try {
      const response = await api.get("/projects");

      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      // אם ההרשאות עדיין נטענות — תציג הכל זמנית
      if (authLoading) {
        setProjects(data);
        return;
      }

      // אין משתמש
      if (!user) {
        setProjects([]);
        return;
      }

      // אדמין → רואה הכל
      if (user.role === "admin") {
        setProjects(data);
        return;
      }

      // משתמש רגיל → מסנן לפי ההרשאות
      if (!user.permissions || !Array.isArray(user.permissions)) {
        setProjects([]);
        return;
      }

      const allowedProjectIds = user.permissions
        .map((p) => String(p.project?._id || p.project))
        .filter(Boolean);

      const filtered = data.filter((p) =>
        allowedProjectIds.includes(String(p._id))
      );

      setProjects(filtered);
    } catch (err) {
      console.error("❌ שגיאה בטעינת פרויקטים:", err);
      setProjects([]);
    }
  };

  fetchProjects();
}, [user, authLoading]);


  useEffect(() => {
    const draftStr = sessionStorage.getItem("invoiceDraft");
    if (draftStr && projects.length) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft?.invoices) setInvoices(draft.invoices);
        if (draft?.selectedProjectId) {
          const p = projects.find((pr) => pr._id === draft.selectedProjectId);
          if (p) setSelectedProject(p);
        }
      } catch {
      } finally {
        sessionStorage.removeItem("invoiceDraft");
      }
    }
  }, [projects]);

  useEffect(() => {
    const supplierStr = sessionStorage.getItem("createdSupplier");
    const targetIndexStr = sessionStorage.getItem("targetInvoiceIndex");
    if (supplierStr && targetIndexStr) {
      try {
        const supplier = JSON.parse(supplierStr);
        const idx = Number(targetIndexStr);
        setInvoices((prev) => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              invitingName: supplier?.name || supplier?.supplierName || "",
              supplierId: supplier?._id || supplier?.id || "",
            };
          }
          return next;
        });
      } catch {
      } finally {
        sessionStorage.removeItem("createdSupplier");
        sessionStorage.removeItem("targetInvoiceIndex");
      }
    }
  }, []);

  useEffect(() => {
    if (!projects.length) return;

    const projectIdFromQuery = searchParams.get("projectId");
    if (!projectIdFromQuery) return;

    const p = projects.find(
      (pr) => String(pr._id) === String(projectIdFromQuery)
    );
    if (!p) return;

    setSelectedProject(p);

    // אם אין עדיין שורות חשבונית – ליצור אחת ריקה קשורה לפרויקט
    setInvoices((prev) =>
      prev.length
        ? prev
        : [
            {
              projectName: p.name,
              invoiceNumber: "",
              detail: "",
              sum: "",
              status: "לא הוגש",
              paid: "לא",
              invitingName: "",
              files: [],
              paymentDate: "",
              supplierId: "",
              documentType: "",
              paymentMethod: "",
            },
          ]
    );
  }, [projects, searchParams]);

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    if (!projectId) {
      setSelectedProject(null);
      return;
    }
    const selected = projects.find((project) => project._id === projectId);
    setSelectedProject(selected || null);
  };

  const addInvoice = () => {
    if (!selectedProject) {
      toast.error("יש לבחור פרוייקט קודם", {
        className: "sonner-toast error rtl",
      });
      return;
    }
    setInvoices([
      ...invoices,
      {
        projectName: selectedProject?.name || "",
        invoiceNumber: "",
        detail: "",
        sum: "",
        status: "לא הוגש",
        paid: "לא",
        invitingName: "",
        files: [],
        paymentDate: "",
        supplierId: "",
        documentType: "",
        paymentMethod: "",
      },
    ]);
  };

  const removeInvoice = (index) => {
    setInvoiceIndexToDelete(index);
    setShowModal(true);
  };

  const handleDelete = () => {
    setInvoices(invoices.filter((_, i) => i !== invoiceIndexToDelete));
    setShowModal(false);
  };

  const handleInvoiceChange = (index, field, value) => {
    const newInvoices = [...invoices];
    newInvoices[index] = {
      ...newInvoices[index],
      [field]: value,
    };
    setInvoices(newInvoices);
  };

  const handleInvoiceUpload = (index, selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("לא נבחרו קבצים", { className: "sonner-toast error rtl" });
      return;
    }

    const newInvoices = [...invoices];

    if (!newInvoices[index].files) {
      newInvoices[index].files = [];
    }

    newInvoices[index] = {
      ...newInvoices[index],
      files: [...newInvoices[index].files, ...selectedFiles],
    };

    setInvoices(newInvoices);

    toast.success(`${selectedFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
      className: "sonner-toast success rtl",
    });
  };

  const handlePaidChange = (index, e) => {
    const value = e.target.value;
    const newInvoices = [...invoices];
    newInvoices[index] = {
      ...newInvoices[index],
      paid: value,
      paymentDate: value === "לא" ? "" : newInvoices[index].paymentDate,
      paymentMethod: value === "לא" ? "" : newInvoices[index].paymentMethod,
    };
    setInvoices(newInvoices);
  };

  function formatHebrewDate(dateTime) {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    return date.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const validateUniqueInvoiceNumbers = async () => {
    try {
      for (const invoice of invoices) {
        if (!invoice.invoiceNumber || !invoice.invitingName) {
          continue;
        }

        const response = await api.get("/invoices/check/duplicate", {
          params: {
            invoiceNumber: invoice.invoiceNumber,
            supplierId: invoice.supplierId,
          },
        });

        if (response.data.exists) {
          toast.error(
            `לספק "${invoice.invitingName}" כבר קיימת חשבונית עם מספר "${invoice.invoiceNumber}"`,
            { className: "sonner-toast error rtl" }
          );
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Error checking duplicate invoices:", err);
      if (err.response?.data?.message) {
        toast.error(`שגיאה בבדיקה: ${err.response.data.message}`, {
          className: "sonner-toast error rtl",
        });
      } else {
        toast.error("שגיאה בבדיקת כפילות חשבוניות - בדוק את החיבור לשרת", {
          className: "sonner-toast error rtl",
        });
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const invoiceNumber = i + 1;

      if (!invoice.invoiceNumber) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר מספר חשבונית`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      if (!invoice.invitingName) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר שם ספק`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      if (!invoice.supplierId) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: חסר זיהוי ספק (בחר ספק מהרשימה)`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      if (!invoice.createdAt) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר תאריך יצירת החשבונית`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      if (!invoice.sum || invoice.sum <= 0) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: חסר סכום או שהסכום לא תקין`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      if (!invoice.status) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר סטטוס החשבונית`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      if (!invoice.paid) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: לא צוין אם החשבונית שולמה`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      if (
        invoice.paid === "כן" &&
        (!invoice.paymentDate || invoice.paymentDate === "")
      ) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: חשבונית מסומנת כשולמה אך חסר תאריך תשלום`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      if (!invoice.documentType) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר סוג מסמך`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      if (invoice.paid === "כן" && !invoice.paymentMethod) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: סומן כשולם – יש לבחור צורת תשלום`,
          { className: "sonner-toast error rtl" }
        );
        return;
      }
    }

    const isValid = await validateUniqueInvoiceNumbers();
    if (!isValid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const invoiceData = await Promise.all(
        invoices.map(async (invoice) => {
          let uploadedFiles = [];

          if (invoice.files && invoice.files.length > 0) {
            for (const fileData of invoice.files) {
              if (fileData.isLocal && fileData.file) {
                try {
                  const formData = new FormData();
                  formData.append("file", fileData.file);
                  formData.append("folder", fileData.folder || "invoices");

                  const uploadResponse = await api.post(
                    "/upload/cloudinary",
                    formData,
                    {
                      headers: { "Content-Type": "multipart/form-data" },
                    }
                  );

                  uploadedFiles.push({
                    name: fileData.name,
                    url: uploadResponse.data.file.url,
                    type: fileData.type,
                    size: fileData.size,
                    publicId: uploadResponse.data.file.publicId,
                    resourceType: uploadResponse.data.file.resourceType,
                  });
                } catch (uploadError) {
                  console.error("Error uploading file:", uploadError);
                  toast.error(`שגיאה בהעלאת ${fileData.name}`, {
                    className: "sonner-toast error rtl",
                  });
                  throw uploadError;
                }
              } else {
                uploadedFiles.push(fileData);
              }
            }
          }

          return {
            invoiceNumber: invoice.invoiceNumber,
            projectName: selectedProject.name,
            projectId: selectedProject._id,
            sum: Number(invoice.sum),
            status: invoice.status,
            invitingName: invoice.invitingName,
            detail: invoice.detail,
            paid: invoice.paid,
            files: uploadedFiles,
            paymentDate:
              invoice.paid === "כן"
                ? new Date(invoice.paymentDate).toISOString().split("T")[0]
                : "",
            createdAt: invoice.createdAt,
            supplierId: invoice.supplierId,
            documentType: invoice.documentType,
            paymentMethod: invoice.paid === "כן" ? invoice.paymentMethod : "",
          };
        })
      );

      const user = JSON.parse(localStorage.getItem("user"));
      const isAdmin = user?.role === "admin";

      for (const inv of invoiceData) {
        await api.post("/invoices", inv);
      }

      toast.success("החשבונית/ות נוצרו בהצלחה!");
      navigate(`/invoices`);
    } catch (err) {
      console.error("שגיאה במהלך יצירת החשבונית/יות:", err);
      toast.error("שגיאה ביצירת החשבוניות - אנא נסה שוב");
    } finally {
      setIsLoading(false);
    }
  };

  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;
    const isLocal = file?.isLocal || false;

    if (!fileUrl) return null;

    if (isLocal) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">
            📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
          <span className="text-orange-500 text-xs font-bold">
            (יועלה בשמירה)
          </span>
        </div>
      );
    }

    const fileExtension = fileUrl.split(".").pop().toLowerCase();

    if (fileExtension === "xlsx") {
      return (
        <button
          onClick={() => openInExcelViewer(fileUrl)}
          className="text-blue-500 font-bold hover:underline"
        >
          📂 לצפייה בקובץ לחץ כאן
        </button>
      );
    }

    if (fileExtension === "pdf" || fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-bold hover:underline"
        >
          📂 לצפייה בקובץ לחץ כאן
        </a>
      );
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 font-bold hover:underline"
      >
        📂 לצפייה בקובץ לחץ כאן
      </a>
    );
  };

  const handleRemoveFile = async (invoiceIndex, fileIndex) => {
    const fileToDelete = invoices[invoiceIndex].files[fileIndex];

    if (!fileToDelete) {
      toast.error("קובץ לא נמצא");
      return;
    }

    if (fileToDelete.isLocal) {
      const newInvoices = [...invoices];
      newInvoices[invoiceIndex].files.splice(fileIndex, 1);
      setInvoices(newInvoices);

      if (fileToDelete.url) {
        URL.revokeObjectURL(fileToDelete.url);
      }

      toast.success("הקובץ הוסר מהרשימה");
      return;
    }

    try {
      await api.delete(`/invoices/upload/cloudinary`, {
        params: { publicId: fileToDelete.publicId },
      });

      const newInvoices = [...invoices];
      newInvoices[invoiceIndex].files.splice(fileIndex, 1);
      setInvoices(newInvoices);

      toast.success("הקובץ נמחק בהצלחה");
    } catch (error) {
      toast.error("שגיאה במחיקת הקובץ");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <ClipboardList className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    יצירת חשבוניות לפרויקט
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      מערכת ניהול חשבוניות מתקדמת
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Selector */}
              <div className="max-w-md mx-auto mt-6">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  בחר פרויקט
                </label>
                <select
                  value={selectedProject?._id || ""}
                  onChange={handleProjectChange}
                  className="w-full p-4 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                >
                  <option value="">לא נבחר פרוייקט</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Display */}
              {selectedProject && (
                <div className="mt-6 text-center">
                  {selectedProject.remainingBudget < 0 ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-bold text-lg">
                        תקציב שנותר:{" "}
                        {selectedProject.remainingBudget?.toLocaleString()} ₪
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-lg">
                        תקציב שנותר:{" "}
                        {selectedProject.remainingBudget?.toLocaleString()} ₪
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Invoices List */}
        <div className="space-y-6">
          {invoices.map((invoice, index) => (
            <div key={index} className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
                {/* Invoice Header */}
                <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
                  <div className="bg-white/95 backdrop-blur-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                          <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          חשבונית מספר {index + 1}
                        </h3>
                      </div>
                      <button
                        onClick={() => removeInvoice(index)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>מחק</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Invoice Form */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Supplier Selector */}
                    <div className="space-y-2">
                      <SupplierSelector
                        projectId={selectedProject?._id}
                        value={invoice.supplierId}
                        onSelect={(supplier) => {
                          const newInvoices = [...invoices];
                          newInvoices[index] = {
                            ...newInvoices[index],
                            invitingName: supplier?.name || "",
                            supplierId: supplier?._id || "",
                          };
                          setInvoices(newInvoices);
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(
                            "invoiceDraft",
                            JSON.stringify({
                              invoices,
                              selectedProjectId: selectedProject?._id ?? null,
                            })
                          );
                          sessionStorage.setItem(
                            "targetInvoiceIndex",
                            String(index)
                          );
                          navigate(
                            `/create-supplier?returnTo=${encodeURIComponent(
                              "/create-invoice"
                            )}`
                          );
                        }}
                        className="w-full px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:from-slate-200 hover:to-slate-300 transition-all flex items-center justify-center gap-2 border-2 border-slate-300"
                      >
                        <Plus className="w-4 h-4" />
                        <span>צור ספק חדש</span>
                      </button>
                    </div>

                    {/* Invoice Number */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        מספר חשבונית
                      </label>
                      <input
                        type="number"
                        value={invoice.invoiceNumber}
                        onChange={(e) =>
                          handleInvoiceChange(
                            index,
                            "invoiceNumber",
                            e.target.value
                          )
                        }
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      />
                    </div>

                    {/* Sum */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        סכום החשבונית
                      </label>
                      <input
                        type="number"
                        value={invoice.sum}
                        onChange={(e) =>
                          handleInvoiceChange(index, "sum", e.target.value)
                        }
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        min="0"
                        required
                      />
                    </div>

                    {/* Detail */}
                    <div className="md:col-span-2 lg:col-span-3 group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        פירוט חשבונית
                      </label>
                      <textarea
                        value={invoice.detail}
                        onChange={(e) =>
                          handleInvoiceChange(index, "detail", e.target.value)
                        }
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all resize-none group-hover:border-orange-300 min-h-[100px]"
                      />
                    </div>

                    {/* Created At */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        תאריך יצירת החשבונית
                      </label>
                      <DateField
                        type="date"
                        value={invoice.createdAt}
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="yyyy-mm-dd"
                        required
                        onChange={(val) =>
                          handleInvoiceChange(index, "createdAt", val)
                        }
                      />
                    </div>

                    {/* Status */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        סטטוס
                      </label>
                      <select
                        value={invoice.status}
                        onChange={(e) =>
                          handleInvoiceChange(index, "status", e.target.value)
                        }
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      >
                        <option value="לא הוגש">לא הוגש</option>
                        <option value="הוגש">הוגש</option>
                        <option value="בעיבוד">בעיבוד</option>
                      </select>
                    </div>

                    {/* Document Type */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        סוג מסמך
                      </label>
                      <select
                        value={invoice.documentType || ""}
                        onChange={(e) =>
                          handleInvoiceChange(
                            index,
                            "documentType",
                            e.target.value
                          )
                        }
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      >
                        <option value="">בחר סוג מסמך…</option>
                        <option value="ח. עסקה">ח. עסקה</option>
                        <option value="ה. עבודה">ה. עבודה</option>
                        <option value="ד. תשלום">ד. תשלום</option>
                        <option value="חשבונית מס / קבלה">
                          חשבונית מס / קבלה
                        </option>
                      </select>
                    </div>

                    {/* Paid Status */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        האם שולם?
                      </label>
                      <select
                        value={invoice.paid}
                        onChange={(e) => handlePaidChange(index, e)}
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      >
                        <option value="לא">לא</option>
                        <option value="כן">כן</option>
                      </select>
                    </div>

                    {/* Payment Date */}
                    {invoice.paid === "כן" && (
                      <div className="group">
                        <label className="text-sm font-bold text-slate-700 mb-2 block">
                          תאריך תשלום
                        </label>

    <DateField
                        type="date"
                        value={invoice.paymentDate}
                        className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="yyyy-mm-dd"
                        required
                        onChange={(val) =>
                          handleInvoiceChange(index, "paymentDate", val)
                        }
                      />

                   
                      </div>
                    )}

                    {/* Payment Method */}
                    {invoice.paid === "כן" && (
                      <div className="group">
                        <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-500" />
                          צורת תשלום
                        </label>
                        <select
                          value={invoice.paymentMethod || ""}
                          onChange={(e) =>
                            handleInvoiceChange(
                              index,
                              "paymentMethod",
                              e.target.value
                            )
                          }
                          className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white font-medium focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all group-hover:border-emerald-300"
                          required
                        >
                          <option value="">בחר צורת תשלום…</option>
                          {PAYMENT_METHODS.map((pm) => (
                            <option key={pm.value} value={pm.value}>
                              {pm.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* File Uploader */}
                    <div className="lg:col-span-3">
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 hover:border-orange-400 transition-all">
                        <FileUploader
                          onUploadSuccess={(files) =>
                            handleInvoiceUpload(index, files)
                          }
                          folder="invoices"
                          label="העלה קבצי חשבונית"
                        />
                      </div>

                      {/* Display Files */}
                      {invoice.files && invoice.files.length > 0 ? (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {invoice.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3 hover:border-orange-400 hover:shadow-lg transition-all"
                            >
                              <div className="flex items-center gap-3 flex-1 truncate">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                                  <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="truncate">
                                  {renderFile(file)}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleRemoveFile(index, fileIndex)
                                }
                                className="mr-2 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium transition-all"
                              >
                                הסר
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-center py-8 text-slate-400">
                          <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">
                            אין קבצים מצורפים כרגע
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={addInvoice}
            className="group px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3"
            type="button"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>הוסף חשבונית</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedProject || invoices.length === 0}
            className="group px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all flex items-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>יוצר אנא המתן...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>צור חשבונית/ות</span>
              </>
            )}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showModal && (
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
                    שים לב! פעולה זו תמחק את החשבונית לצמיתות.
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
                    onClick={() => setShowModal(false)}
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

export default CreateInvoice;
