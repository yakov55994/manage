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
  const milgaProject = projects.find((p) => p.name === "מילגה");
  const MILGA_ID = milgaProject?._id;

  const salaryProject = projects.find((p) => p.name === "משכורות");
  const SALARY_ID = salaryProject?._id;

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
      checkNumber: "",
      checkDate: "",
      files: [],
    }
  );

  const [rows, setRows] = useState(draft?.rows || []);
  const [fundedFromProjectId, setFundedFromProjectId] = useState("");

  // ✅ הוסף את זה אחרי ה-useState של form
  useEffect(() => {
    const dataToSave = {
      form,
      selectedProjects,
      rows,
      fundedFromProjectId, // ← הוספנו
    };
    localStorage.setItem("invoiceDraft", JSON.stringify(dataToSave));
  }, [form, selectedProjects, rows, fundedFromProjectId]);

  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // ========== SALARY MODE ==========
  const [isSalary, setIsSalary] = useState(false);

  const [salaryEmployeeName, setSalaryEmployeeName] = useState("");
  const [salaryBaseAmount, setSalaryBaseAmount] = useState("");
  const [salaryOverheadPercent, setSalaryOverheadPercent] = useState("");

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
    if (!isSalary && !form.supplierId) return toast.error("יש לבחור ספק");
    if (!isSalary && rows.length === 0)
      return toast.error("בחר לפחות פרויקט אחד");
    // if (!form.createdAt) return toast.error("יש לבחור תאריך יצירה");
    if (!isSalary && rows.length === 0)
      return toast.error("בחר לפחות פרויקט אחד");

    if (
      form.paid === "כן" &&
      form.paymentMethod === "check" &&
      !form.checkNumber
    ) {
      return toast.error("יש למלא מספר צ'ק");
    }
    if (isSalary && !fundedFromProjectId) {
      return toast.error("יש לבחור פרויקט ממנו יורד התקציב למשכורות");
    }

    if (!isSalary) {
      if (rows.length === 0) return toast.error("בחר לפחות פרויקט אחד");
      for (const row of rows) {
        if (!row.sum || Number(row.sum) <= 0) {
          return toast.error(`סכום לא תקין לפרויקט ${row.projectName}`);
        }
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

      if (isSalary) {
        setForm((prev) => ({
          ...prev,
          documentType: "משכורות",
        }));
      }

      // ============================
      // PAYLOAD
      // ============================
      const payload = {
        invoiceNumber: form.invoiceNumber,
        supplierId: form.supplierId,
        documentType: isSalary ? "משכורות" : form.documentType,
        type: isSalary ? "salary" : "invoice",

        invitingName: form.invitingName,
        createdAt: form.createdAt,
        detail: form.detail,

        paid: form.paid,
        paymentDate: form.paid === "כן" ? form.paymentDate : "",
        paymentMethod: form.paid === "כן" ? form.paymentMethod : "",
        checkNumber:
          form.paid === "כן" && form.paymentMethod === "check"
            ? form.checkNumber
            : null,
        checkDate:
          form.paid === "כן" && form.paymentMethod === "check"
            ? form.checkDate
            : null,

        files: uploadedFiles,
        status: "לא הוגש",

        fundedFromProjectId: fundedFromProjectId || null,
      };

      console.log("PAYLOAD SENT:", payload);

      if (isSalary) {
        const base = Number(salaryBaseAmount || 0);
        const overhead = Number(salaryOverheadPercent || 0);
        const final = base * (1 + overhead / 100);

        payload.salaryEmployeeName = salaryEmployeeName;
        payload.salaryBaseAmount = base;
        payload.salaryOverheadPercent = overhead;
        payload.salaryFinalAmount = final;

        payload.totalAmount = final;

        payload.projects = [
          {
            projectId: fundedFromProjectId,
            projectName: projects.find((p) => p._id === fundedFromProjectId)
              ?.name,
            sum: final,
          },
        ];
      } else {
        payload.totalAmount = rows.reduce(
          (acc, r) => acc + Number(r.sum || 0),
          0
        );

        payload.projects = rows.map((r) => ({
          projectId: r.projectId,
          projectName: r.projectName,
          sum: Number(r.sum),
        }));
      }

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
        {!isSalary && (
          <>
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
                    const checked = selectedProjects.some(
                      (x) => x._id === p._id
                    );

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
                              // הסרת פרויקט
                              const updated = selectedProjects.filter(
                                (x) => x._id !== p._id
                              );
                              setSelectedProjects(updated);

                              // אם הורדנו משכורות - החזר למצב רגיל
                              if (p.name === "משכורות") {
                                setIsSalary(false);
                                setForm((prev) => ({
                                  ...prev,
                                  documentType: "",
                                }));
                              }
                            } else {
                              // הוספת פרויקט
                              const updated = [...selectedProjects, p];
                              setSelectedProjects(updated);

                              // אם הוספנו פרויקט משכורות → להדליק מצב משכורת אוטומטי
                              if (p.name === "משכורות") {
                                setIsSalary(true);
                                setForm((prev) => ({
                                  ...prev,
                                  documentType: "משכורות",
                                }));
                              }
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
              </div>
              {/* בחירת פרויקט מממן — רק אם נבחר פרויקט "מילגה" */}
              {selectedProjects.some((p) => p._id === MILGA_ID) && (
                <div className="mt-4">
                  <label className="block font-semibold text-slate-700 mb-2">
                    מאיזה פרויקט יורד התקציב?
                  </label>

                  <select
                    className="w-full p-3 border-2 rounded-xl bg-white focus:border-orange-500 outline-none"
                    value={fundedFromProjectId}
                    onChange={(e) => setFundedFromProjectId(e.target.value)}
                  >
                    <option value="">בחר פרויקט מממן</option>

                    {projects
                      .filter((p) => p._id !== MILGA_ID) // לא להציג את מילגה
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}
        {isSalary && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
            <label className="text-lg font-bold mb-4 block">
              פרויקט ממנו יורד התקציב (משכורות)
            </label>

            <div className="space-y-2 border rounded-xl p-3 max-h-72 overflow-y-auto">
              {projects.map((p) => {
                const checked = fundedFromProjectId === p._id;

                return (
                  <label
                    key={p._id}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer border
          ${
            checked
              ? "bg-orange-100 border-orange-300"
              : "bg-white hover:bg-orange-50"
          }
        `}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setFundedFromProjectId(p._id)}
                      className="w-4 h-4"
                    />
                    <span>{p.name}</span>
                  </label>
                );
              })}
            </div>

            {/* שדה שם עובד */}
            <div className="mt-4">
              <label className="font-bold">שם מקבל השכר</label>
              <input
                className="w-full p-3 border rounded-xl"
                value={salaryEmployeeName}
                onChange={(e) => setSalaryEmployeeName(e.target.value)}
                placeholder="לדוגמה: משה לוי"
              />
            </div>

            {/* סכום בסיס */}
            <div className="mt-4">
              <label className="font-bold">סכום בסיס</label>
              <input
                className="w-full p-3 border rounded-xl"
                type="number"
                value={salaryBaseAmount}
                onChange={(e) => setSalaryBaseAmount(e.target.value)}
              />
            </div>

            {/* תקורה */}
            <div className="mt-4">
              <label className="font-bold">תקורה (אחוזים)</label>
              <div className="flex gap-2">
                <select
                  className="w-1/2 p-3 border rounded-xl"
                  value={salaryOverheadPercent}
                  onChange={(e) => setSalaryOverheadPercent(e.target.value)}
                >
                  <option value="">בחר מרשימה...</option>
                  <option value="10">10%</option>
                  <option value="12">12%</option>
                  <option value="15">15%</option>
                  <option value="17">17%</option>
                  <option value="20">20%</option>
                </select>
                <input
                  type="number"
                  className="w-1/2 p-3 border rounded-xl"
                  placeholder="או הזן אחוז מותאם אישית..."
                  value={salaryOverheadPercent}
                  onChange={(e) => setSalaryOverheadPercent(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                ניתן לבחור מהרשימה או להזין אחוז מדויק בשדה
              </p>
            </div>

            {/* סכום סופי */}
            <div className="mt-4 font-bold text-lg">
              סכום סופי למשכורות:{" "}
              {salaryBaseAmount
                ? (
                    Number(salaryBaseAmount) *
                    (1 + Number(salaryOverheadPercent || 0) / 100)
                  ).toLocaleString()
                : "0"}{" "}
              ₪
            </div>
          </div>
        )}

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
              supplierType="invoices" // 🆕 הוסף את זה!
              returnTo="create-invoice"
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
              onChange={(e) => {
                const value = e.target.value;

                setForm((prev) => ({
                  ...prev,
                  documentType: value,
                }));

                if (value === "משכורות") {
                  setIsSalary(true);
                  setSelectedProjects([]);
                  setRows([]);
                } else {
                  setIsSalary(false);
                }
              }}
            >
              <option value="">בחר…</option>
              <option value="ח. עסקה">ח. עסקה</option>
              <option value="ה. עבודה">ה. עבודה</option>
              <option value="ד. תשלום">ד. תשלום</option>
              <option value="חשבונית מס / קבלה">חשבונית מס / קבלה</option>
              <option value="משכורות">משכורות</option>
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
                onChange={(e) => {
                  const method = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: method,
                    // ✅ אם לא בחרו צ'ק - נקה את שדות הצ'ק
                    ...(method !== "check" && {
                      checkNumber: "",
                      checkDate: "",
                    }),
                  }));
                }}
              >
                <option value="">בחר אמצעי תשלום...</option>
                <option value="bank_transfer">העברה בנקאית</option>
                <option value="check">צ'ק</option>
              </select>
            </div>
          )}

          {/* ✅ מספר צ'ק - מופיע רק אם בחרו צ'ק */}
          {form.paid === "כן" && form.paymentMethod === "check" && (
            <>
              <div>
                <label className="block font-bold mb-2">
                  מספר צ'ק <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 border rounded-xl"
                  value={form.checkNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      checkNumber: e.target.value,
                    }))
                  }
                  placeholder="הזן מספר צ'ק"
                />
              </div>

              <div>
                <label className="block font-bold mb-2">
                  תאריך פירעון צ'ק (אופציונלי)
                </label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-xl cursor-pointer"
                  value={form.checkDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      checkDate: e.target.value,
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
            </>
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
        {!isSalary && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">סכומים לפי פרויקט</h2>

            {rows.map((row, index) => (
              <div
                key={row.projectId}
                className="border rounded-xl p-4 mb-3 bg-white"
              >
                <div className="font-bold mb-2">{row.projectName}</div>

                <input
                  // type="number"
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
        )}

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
