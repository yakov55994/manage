// ============================
// CreateInvoice.jsx – MULTI PROJECT INVOICE (FINAL VERSION)
// ============================

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
import FileUploader from "../../Components/FileUploader.jsx";
import { toast } from "sonner";

import {
  Building2,
  Calendar,
  TrendingUp,
  FileText,
  Save,
  Sparkles,
} from "lucide-react";

const CreateInvoice = () => {
  // ============================
  // STATE
  // ============================

  const [projects, setProjects] = useState([]);
  // ✅ טען טיוטה שמורה אם יש
  const loadDraft = () => {
    const saved = localStorage.getItem("invoiceDraft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  };
  const draft = loadDraft();

  const [selectedProjects, setSelectedProjects] = useState(
    draft?.selectedProjects || []
  );
  const [projectSearch, setProjectSearch] = useState("");

  const [form, setForm] = useState(
    draft?.form || {
      invoiceNumber: "",
      supplierId: "",
      invitingName: "",
      documentType: "",
      createdAt: "",
      detail: "",
      paid: "לא",
      paymentDate: "",
      paymentMethod: "",
      files: [],
    }
  );

  const [rows, setRows] = useState(draft?.rows || []);

  // ✅ הוסף את זה אחרי ה-useState של form
  useEffect(() => {
    // שמור את הטופס ב-localStorage כל פעם שמשהו משתנה
    const dataToSave = {
      form,
      selectedProjects,
      rows,
    };
    localStorage.setItem("invoiceDraft", JSON.stringify(dataToSave));
  }, [form, selectedProjects, rows]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const dateInputRef = useRef();

  const navigate = useNavigate();

  // ============================
  // LOAD PROJECTS
  // ============================

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/projects");
        setProjects(res.data.data || []);
      } catch (err) {
        toast.error("שגיאה בטעינת פרויקטים");
      }
    };
    load();
  }, []);

  // ✅ הוסף את זה כאן - בדיקת ספק חדש
  useEffect(() => {
    const checkNewSupplier = async () => {
      const newSupplierId = localStorage.getItem("newSupplierId");

      if (newSupplierId) {
        try {
          // טען את פרטי הספק החדש
          const res = await api.get(`/suppliers/${newSupplierId}`);
          const supplier = res.data.data || res.data;

          // עדכן את הטופס עם הספק החדש
          setForm((prev) => ({
            ...prev,
            supplierId: supplier._id,
          }));

          toast.success(`הספק "${supplier.name}" נבחר אוטומטית!`, {
            className: "sonner-toast success rtl",
          });

          // ✅ נקה את ה-localStorage
          localStorage.removeItem("newSupplierId");
        } catch (err) {
          console.error("שגיאה בטעינת ספק חדש:", err);
          localStorage.removeItem("newSupplierId");
        }
      }
    };

    checkNewSupplier();
  }, []); // רק פעם אחת בטעינה

  // ============================
  // WHEN SELECTED PROJECTS CHANGE → BUILD ROWS
  // ============================

  useEffect(() => {
    const newRows = selectedProjects.map((p) => {
      // ✅ חפש אם יש כבר row עם הסכום שלו
      const existingRow = rows.find((r) => r.projectId === p._id);

      return {
        projectId: p._id,
        projectName: p.name,
        sum: existingRow?.sum || "", // ✅ שמור את הסכום הקיים אם יש
      };
    });

    setRows(newRows);
  }, [selectedProjects]); // ✅ הסר את rows מהתלויות!

  // ============================
  // FILE UPLOAD HANDLER
  // ============================

  const handleFiles = (files) => {
    setForm((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
  };

  // ============================
  // REMOVE FILE
  // ============================

  const removeFile = (index) => {
    const copy = [...form.files];
    copy.splice(index, 1);
    setForm((prev) => ({ ...prev, files: copy }));
  };

  // ============================
  // SUBMIT
  // ============================

  const handleSubmit = async () => {
    if (!form.invoiceNumber) return toast.error("מספר חשבונית חובה");
    if (!form.supplierId) return toast.error("יש לבחור ספק");
    if (!form.documentType) return toast.error("יש לבחור סוג מסמך");
    if (!form.createdAt) return toast.error("יש לבחור תאריך יצירה");
    if (rows.length === 0) return toast.error("בחר לפחות פרויקט אחד");
    if (!form.invitingName.trim()) return toast.error("שם מזמין חובה");

    for (const row of rows) {
      if (!row.sum || Number(row.sum) <= 0) {
        return toast.error(`סכום לא תקין לפרויקט ${row.projectName}`);
      }
    }

    setLoading(true);

    try {
      // ============================
      // UPLOAD ALL FILES
      // ============================
      const uploadedFiles = [];

      for (const file of form.files) {
        if (file.isLocal) {
          const formData = new FormData();
          formData.append("file", file.file);
          formData.append("folder", "invoices");

          const res = await api.post("/upload", formData, {
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

      // ============================
      // PAYLOAD
      // ============================
      const payload = {
        invoiceNumber: form.invoiceNumber,
        supplierId: form.supplierId,
        documentType: form.documentType,
        invitingName: form.invitingName,
        createdAt: form.createdAt,
        detail: form.detail,
        paid: form.paid,
        paymentDate: form.paid === "כן" ? form.paymentDate : "",
        paymentMethod: form.paid === "כן" ? form.paymentMethod : "",
        files: uploadedFiles,

        status: "לא הוגש",

        totalAmount: rows.reduce((acc, r) => acc + Number(r.sum || 0), 0),

        projects: rows.map((r) => ({
          projectId: r.projectId,
          projectName: r.projectName,
          sum: Number(r.sum),
        })),
      };

      console.log("📤 FINAL PAYLOAD:", payload);

      // ============================
      // SEND
      // ============================
      await api.post("/invoices", payload);
      localStorage.removeItem("invoiceDraft");
      toast.success("חשבונית נוצרה בהצלחה!");
      navigate("/invoices");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה ביצירת חשבונית");
    } finally {
      setLoading(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem("invoiceDraft");
    window.location.reload();
  };

  // ============================
  // UI
  // ============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-12">
      <div className="container mx-auto max-w-5xl px-6">
        {/* HEADER */}
        <div className="bg-white/80 rounded-3xl shadow-xl p-8 mb-10">
          <h1 className="text-4xl font-black text-slate-900 text-center mb-2">
            יצירת חשבונית מרובת פרויקטים
          </h1>
          <div className="flex justify-center gap-2 text-slate-600">
            <Sparkles className="w-4 h-4 text-orange-500" />
            מערכת חשבוניות מתקדמת
          </div>
        </div>

        {/* PROJECT SELECTOR */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
          <label className="text-lg font-bold flex items-center gap-2 mb-4">
            <Building2 className="text-orange-600" />
            בחר פרויקטים
          </label>

          {/* Selected Tags */}
          {selectedProjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedProjects.map((p) => (
                <div
                  key={p._id}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl flex items-center gap-2"
                >
                  {p.name}
                  <button
                    onClick={() =>
                      setSelectedProjects((prev) =>
                        prev.filter((x) => x._id !== p._id)
                      )
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <input
            className="w-full p-3 border rounded-xl mb-4"
            placeholder="חפש פרויקט..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
          />

          {/* List */}
          <div className="max-h-72 overflow-y-auto border rounded-xl p-3 space-y-2">
            {projects
              .filter((p) =>
                p.name.toLowerCase().includes(projectSearch.toLowerCase())
              )
              .map((p) => {
                const checked = selectedProjects.some((x) => x._id === p._id);

                return (
                  <label
                    key={p._id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer border ${
                      checked
                        ? "bg-orange-100 border-orange-300"
                        : "bg-white hover:bg-orange-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setSelectedProjects((prev) =>
                            prev.filter((x) => x._id !== p._id)
                          );
                        } else {
                          setSelectedProjects((prev) => [...prev, p]);
                        }
                      }}
                    />
                    <span>{p.name}</span>
                  </label>
                );
              })}
          </div>
        </div>

        {/* GLOBAL FIELDS */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 grid grid-cols-2 gap-6">
          <div>
            <SupplierSelector
              value={form.supplierId}
              onSelect={(s) =>
                setForm((prev) => ({
                  ...prev,
                  supplierId: s._id,
                }))
              }
            />
          </div>

          {/* שם מזמין */}
          <div>
            <label className="block font-bold mb-2">שם מזמין (לקוח)</label>
            <input
              className="w-full p-3 border rounded-xl"
              value={form.invitingName}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  invitingName: e.target.value,
                }))
              }
              placeholder="הזן שם מזמין..."
            />
          </div>

          {/* מספר חשבונית */}
          <div>
            <label>מספר חשבונית</label>
            <input
              className="w-full p-3 border rounded-xl"
              value={form.invoiceNumber}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  invoiceNumber: e.target.value,
                }))
              }
            />
          </div>

          {/* תאריך יצירה */}
          <div
            onClick={() => {
              try {
                dateInputRef.current?.showPicker();
              } catch {
                dateInputRef.current?.focus();
              }
            }}
            className="cursor-pointer"
          >
            <label className="cursor-pointer">תאריך יצירה</label>
            <input
              type="date"
              ref={dateInputRef}
              className="w-full p-3 border rounded-xl cursor-pointer"
              value={form.createdAt}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  createdAt: e.target.value,
                }))
              }
            />
          </div>

          {/* סוג מסמך */}
          <div>
            <label>סוג מסמך</label>
            <select
              className="w-full p-3 border rounded-xl"
              value={form.documentType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  documentType: e.target.value,
                }))
              }
            >
              <option value="">בחר…</option>
              <option value="ח. עסקה">ח. עסקה</option>
              <option value="ה. עבודה">ה. עבודה</option>
              <option value="ד. תשלום">ד. תשלום</option>
              <option value="חשבונית מס / קבלה">חשבונית מס / קבלה</option>
            </select>
          </div>

          {/* ✅ סטטוס תשלום */}
          <div>
            <label>סטטוס תשלום</label>
            <select
              className="w-full p-3 border rounded-xl"
              value={form.paid}
              onChange={(e) => {
                const value = e.target.value;

                if (value === "לא") {
                  // אם בחרו "לא" - אפס את פרטי התשלום
                  setForm((prev) => ({
                    ...prev,
                    paid: "לא",
                    paymentDate: "",
                    paymentMethod: "",
                  }));
                } else {
                  // אם בחרו "כן" - רק עדכן את paid
                  setForm((prev) => ({
                    ...prev,
                    paid: "כן",
                  }));
                }
              }}
            >
              <option value="לא">לא שולם</option>
              <option value="כן">שולם</option>
            </select>
          </div>

          {/* ✅ תאריך תשלום - מופיע רק אם שולם */}
          {form.paid === "כן" && (
            <div>
              <label className="block font-bold mb-2">תאריך תשלום</label>
              <input
                type="date"
                className="w-full p-3 border rounded-xl cursor-pointer"
                value={form.paymentDate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentDate: e.target.value,
                  }))
                }
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch {
                    e.target.focus();
                  }
                }}
              />
            </div>
          )}

          {/* ✅ אמצעי תשלום - מופיע רק אם שולם */}
          {form.paid === "כן" && (
            <div>
              <label>אמצעי תשלום</label>
              <select
                className="w-full p-3 border rounded-xl"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
              >
                <option value="">בחר אמצעי תשלום...</option>
                <option value="bank_transfer">העברה בנקאית</option>
                <option value="check">צ'ק</option>
              </select>
            </div>
          )}

          {/* פירוט */}
          <div className="col-span-2">
            <label>פירוט</label>
            <textarea
              className="w-full p-3 border rounded-xl"
              value={form.detail}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  detail: e.target.value,
                }))
              }
            ></textarea>
          </div>
        </div>

        {/* sumS PER PROJECT */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">סכומים לפי פרויקט</h2>

          {rows.map((row, index) => (
            <div
              key={row.projectId}
              className="border rounded-xl p-4 mb-3 bg-white"
            >
              <div className="font-bold mb-2">{row.projectName}</div>

              <input
                type="number"
                placeholder="סכום"
                className="border p-2 rounded-xl w-40"
                value={row.sum}
                onChange={(e) => {
                  const copy = [...rows];
                  copy[index].sum = e.target.value;
                  setRows(copy);
                }}
              />
            </div>
          ))}
        </div>

        {/* FILE UPLOAD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <FileText className="text-orange-600" /> קבצים לחשבונית
          </h2>

          <FileUploader onUploadSuccess={handleFiles} folder="invoices" />

          {form.files.length > 0 && (
            <div className="mt-4 space-y-2">
              {form.files.map((file, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-2"
                >
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-red-600"
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {/* SUBMIT */}
          <button
            className="w-44 p-4 rounded-xl bg-orange-600 text-white font-bold shadow-xl ml-5"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "שומר..." : "צור חשבונית"}
          </button>

          <button
            className="w-44 p-4 rounded-xl bg-orange-600 text-white font-bold shadow-xl "
            disabled={loading}
            onClick={clearDraft}
          >
            נקה הכל
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
