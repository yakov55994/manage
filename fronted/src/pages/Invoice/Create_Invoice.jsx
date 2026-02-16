// ============================
// CreateInvoice.jsx – MULTI PROJECT INVOICE (FINAL VERSION)
// ============================

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
import FileUploader from "../../Components/FileUploader.jsx";
import ProjectSelector from "../../Components/ProjectSelector.jsx";
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
      invoiceDate: "",
      detail: "",
      paid: "לא",
      paymentDate: "",
      paymentMethod: "",
      checkNumber: "",
      checkDate: "",
      status: "לא הוגש", // ✅ סטטוס הגשה
      submittedToProjectId: null, // ✅ פרויקט שאליו הוגשה החשבונית
      submittedAt: null, // ✅ תאריך הגשה
      files: [],
    }
  );

  const [rows, setRows] = useState(draft?.rows || []);
  const [declaredTotal, setDeclaredTotal] = useState(draft?.declaredTotal || "");
  const [fundedFromProjectId, setFundedFromProjectId] = useState("");
  const [fundedFromProjectIds, setFundedFromProjectIds] = useState(draft?.fundedFromProjectIds || []);

  // ✅ מצב עבור מודל הגשת חשבונית
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // ✅ הוסף את זה אחרי ה-useState של form
  useEffect(() => {
    const dataToSave = {
      form,
      selectedProjects,
      rows,
      declaredTotal,
      fundedFromProjectId, // ← הוספנו
      fundedFromProjectIds, // ← הוספנו
    };
    localStorage.setItem("invoiceDraft", JSON.stringify(dataToSave));
  }, [form, selectedProjects, rows, declaredTotal, fundedFromProjectId, fundedFromProjectIds]);

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
        const allProjects = res.data.data || [];
        // סנן רק פרויקטים שאינם מסוג "salary" - לא להציג פרויקט משכורות
        const regularProjects = allProjects.filter(p => p.type !== "salary");
        setProjects(regularProjects);
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
    let newRows = selectedProjects
      // ✅ סנן את פרויקט מילגה - הוא לא צריך row כי אין לו תקציב
      .filter((p) => p._id !== MILGA_ID)
      .map((p) => {
        // ✅ חפש אם יש כבר row עם הסכום שלו
        const existingRow = rows.find((r) => r.projectId === p._id);

        return {
          projectId: p._id,
          projectName: p.name,
          sum: existingRow?.sum || "", // ✅ שמור את הסכום הקיים אם יש
        };
      });

    // ✅ אם בחרו מילגה ויש פרויקטים ממממנים - הוסף rows עבורם
    if (
      selectedProjects.some((p) => p._id === MILGA_ID) &&
      fundedFromProjectIds.length > 0
    ) {
      fundedFromProjectIds.forEach(fundedProjectId => {
        if (!newRows.find((r) => r.projectId === fundedProjectId)) {
          const fundedProject = projects.find((p) => p._id === fundedProjectId);
          if (fundedProject) {
            const existingRow = rows.find((r) => r.projectId === fundedProjectId);
            newRows.push({
              projectId: fundedProject._id,
              projectName: fundedProject.name,
              sum: existingRow?.sum || "",
            });
          }
        }
      });
    }

    // ✅ רק עדכן אם באמת יש שינוי (למנוע לולאה אינסופית)
    const hasChanged =
      newRows.length !== rows.length ||
      newRows.some(
        (nr, idx) =>
          !rows[idx] ||
          nr.projectId !== rows[idx].projectId ||
          nr.projectName !== rows[idx].projectName
      );

    if (hasChanged) {
      setRows(newRows);
    }
  }, [selectedProjects, fundedFromProjectIds, projects, rows]); // ✅ הוסף גם rows כי אנחנו קוראים אותו

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
    // ולידציות עם הודעות ברורות
    if (!form.invoiceNumber?.trim()) {
      return toast.error("יש להזין מספר חשבונית");
    }

    if (!isSalary && !form.supplierId) {
      return toast.error("יש לבחור ספק");
    }

    if (!isSalary && rows.length === 0) {
      return toast.error("יש לבחור לפחות פרויקט אחד");
    }

    if (!form.documentType) {
      return toast.error("יש לבחור סוג מסמך");
    }

    if (form.paid === "כן" && !form.paymentMethod) {
      return toast.error("יש לבחור אמצעי תשלום");
    }

    if (form.paid === "כן" && form.paymentMethod === "check" && !form.checkNumber?.trim()) {
      return toast.error("יש להזין מספר צ'ק");
    }

    // ✅ בדיקה עבור הגשה
    if (form.status === "הוגש" && !form.submittedToProjectId) {
      return toast.error("יש לבחור פרויקט להגשה");
    }

    if (isSalary && !fundedFromProjectId) {
      return toast.error("יש לבחור פרויקט ממנו יורד התקציב למשכורות");
    }

    if (isSalary && !salaryEmployeeName?.trim()) {
      return toast.error("יש להזין שם מקבל השכר");
    }

    if (isSalary && (!salaryBaseAmount || Number(salaryBaseAmount) <= 0)) {
      return toast.error("יש להזין סכום בסיס תקין");
    }

    if (selectedProjects.some((p) => p._id === MILGA_ID) && fundedFromProjectIds.length === 0) {
      return toast.error("יש לבחור לפחות פרויקט אחד ממנו יורד התקציב למילגה");
    }

    if (!isSalary) {
      for (const row of rows) {
        if (!row.sum || Number(row.sum) <= 0) {
          return toast.error(`יש להזין סכום תקין לפרויקט "${row.projectName}"`);
        }
      }

      // ולידציה: סכום כולל מול סכומי הפרויקטים - רק כשיש יותר מפרויקט אחד
      if (rows.length > 1 && declaredTotal !== "" && Number(declaredTotal) > 0) {
        const rowsTotal = rows.reduce((acc, r) => acc + Number(r.sum || 0), 0);
        if (Math.abs(rowsTotal - Number(declaredTotal)) > 0.01) {
          return toast.error("סכומי הפרויקטים לא תואמים את הסכום הכולל שהוזן");
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
            documentType: file.documentType || "",
            documentNumber: file.documentNumber || "",
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
        invoiceDate: form.invoiceDate,
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

        // ✅ שדות הגשה
        status: form.status || "לא הוגש",
        submittedToProjectId: form.submittedToProjectId || null,
        submittedAt: form.submittedAt || null,

        // תמיכה בשתי הגרסאות - ישנה (יחיד) וחדשה (מרובה)
        fundedFromProjectId: fundedFromProjectId || null,
        fundedFromProjectIds: fundedFromProjectIds && fundedFromProjectIds.length > 0 ? fundedFromProjectIds : null,
      };

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

        // ✅ אם יש מילגה בפרויקטים הנבחרים, הוסף אותה ל-projects (עם סכום 0)
        // כדי שנוכל למצוא את החשבונית בדף פרויקט מילגה
        if (selectedProjects.some((p) => p._id === MILGA_ID)) {
          const milgaProject = projects.find((p) => p._id === MILGA_ID);
          if (milgaProject) {
            payload.projects.push({
              projectId: milgaProject._id,
              projectName: milgaProject.name,
              sum: 0, // מילגה לא צורכת תקציב
            });
          }
        }
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
      const errorMessage = err.response?.data?.message || "שגיאה ביצירת חשבונית";
      toast.error(errorMessage);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto max-w-5xl px-6">
        {/* HEADER */}
        <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">
                    יצירת חשבונית מרובת פרויקטים
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      מערכת חשבוניות מתקדמת
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PROJECT SELECTOR */}
        {!isSalary && (
          <>
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-8">
              <ProjectSelector
                projects={projects}
                selectedProjects={selectedProjects}
                onProjectsChange={(updated) => {
                  setSelectedProjects(updated);

                  // בדיקה אם נוסף או הוסר פרויקט משכורות
                  const hadSalary = selectedProjects.some((p) => p.name === "משכורות");
                  const hasSalary = updated.some((p) => p.name === "משכורות");

                  if (hasSalary && !hadSalary) {
                    // הוספנו פרויקט משכורות
                    setIsSalary(true);
                    setForm((prev) => ({
                      ...prev,
                      documentType: "משכורות",
                    }));
                  } else if (!hasSalary && hadSalary) {
                    // הסרנו פרויקט משכורות
                    setIsSalary(false);
                    setForm((prev) => ({
                      ...prev,
                      documentType: "",
                    }));
                  }
                }}
                multiSelect={true}
                label="בחר פרויקטים"
                placeholder="חפש פרויקט..."
                showSelectAll={true}
              />
              {/* בחירת פרויקט/ים מממן/ים — רק אם נבחר פרויקט "מילגה" */}
              {selectedProjects.some((p) => p._id === MILGA_ID) && (
                <div className="mt-4">
                  <label className="block text-sm font-bold text-red-600 mb-2">
                    * חובה לבחור פרויקט/ים ממממן/ים למילגה
                  </label>
                  <ProjectSelector
                    projects={projects}
                    selectedProjects={fundedFromProjectIds.map(id => projects.find(p => p._id === id)).filter(Boolean)}
                    onProjectsChange={(selectedProjs) => {
                      setFundedFromProjectIds(selectedProjs.map(p => p._id));
                    }}
                    multiSelect={true}
                    label="מאילו פרויקטים יורד התקציב?"
                    placeholder="חפש פרויקטים ממממנים..."
                    showSelectAll={false}
                  />
                </div>
              )}
            </div>
          </>
        )}
        {isSalary && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-8">
            <ProjectSelector
              projects={projects}
              selectedProjectId={fundedFromProjectId}
              onProjectChange={(projectId) => setFundedFromProjectId(projectId)}
              multiSelect={false}
              label="פרויקט ממנו יורד התקציב (משכורות)"
              placeholder="חפש פרויקט..."
            />

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
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-8 grid grid-cols-2 gap-6">
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

          {/* תאריך החשבונית */}
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
            <label className="cursor-pointer">תאריך החשבונית</label>
            <input
              type="date"
              ref={dateInputRef}
              className="w-full p-3 border rounded-xl cursor-pointer"
              value={form.invoiceDate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  invoiceDate: e.target.value,
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
              <option value="אין צורך">אין צורך</option>
            </select>
          </div>

          {/* ✅ הגשת חשבונית */}
          <div className="md:col-span-2">
            <label className="font-bold mb-2 block">הגשת חשבונית</label>
            {form.status === "הוגש" && form.submittedToProjectId ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">סטטוס: <span className="font-bold text-green-700">הוגש</span></p>
                  <p className="text-sm text-gray-600">
                    הוגש לפרויקט: <span className="font-bold">{projects.find(p => p._id === form.submittedToProjectId)?.name || "טוען..."}</span>
                  </p>
                  {form.submittedAt && (
                    <p className="text-sm text-gray-600">
                      תאריך הגשה: <span className="font-bold">{new Date(form.submittedAt).toLocaleDateString("he-IL")}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      status: "לא הוגש",
                      submittedToProjectId: null,
                      submittedAt: null,
                    }));
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  ביטול הגשה
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmissionModal(true)}
                className="w-full p-3 bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                סמן כהוגש לפרויקט
              </button>
            )}
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
              <option value="לא לתשלום">לא לתשלום</option>
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
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">סכומים לפי פרויקט</h2>

            {/* שדה סכום כולל */}
            {rows.length > 1 && (
              <div className="border-2 border-dashed border-orange-300 rounded-xl p-4 mb-5 bg-orange-50/50">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block font-bold mb-2 text-orange-800">
                      סכום כולל לחשבונית
                    </label>
                    <input
                      type="number"
                      placeholder="הזן את הסכום הכולל..."
                      className="w-full p-3 border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={declaredTotal}
                      onChange={(e) => setDeclaredTotal(e.target.value)}
                    />
                  </div>
                  {declaredTotal !== "" && Number(declaredTotal) > 0 && (() => {
                    const currentRowsTotal = rows.reduce((acc, r) => acc + Number(r.sum || 0), 0);
                    const diff = Number(declaredTotal) - currentRowsTotal;
                    const isMatch = Math.abs(diff) <= 0.01;
                    return (
                      <div
                        className={`mt-6 px-4 py-3 rounded-xl font-bold text-sm ${
                          isMatch
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-red-100 text-red-700 border border-red-300"
                        }`}
                      >
                        <div>סה"כ שורות: {currentRowsTotal.toLocaleString("he-IL")} ש"ח</div>
                        <div>
                          {isMatch
                            ? "✓ הסכומים תואמים"
                            : `הפרש: ${diff.toLocaleString("he-IL")} ש"ח`}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

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
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-8">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <FileText className="text-orange-600" /> קבצים לחשבונית
          </h2>

          <FileUploader
            onUploadSuccess={handleFiles}
            folder="invoices"
            askForDocumentType={true}
            isExistingInvoice={true}
          />

          {form.files.length > 0 && (
            <div className="mt-4 space-y-2">
              {form.files.map((file, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-medium">{file.name}</span>
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                      {file.documentType && (
                        <span>סוג: <span className="font-bold text-slate-700">{file.documentType}</span></span>
                      )}
                      {file.documentNumber && (
                        <span>מס׳: <span className="font-bold text-slate-700">{file.documentNumber}</span></span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-red-600 text-sm flex-shrink-0"
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
            className="w-44 p-4 rounded-xl bg-orange-600 text-white font-bold shadow-xl ml-5 disabled:opacity-50"
            disabled={
              loading ||
              (!isSalary &&
                rows.length > 1 &&
                declaredTotal !== "" &&
                Number(declaredTotal) > 0 &&
                Math.abs(
                  rows.reduce((acc, r) => acc + Number(r.sum || 0), 0) -
                    Number(declaredTotal)
                ) > 0.01)
            }
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

      {/* ✅ Submission Modal - מודל בחירת פרויקט להגשה */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">סמן חשבונית כהוגשה</h2>
              <p className="text-sm text-gray-600 mt-1">בחר את הפרויקט שאליו תוגש החשבונית</p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="font-bold mb-2 block">בחר פרויקט:</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.submittedToProjectId || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      submittedToProjectId: e.target.value || null,
                    }))
                  }
                >
                  <option value="">בחר פרויקט...</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="font-bold mb-2 block">תאריך הגשה:</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.submittedAt || new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      submittedAt: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  if (!form.submittedToProjectId) {
                    toast.error("יש לבחור פרויקט");
                    return;
                  }
                  setForm((prev) => ({
                    ...prev,
                    status: "הוגש",
                    submittedAt: prev.submittedAt || new Date().toISOString().split("T")[0],
                  }));
                  setShowSubmissionModal(false);
                  toast.success("החשבונית תסומן כהוגשה");
                }}
                className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl transition-all"
              >
                אישור
              </button>
              <button
                onClick={() => {
                  setShowSubmissionModal(false);
                  setForm((prev) => ({
                    ...prev,
                    submittedToProjectId: null,
                  }));
                }}
                className="flex-1 py-3 bg-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-400 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoice;
