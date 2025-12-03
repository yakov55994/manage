// ============================
// CreateInvoice.jsx – MULTI PROJECT VERSION
// ============================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import FileUploader from "../../Components/FileUploader";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
import DateField from "../../Components/DateField.jsx";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  FileText,
  ClipboardList,
  Calendar,
  TrendingUp,
  Building2,
  Plus,
  Trash2,
  Upload,
  Save,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "check", label: "צ׳ק" },
];

const CreateInvoice = () => {
  // ============================
  // STATE
  // ============================

  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]); // ⬅ MULTI SELECT

  const [common, setCommon] = useState({
    invoiceNumber: "",
    invitingName: "",
    supplierId: "",
    documentType: "",
    createdAt: "",
    detail: "",
    paid: "לא",
    paymentDate: "",
    paymentMethod: "",
  });

  const [invoices, setInvoices] = useState([]); // each project gets its own row
  const [isLoading, setIsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  const navigate = useNavigate();
  const { user } = useAuth();

  // ============================
  // LOAD PROJECTS
  // ============================

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/projects");
        const data = res.data?.data || [];
        setProjects(data);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת פרויקטים");
      }
    };

    load();
  }, []);

  // ============================
  // WHEN SELECTED PROJECTS CHANGE → CREATE DEDICATED INVOICE ROW
  // ============================

  useEffect(() => {
    if (!selectedProjects.length) {
      setInvoices([]);
      return;
    }

    const rows = selectedProjects.map((p) => ({
      projectId: p._id,
      projectName: p.name,
      sum: "",
      files: [],
    }));

    setInvoices(rows);
  }, [selectedProjects]);

  // ============================
  // MULTISELECT PROJECT UI
  // ============================

  const toggleProject = (project) => {
    const exists = selectedProjects.find((p) => p._id === project._id);
    if (exists) {
      setSelectedProjects(
        selectedProjects.filter((p) => p._id !== project._id)
      );
    } else {
      setSelectedProjects([...selectedProjects, project]);
    }
  };

  // ============================
  // SUBMIT
  // ============================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!common.invoiceNumber) return toast.error("חסר מספר חשבונית");

    if (!common.supplierId) return toast.error("יש לבחור ספק");

    if (!common.documentType) return toast.error("יש לבחור סוג מסמך");

    if (!common.createdAt) return toast.error("יש לבחור תאריך יצירה");

    if (!invoices.length) return toast.error("יש לבחור לפחות פרויקט אחד");

    for (let i = 0; i < invoices.length; i++) {
      if (!invoices[i].sum || invoices[i].sum <= 0)
        return toast.error(`סכום לא תקין בשורה ${i + 1}`);
    }

    setIsLoading(true);

    try {
      const finalInvoices = await Promise.all(
        invoices.map(async (inv) => {
          let uploadedFiles = [];

          if (inv.files && inv.files.length > 0) {
            for (const file of inv.files) {
              if (file.isLocal && file.file) {
                const form = new FormData();
                form.append("file", file.file);
                form.append("folder", "invoices");

                const res = await api.post("/upload", form, {
                  headers: { "Content-Type": "multipart/form-data" },
                });

                uploadedFiles.push({
                  name: file.name,
                  url: res.data.file.url,
                  type: file.type,
                  size: file.size,
                  publicId: res.data.file.publicId,
                  resourceType: res.data.file.resourceType,
                });
              } else {
                uploadedFiles.push(file);
              }
            }
          }

          return {
            invoiceNumber: common.invoiceNumber,
            projectId: inv.projectId,
            projectName: inv.projectName,
            invitingName: common.invitingName,
            supplierId: common.supplierId,
            documentType: common.documentType,
            createdAt: common.createdAt,
            detail: common.detail,
            sum: Number(inv.sum),
            paid: common.paid,
            paymentMethod: common.paid === "כן" ? common.paymentMethod : "",
            paymentDate: common.paid === "כן" ? common.paymentDate : "",
            status: "לא הוגש",
            files: uploadedFiles,
          };
        })
      );

      for (const inv of finalInvoices) {
        await api.post("/invoices", inv);
      }

      toast.success("החשבוניות נוצרו בהצלחה!");
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה ביצירת חשבוניות");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-12 relative">
      {/* HEADER */}
      <div className="container mx-auto max-w-7xl px-4">
        <div className="relative mb-10">
          <div className="absolute -inset-x-6 -inset-y-2 bg-gradient-to-r from-orange-500 to-yellow-500 opacity-10 rounded-3xl blur-xl"></div>

          <div className="relative bg-white/80 rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black text-slate-900">
                יצירת חשבוניות לפרויקטים מרובים
              </h1>
            </div>

            {/* MULTI PROJECT SELECT */}
            <div className="mt-6 max-w-2xl mx-auto">
              <label className="text-base font-bold flex items-center gap-3 mb-4 text-slate-800">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                בחר פרויקטים
              </label>

              <div className="relative bg-gradient-to-br from-white to-orange-50/30 border-2 border-orange-200 rounded-2xl shadow-lg overflow-hidden">
                {/* Selected Projects Tags */}
                {selectedProjects.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-100">
                    <div className="flex flex-wrap gap-2">
                      {selectedProjects.map((p) => (
                        <div
                          key={p._id}
                          className="group px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center gap-2 font-bold text-white shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                          <span className="text-sm">{p.name}</span>
                          <button
                            onClick={() => toggleProject(p)}
                            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200 group-hover:rotate-90"
                          >
                            <span className="text-white text-xs font-bold">
                              ✕
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Box */}
                <div className="p-4 border-b-2 border-orange-100 bg-white/50">
                  <div className="relative">
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="חפש פרויקט..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {projectSearch && (
                      <button
                        onClick={() => setProjectSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Projects List */}
                <div className="p-5 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {projects
                      .filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes(projectSearch.toLowerCase())
                      )
                      .map((p) => {
                        const isSelected = selectedProjects.some(
                          (s) => s._id === p._id
                        );
                        return (
                          <label
                            key={p._id}
                            className={`
                  flex items-center gap-3 p-3 rounded-xl cursor-pointer
                  transition-all duration-200 hover:scale-[1.02]
                  ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300 shadow-md"
                      : "bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-200"
                  }
                `}
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleProject(p)}
                                className="w-5 h-5 rounded-md border-2 border-orange-300 text-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 cursor-pointer"
                              />
                            </div>
                            <span
                              className={`flex-1 font-medium transition-colors ${
                                isSelected
                                  ? "text-orange-900"
                                  : "text-slate-700"
                              }`}
                            >
                              {p.name}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse"></div>
                            )}
                          </label>
                        );
                      })}

                    {/* No Results Message */}
                    {projectSearch &&
                      projects.filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes(projectSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">
                            לא נמצאו פרויקטים התואמים "{projectSearch}"
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Empty State */}
                {projects.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>אין פרויקטים זמינים</p>
                  </div>
                )}
              </div>

              {/* Counter */}
              {selectedProjects.length > 0 && (
                <div className="mt-3 text-center">
                  <span className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                    נבחרו {selectedProjects.length} פרויקטים
                  </span>
                </div>
              )}
            </div>

            {/* GLOBAL FIELDS */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Supplier */}
              <div>
                <label className="font-bold text-sm mb-2 block">ספק</label>
                <SupplierSelector
                  projectId={null}
                  value={common.supplierId}
                  onSelect={(supplier) =>
                    setCommon({
                      ...common,
                      supplierId: supplier._id,
                      invitingName: supplier.name,
                    })
                  }
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="font-bold text-sm mb-2 block">
                  מספר חשבונית
                </label>
                <input
                  type="number"
                  value={common.invoiceNumber}
                  onChange={(e) =>
                    setCommon({ ...common, invoiceNumber: e.target.value })
                  }
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>

              {/* Document Type */}
              <div>
                <label className="font-bold text-sm mb-2 block">סוג מסמך</label>
                <select
                  value={common.documentType}
                  onChange={(e) =>
                    setCommon({ ...common, documentType: e.target.value })
                  }
                  className="w-full p-3 border-2 rounded-xl"
                >
                  <option value="">בחר סוג מסמך…</option>
                  <option value="ח. עסקה">ח. עסקה</option>
                  <option value="ה. עבודה">ה. עבודה</option>
                  <option value="ד. תשלום">ד. תשלום</option>
                  <option value="חשבונית מס / קבלה">חשבונית מס / קבלה</option>
                </select>
              </div>

              {/* Created At */}
              <div>
                <label className="font-bold text-sm mb-2 block">
                  תאריך יצירה
                </label>
                <DateField
                  type="date"
                  value={common.createdAt}
                  onChange={(val) => setCommon({ ...common, createdAt: val })}
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>

              {/* Detail */}
              <div className="md:col-span-2">
                <label className="font-bold text-sm mb-2 block">
                  פירוט חשבונית
                </label>
                <textarea
                  value={common.detail}
                  onChange={(e) =>
                    setCommon({ ...common, detail: e.target.value })
                  }
                  className="w-full p-3 border-2 rounded-xl min-h-[120px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PER PROJECT ROWS */}
        <div className="mt-6 space-y-6">
          {invoices.map((inv, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl shadow-xl p-6 border border-orange-100"
            >
              <h3 className="text-2xl font-bold mb-4">
                פרויקט: {inv.projectName}
              </h3>

              {/* Sum */}
              <div className="mb-4">
                <label className="font-bold text-sm mb-2 block">
                  סכום לפרויקט זה
                </label>
                <input
                  type="number"
                  value={inv.sum}
                  onChange={(e) => {
                    const copy = [...invoices];
                    copy[index].sum = e.target.value;
                    setInvoices(copy);
                  }}
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>

              {/* Files */}
              <div>
                <FileUploader
                  onUploadSuccess={(files) => {
                    const copy = [...invoices];
                    copy[index].files.push(...files);
                    setInvoices(copy);
                  }}
                  folder="invoices"
                />

                {inv.files.length > 0 && (
                  <div className="mt-3">
                    {inv.files.map((file, i2) => (
                      <div
                        key={i2}
                        className="flex justify-between items-center p-2 border rounded mb-2"
                      >
                        <span className="truncate">{file.name}</span>

                        <button
                          onClick={() => {
                            const copy = [...invoices];
                            copy[index].files.splice(i2, 1);
                            setInvoices(copy);
                          }}
                          className="text-red-600"
                        >
                          הסר
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* SUBMIT */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedProjects.length}
            className="px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-yellow-600 shadow-xl"
          >
            {isLoading ? "שומר..." : "צור חשבוניות"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
