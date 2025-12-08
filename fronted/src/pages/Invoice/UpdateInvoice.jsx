// ===============================================
//  INVOICE EDIT PAGE — MULTI PROJECT VERSION
// ===============================================

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";

import FileUploader from "../../Components/FileUploader";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
import DateField from "../../Components/DateField.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

import { ClipboardList, Building2 } from "lucide-react";

// ===============================================
// MAIN COMPONENT
// ===============================================
const InvoiceEditPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);

  const [projectSearch, setProjectSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [globalFields, setGlobalFields] = useState({
    invoiceNumber: "",
    invitingName: "",
    supplierId: "",
    documentType: "",
    createdAt: "",
    detail: "",
    paid: "לא",
    paymentDate: "",
    paymentMethod: "",
    checkNumber: "", // ✅ הוסף
    checkDate: "",
    files: [],
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const { canViewInvoices, isAdmin } = useAuth();

  // -----------------------------------------------
  // CHECK PERMISSIONS
  // -----------------------------------------------
  useEffect(() => {
    if (!canViewInvoices) navigate("/no-access");
  }, [canViewInvoices]);

  // -----------------------------------------------
  // LOAD ALL PROJECTS
  // -----------------------------------------------
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data?.data || []);
      } catch {
        toast.error("שגיאה בטעינת פרויקטים");
      }
    };
    loadProjects();
  }, []);

  // -----------------------------------------------
  // LOAD INVOICE
  // -----------------------------------------------
  useEffect(() => {
    if (!projects.length) return;
    fetchInvoice();
  }, [projects]);

  const fetchInvoice = async () => {
    setLoading(true);

    try {
      const { data } = await api.get(`/invoices/${id}`);
      const invoice = data.data;
      // -------- MAIN INVOICE FILES ----------
      const invoiceFiles = await ensureFilesHydrated(invoice.files || []);
      setGlobalFields((prev) => ({
        ...prev,
        files: invoiceFiles,
      }));

      if (!invoice) return;

      // -------- GLOBAL FIELDS ----------
      setGlobalFields((prev) => ({
        ...prev,
        invoiceNumber: invoice.invoiceNumber || "",
        invitingName: invoice.invitingName || "",
        supplierId: invoice.supplierId?._id || invoice.supplierId || "",
        documentType: invoice.documentType || "",
        createdAt: invoice.createdAt
          ? invoice.createdAt.split("T")[0]
          : new Date().toISOString().split("T")[0],
        detail: invoice.detail || "",
        paid: invoice.paid || "לא",
        paymentDate: invoice.paymentDate
          ? invoice.paymentDate.split("T")[0]
          : "",
        paymentMethod: invoice.paymentMethod || "",
        checkNumber: invoice.checkNumber || "", // ✅ הוסף
        checkDate: invoice.checkDate // ✅ הוסף
          ? invoice.checkDate.split("T")[0]
          : "",
      }));

      // -------- SELECTED PROJECTS ----------
      const selected = invoice.projects.map((p) => ({
        _id: p.projectId._id || p.projectId,
        name: p.projectId.name,
      }));
      setSelectedProjects(selected);

      // -------- ROWS ----------
      const builtRows = await Promise.all(
        invoice.projects.map(async (p) => {
          const hydratedFiles = await ensureFilesHydrated(p.files || []);

          return {
            projectId: p.projectId._id || p.projectId,
            projectName: p.projectId.name,
            sum: p.sum,
            files: hydratedFiles,
          };
        })
      );

      setRows(builtRows);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינת החשבונית");
    } finally {
      setLoading(false);
    }
  };

  // ===============================================================
  // CLEAN FILES FROM CLOUDINARY OR LOCAL OBJECTS
  // ===============================================================
  const ensureFilesHydrated = async (arr) => {
    const out = [];

    for (let file of arr) {
      out.push({
        ...file,
        url: file.url || file.fileUrl || file.secure_url,
        name: file.name || file.originalName || file.filename || "קובץ",
      });
    }

    return out;
  };

  // ===============================================================
  // SELECT / UNSELECT PROJECTS
  // ===============================================================
  const toggleProject = (p) => {
    const exists = selectedProjects.some((x) => x._id === p._id);

    let next;

    if (exists) {
      next = selectedProjects.filter((x) => x._id !== p._id);
    } else {
      next = [...selectedProjects, p];
    }

    setSelectedProjects(next);

    // UPDATE rows accordingly
    setRows((prev) => {
      let updated = [...prev];

      // add missing row
      if (!exists) {
        updated.push({
          projectId: p._id,
          projectName: p.name,
          sum: "",
          files: [],
        });
      } else {
        updated = updated.filter((r) => r.projectId !== p._id);
      }

      return updated;
    });
  };

  // ===============================================================
  // GLOBAL FIELDS CHANGE
  // ===============================================================
  const updateGlobal = (field, value) => {
    setGlobalFields({ ...globalFields, [field]: value });
  };

  // ===============================================================
  // DELETE FILE
  // ===============================================================
  const deleteFile = async (rowIndex, fileIndex) => {
    const file = rows[rowIndex].files[fileIndex];

    // remove from UI
    const clone = [...rows];
    clone[rowIndex].files.splice(fileIndex, 1);
    setRows(clone);

    if (!file.publicId) return; // local only

    try {
      await api.delete("/upload/delete-cloudinary", {
        data: {
          publicId: file.publicId,
          resourceType: file.resourceType || "raw",
        },
      });

      toast.success("הקובץ נמחק");
    } catch {
      toast.error("שגיאה במחיקת קובץ");
    }
  };

  // ===============================================================
  // SAVE INVOICE — PUT /invoices/:id
  // ===============================================================
  const saveInvoice = async () => {
    if (!globalFields.invoiceNumber) return toast.error("חסר מספר חשבונית");
    if (!globalFields.supplierId) return toast.error("יש לבחור ספק");
    if (!globalFields.documentType) return toast.error("יש לבחור סוג מסמך");
    if (!rows.length) return toast.error("בחר לפחות פרויקט אחד");

    if (
      globalFields.paid === "כן" &&
      globalFields.paymentMethod === "check" &&
      !globalFields.checkNumber
    ) {
      return toast.error("יש למלא מספר צ'ק");
    }
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].sum || rows[i].sum <= 0) {
        return toast.error(`סכום לא תקין בשורה ${i + 1}`);
      }
    }

    setSaving(true);

    try {
      const finalProjects = await Promise.all(
        rows.map(async (r) => {
          const uploadedFiles = [];

          for (const file of r.files) {
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

          return {
            projectId: r.projectId,
            sum: Number(r.sum),
            files: uploadedFiles,
          };
        })
      );

      const payload = {
        ...globalFields,
        paymentMethod:
          globalFields.paid === "כן" ? globalFields.paymentMethod : "",
        paymentDate: globalFields.paid === "כן" ? globalFields.paymentDate : "",
        checkNumber:
          globalFields.paid === "כן" && globalFields.paymentMethod === "check"
            ? globalFields.checkNumber
            : null, // ✅ הוסף
        checkDate:
          globalFields.paid === "כן" && globalFields.paymentMethod === "check"
            ? globalFields.checkDate
            : null, // ✅ הוסף
        projects: finalProjects,
      };

      await api.put(`/invoices/${id}`, payload);

      toast.success("החשבונית נשמרה בהצלחה!");
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || err?.response?.data?.error || "שגיאה"
      );
    } finally {
      setSaving(false);
    }
  };

  // ===============================================================
  // RENDER
  // ===============================================================

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center">
        <ClipLoader size={90} color="#f97316" />
      </div>
    );

  return (
    <div className="min-h-screen bg-orange-50 py-10">
      <div className="container max-w-5xl mx-auto">
        {/* TITLE */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <ClipboardList className="w-10 h-10 text-orange-600" />
          <h1 className="text-4xl font-black">עריכת חשבונית</h1>
        </div>

        {/* PROJECT SELECTION */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-10">
          <label className="font-bold text-lg flex items-center gap-2 mb-4">
            <Building2 className="text-orange-600" />
            שיוך חשבונית לפרויקטים
          </label>

          {/* SEARCH */}
          <input
            type="text"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="חיפוש..."
            className="w-full p-3 border rounded-xl mb-4"
          />

          {/* LIST */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {projects
              .filter((p) =>
                p.name.toLowerCase().includes(projectSearch.toLowerCase())
              )
              .map((p) => {
                const isSelected = selectedProjects.some(
                  (s) => s._id === p._id
                );

                return (
                  <div
                    key={p._id}
                    className={`p-3 border rounded-xl cursor-pointer ${
                      isSelected
                        ? "bg-orange-100 border-orange-300"
                        : "hover:bg-orange-50"
                    }`}
                    onClick={() => toggleProject(p)}
                  >
                    {p.name}
                  </div>
                );
              })}
          </div>
        </div>

        {/* GLOBAL FIELDS */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SupplierSelector
            value={globalFields.supplierId}
            onSelect={(s) => updateGlobal("supplierId", s._id)}
          />

          <div>
            <label className="font-bold block mb-1">מספר חשבונית</label>
            <input
              type="text"
              value={globalFields.invoiceNumber}
              onChange={(e) => updateGlobal("invoiceNumber", e.target.value)}
              className="w-full p-3 border rounded-xl"
            />
          </div>

          <DateField
            type="date"
            label="תאריך יצירה"
            value={globalFields.createdAt}
            onChange={(v) => updateGlobal("createdAt", v)}
          />

          <div>
            <label className="font-bold mb-1 block">סוג מסמך</label>
            <select
              value={globalFields.documentType}
              onChange={(e) => updateGlobal("documentType", e.target.value)}
              className="w-full p-3 border rounded-xl"
            >
              <option value="">בחר...</option>
              <option value="ח. עסקה">ח. עסקה</option>
              <option value="ה. עבודה">ה. עבודה</option>
              <option value="ד. תשלום">ד. תשלום</option>
              <option value="חשבונית מס / קבלה">חשבונית מס / קבלה</option>
            </select>
          </div>

          {isAdmin && (
            <>
              <div>
                <label className="font-bold mb-1 block">סטטוס תשלום</label>
                <select
                  value={globalFields.paid}
                  onChange={(e) => {
                    updateGlobal("paid", e.target.value);
                    if (e.target.value === "לא") {
                      updateGlobal("paymentDate", "");
                      updateGlobal("paymentMethod", "");
                    }
                  }}
                  className="w-full p-3 border rounded-xl"
                >
                  <option value="לא">לא</option>
                  <option value="כן">כן</option>
                </select>
              </div>

              {globalFields.paid === "כן" && (
                <>
                  <DateField
                    type="date"
                    label="תאריך תשלום"
                    value={globalFields.paymentDate}
                    onChange={(v) => updateGlobal("paymentDate", v)}
                  />

                  <div>
                    <label className="font-bold mb-1 block">צורת תשלום</label>
                    <select
                      value={globalFields.paymentMethod}
                      onChange={(e) => {
                        const method = e.target.value;
                        updateGlobal("paymentMethod", method);

                        // ✅ אם לא בחרו צ'ק - נקה את שדות הצ'ק
                        if (method !== "check") {
                          updateGlobal("checkNumber", "");
                          updateGlobal("checkDate", "");
                        }
                      }}
                      className="w-full p-3 border rounded-xl"
                    >
                      <option value="">בחר...</option>
                      <option value="bank_transfer">העברה בנקאית</option>
                      <option value="check">צ'ק</option>
                    </select>
                  </div>

                  {/* ✅ שדות צ'ק - מופיעים רק אם בחרו צ'ק */}
                  {globalFields.paymentMethod === "check" && (
                    <>
                      <div>
                        <label className="font-bold mb-1 block">
                          מספר צ'ק <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={globalFields.checkNumber}
                          onChange={(e) =>
                            updateGlobal("checkNumber", e.target.value)
                          }
                          placeholder="הזן מספר צ'ק"
                          className="w-full p-3 border rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="font-bold mb-1 block">
                          תאריך פירעון צ'ק (אופציונלי)
                        </label>
                        <DateField
                          type="date"
                          value={globalFields.checkDate}
                          onChange={(v) => updateGlobal("checkDate", v)}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="md:col-span-2">
            <label className="font-bold mb-1 block">פירוט</label>
            <textarea
              value={globalFields.detail}
              onChange={(e) => updateGlobal("detail", e.target.value)}
              className="w-full p-3 border rounded-xl min-h-[100px]"
            />
          </div>

          <div className="bg-white shadow-xl p-6 mb-10">
            <FileUploader
              folder="invoices"
              onUploadSuccess={(files) =>
                setGlobalFields((prev) => ({
                  ...prev,
                  files: [...prev.files, ...files],
                }))
              }
            />

            {globalFields.files?.length > 0 &&
              globalFields.files.map((file, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center mt-2 p-2 bg-white border rounded-xl"
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate"
                  >
                    {file.name}
                  </a>
                  <button
                    className="text-red-600"
                    onClick={() => {
                      const copy = [...globalFields.files];
                      copy.splice(index, 1);
                      setGlobalFields((prev) => ({ ...prev, files: copy }));
                    }}
                  >
                    הסר
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* ROWS PER PROJECT */}
        <div className="space-y-6">
          {rows.map((row, index) => (
            <div key={index} className="bg-white rounded-3xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-3">
                פרויקט: {row.projectName}
              </h3>

              <label className="font-bold mb-1 block">סכום</label>
              <input
                type="number"
                value={row.sum}
                onChange={(e) => {
                  const clone = [...rows];
                  clone[index].sum = e.target.value;
                  setRows(clone);
                }}
                className="w-full p-3 border rounded-xl mb-4"
              />

              <FileUploader
                folder="invoices"
                onUploadSuccess={(files) => {
                  const copy = [...rows];
                  copy[index].files.push(...files);
                  setRows(copy);
                }}
              />

              {row.files.map((file, i2) => (
                <div
                  key={i2}
                  className="flex justify-between items-center mt-2 p-2 bg-white border rounded-xl"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    onClick={() => deleteFile(index, i2)}
                    className="text-red-600"
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* SAVE BUTTON */}
        <div className="mt-10 text-center">
          <button
            onClick={saveInvoice}
            disabled={saving}
            className="px-10 py-3 bg-orange-600 text-white font-bold text-lg rounded-xl shadow-xl hover:bg-orange-700"
          >
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditPage;
