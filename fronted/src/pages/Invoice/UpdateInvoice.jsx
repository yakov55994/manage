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
import ProjectSelector from "../../Components/ProjectSelector.jsx";
import DateField from "../../Components/DateField.jsx";
import FundingProjectModal from "../../Components/FundingProjectModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

import { ClipboardList, Building2 } from "lucide-react";

// ===============================================
// MAIN COMPONENT
// ===============================================
const InvoiceEditPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);

  // ✅ זהה את פרויקט המילגה
  const milgaProject = projects.find((p) => p.name === "מילגה");
  const MILGA_ID = milgaProject?._id;

  const [rows, setRows] = useState([]);
  const [declaredTotal, setDeclaredTotal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ מצב עבור מודל בחירת פרויקט/ים ממומן/ים
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [pendingMilgaProject, setPendingMilgaProject] = useState(null);
  const [fundingProjectsMap, setFundingProjectsMap] = useState({}); // { milgaProjectId: [fundingProjectId1, fundingProjectId2, ...] }

  // ✅ מצב עבור מודל הגשת חשבונית
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const [globalFields, setGlobalFields] = useState({
    invoiceNumber: "",
    invitingName: "",
    supplierId: "",
    documentType: "",
    invoiceDate: "",
    detail: "",
    internalNotes: "",
    paid: "לא",
    paymentDate: "",
    paymentMethod: "",
    checkNumber: "", // ✅ הוסף
    checkDate: "",
    status: "לא הוגש", // ✅ סטטוס הגשה
    submittedToProjectId: null, // ✅ פרויקט שאליו הוגשה החשבונית
    submittedAt: null, // ✅ תאריך הגשה
    files: [],
  });
  const [forceUnsubmit, setForceUnsubmit] = useState(false);


  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditInvoices, isAdmin } = useAuth();

  // -----------------------------------------------
  // CHECK PERMISSIONS
  // -----------------------------------------------
  useEffect(() => {
    if (!canEditInvoices()) navigate("/no-access");
  }, [canEditInvoices]);

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

  // -----------------------------------------------
  // LOAD ALL PROJECTS AND INVOICE TOGETHER
  // -----------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // טען פרויקטים תחילה
        const res = await api.get("/projects");
        const loadedProjects = res.data?.data || [];
        setProjects(loadedProjects);

        // אחרי שהפרויקטים נטענו, טען את החשבונית
        if (loadedProjects.length > 0) {
          const { data } = await api.get(`/invoices/${id}`);
          const invoice = data.data;

          if (invoice) {
            // -------- MAIN INVOICE FILES ----------
            const invoiceFiles = await ensureFilesHydrated(invoice.files || []);

            // -------- GLOBAL FIELDS ----------
            setGlobalFields((prev) => ({
              ...prev,
              files: invoiceFiles,
              invoiceNumber: invoice.invoiceNumber || "",
              invitingName: invoice.invitingName || "",
              supplierId: invoice.supplierId?._id || invoice.supplierId || "",
              documentType: invoice.documentType || "",
              invoiceDate: invoice.invoiceDate
                ? invoice.invoiceDate.split("T")[0]
                : new Date().toISOString().split("T")[0],
              detail: invoice.detail || "",
              internalNotes: invoice.internalNotes || "",
              paid: invoice.paid || "לא",
              paymentDate: invoice.paymentDate
                ? invoice.paymentDate.split("T")[0]
                : "",
              paymentMethod: invoice.paymentMethod || "",
              checkNumber: invoice.checkNumber || "",
              checkDate: invoice.checkDate
                ? invoice.checkDate.split("T")[0]
                : "",
              status: invoice.status || "לא הוגש",
              submittedToProjectId: invoice.submittedToProjectId?._id || invoice.submittedToProjectId || null,
              submittedAt: invoice.submittedAt
                ? invoice.submittedAt.split("T")[0]
                : null,
            }));

            // -------- SELECTED PROJECTS ----------
            const selected = invoice.projects.map((p) => ({
              _id: p.projectId._id || p.projectId,
              name: p.projectId.name,
            }));
            setSelectedProjects(selected);

            // -------- ROWS ----------
            // ✅ סנן פרויקט מילגה מהשורות - אין לו תקציב משלו
            const milgaProj = loadedProjects.find((p) => p.name === "מילגה");
            const builtRows = invoice.projects
              .filter((p) => {
                const pid = p.projectId._id || p.projectId;
                const pname = p.projectName || p.projectId?.name;
                // סנן לפי ID או לפי שם
                return pid !== milgaProj?._id && pname !== "מילגה";
              })
              .map((p) => ({
                projectId: p.projectId._id || p.projectId,
                projectName: p.projectName || p.projectId.name,
                sum: p.sum,
              }));

            setRows(builtRows);

            // -------- DECLARED TOTAL ----------
            if (builtRows.length > 1 && invoice.totalAmount) {
              setDeclaredTotal(String(invoice.totalAmount));
            }

            // -------- FUNDING PROJECT MAP ----------
            // ✅ אם יש fundedFromProjectId או fundedFromProjectIds, טען את המיפוי
            const milgaProject = invoice.projects.find(
              (p) => (p.projectId.name || p.projectName) === "מילגה"
            );

            if (milgaProject) {
              const milgaId = milgaProject.projectId._id || milgaProject.projectId;

              // תמיכה גם בגרסה הישנה (יחיד) וגם בגרסה החדשה (מרובה)
              if (invoice.fundedFromProjectIds && Array.isArray(invoice.fundedFromProjectIds)) {
                // גרסה חדשה - מערך
                const fundedIds = invoice.fundedFromProjectIds.map(id =>
                  typeof id === "string" ? id : id._id
                );
                setFundingProjectsMap({
                  [milgaId]: fundedIds,
                });
              } else if (invoice.fundedFromProjectId) {
                // גרסה ישנה - ערך יחיד - המר למערך
                const fundedId =
                  typeof invoice.fundedFromProjectId === "string"
                    ? invoice.fundedFromProjectId
                    : invoice.fundedFromProjectId._id;
                setFundingProjectsMap({
                  [milgaId]: [fundedId],
                });
              }
            }
          }
        }
      } catch (error) {
        toast.error("שגיאה בטעינת הנתונים");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // ===============================================================
  // SELECT / UNSELECT PROJECTS (עם תמיכה במילגה)
  // ===============================================================
  const handleProjectsChange = (updatedProjects) => {
    // מצא פרויקטים חדשים שנוספו
    const newProjects = updatedProjects.filter(
      (p) => !selectedProjects.some((x) => x._id === p._id)
    );

    // בדוק אם יש פרויקט מילגה חדש שנבחר
    const newMilgaProject = newProjects.find(
      (p) => p.isMilga || p.type === "milga" || p.name === "מילגה"
    );

    if (newMilgaProject && !fundingProjectsMap[newMilgaProject._id]) {
      // פרויקט מילגה חדש - הצג מודל לבחירת פרויקט ממומן
      setPendingMilgaProject(newMilgaProject);
      setShowFundingModal(true);
      return; // אל תעדכן את הבחירה עדיין
    }

    // עדכן את הפרויקטים הנבחרים
    setSelectedProjects(updatedProjects);

    // עדכן את השורות
    setRows((prev) => {
      // הסר שורות של פרויקטים שבוטלו
      let updated = prev.filter((r) =>
        updatedProjects.some((p) => (p._id || p) === r.projectId)
      );

      // הוסף שורות חדשות לפרויקטים שנוספו (מלבד מילגה)
      updatedProjects.forEach((p) => {
        const projectId = p._id || p;
        // ✅ דלג על פרויקט מילגה - אין לו תקציב משלו
        if (projectId === MILGA_ID) return;

        if (!updated.find((r) => r.projectId === projectId)) {
          updated.push({
            projectId: projectId,
            projectName: p.name,
            sum: "",
          });
        }
      });

      return updated;
    });
  };

  // טיפול בבחירת פרויקט/ים ממומן/ים
  const handleFundingProjectSelect = (fundingProjectOrProjects) => {
    if (!pendingMilgaProject) return;

    // תמיכה גם בפרויקט יחיד וגם במערך של פרויקטים
    const fundingProjects = Array.isArray(fundingProjectOrProjects)
      ? fundingProjectOrProjects
      : [fundingProjectOrProjects];

    const fundingProjectIds = fundingProjects.map(p => p._id);

    // שמור את המיפוי בין פרויקט מילגה לפרויקטים ממומנים
    setFundingProjectsMap((prev) => ({
      ...prev,
      [pendingMilgaProject._id]: fundingProjectIds,
    }));

    // עכשיו הוסף את פרויקט המילגה לבחירה
    const updatedProjects = [...selectedProjects, pendingMilgaProject];
    setSelectedProjects(updatedProjects);

    // הוסף שורות עבור כל הפרויקטים הממומנים
    setRows((prev) => {
      const newRows = [...prev];

      // הוסף שורה לכל פרויקט ממומן
      fundingProjects.forEach(fp => {
        if (!newRows.find(r => r.projectId === fp._id)) {
          newRows.push({
            projectId: fp._id,
            projectName: fp.name,
            sum: "",
          });
        }
      });

      return newRows;
    });

    // נקה את המצב הזמני
    setPendingMilgaProject(null);
  };

  // ===============================================================
  // GLOBAL FIELDS CHANGE
  // ===============================================================
  const updateGlobal = (field, value) => {
    setGlobalFields(prev => ({ ...prev, [field]: value }));
  };


  // ===============================================================
  // DELETE GLOBAL FILE (קובץ כללי של החשבונית)
  // ===============================================================
  const deleteGlobalFile = async (fileIndex) => {
    const file = globalFields.files[fileIndex];

    // אם הקובץ כבר מועלה ל-Cloudinary - מחק אותו משם
    if (file.publicId) {
      try {
        await api.delete("/upload/delete-cloudinary", {
          data: {
            publicId: file.publicId,
            resourceType: file.resourceType || "raw",
          },
        });
      } catch (err) {
        console.error("שגיאה במחיקת קובץ מ-Cloudinary:", err);
        toast.error("שגיאה במחיקת קובץ מ-Cloudinary");
        return; // אם נכשל - אל תמשיך
      }
    }

    // הסר מהממשק והמצב
    const updatedFiles = [...globalFields.files];
    updatedFiles.splice(fileIndex, 1);
    setGlobalFields({ ...globalFields, files: updatedFiles });

    toast.success("הקובץ נמחק");
  };

  // ===============================================================
  // SAVE INVOICE — PUT /invoices/:id
  // ===============================================================
  const saveInvoice = async () => {
    if (!globalFields.invoiceNumber) return toast.error("חסר מספר חשבונית");
    if (!globalFields.supplierId) return toast.error("יש לבחור ספק");
    if (!globalFields.documentType) return toast.error("יש לבחור סוג מסמך");
    if (!rows.length && !selectedProjects.length) return toast.error("בחר לפחות פרויקט אחד");

    if (
      globalFields.paid === "כן" &&
      globalFields.paymentMethod === "check" &&
      !globalFields.checkNumber
    ) {
      return toast.error("יש למלא מספר צ'ק");
    }

    // ✅ בדיקה עבור הגשה
    if (globalFields.status === "הוגש" && !globalFields.submittedToProjectId) {
      return toast.error("יש לבחור פרויקט להגשה");
    }
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].sum || rows[i].sum <= 0) {
        return toast.error(`סכום לא תקין בשורה ${i + 1}`);
      }
    }

    // ולידציה: סכום כולל מול סכומי הפרויקטים
    if (declaredTotal !== "" && Number(declaredTotal) > 0) {
      const rowsTotal = rows.reduce((acc, r) => acc + Number(r.sum || 0), 0);
      if (Math.abs(rowsTotal - Number(declaredTotal)) > 0.01) {
        return toast.error("סכומי הפרויקטים לא תואמים את הסכום הכולל שהוזן");
      }
    }

    setSaving(true);

    try {
      // העלאת קבצים כלליים של החשבונית
      // רק קבצים שנשארו ב-globalFields.files יישלחו (אחרי מחיקות)
      const uploadedGlobalFiles = [];
      for (const file of globalFields.files) {
        if (file.isLocal && file.file) {
          const form = new FormData();
          form.append("file", file.file);
          form.append("folder", "invoices");

          const res = await api.post("/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          uploadedGlobalFiles.push({
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
          // קובץ קיים - שמור אותו כמו שהוא
          uploadedGlobalFiles.push({
            name: file.name,
            url: file.url,
            type: file.type,
            size: file.size,
            publicId: file.publicId,
            resourceType: file.resourceType,
            documentType: file.documentType || "",
            documentNumber: file.documentNumber || "",
          });
        }
      }

      // בניית מערך פרויקטים ללא קבצים (כל הקבצים בשדה הכללי)
      const finalProjects = rows.map((r) => ({
        projectId: r.projectId,
        projectName: r.projectName,
        sum: Number(r.sum),
      }));

      // ✅ אם יש מילגה בפרויקטים הנבחרים, הוסף אותה ל-projects (עם סכום 0)
      // כדי שנוכל למצוא את החשבונית בדף פרויקט מילגה
      if (selectedProjects.some((p) => p._id === MILGA_ID || p.name === "מילגה")) {
        const milgaProject = projects.find((p) => p._id === MILGA_ID || p.name === "מילגה");
        if (milgaProject && !finalProjects.find(fp => fp.projectId === milgaProject._id)) {
          finalProjects.push({
            projectId: milgaProject._id,
            projectName: milgaProject.name,
            sum: 0, // מילגה לא צורכת תקציב
          });
        }
      }
      let finalStatus = globalFields.status;
      let finalSubmittedProject = globalFields.submittedToProjectId;
      let finalSubmittedAt = globalFields.submittedAt;

      if (forceUnsubmit && globalFields.status !== "הוגש") {
        finalStatus = "לא הוגש";
        finalSubmittedProject = null;
        finalSubmittedAt = null;
      }


      const {
        status,
        submittedToProjectId,
        submittedAt,
        ...restGlobalFields
      } = globalFields;

      const payload = {
        ...restGlobalFields, // ❗ בלי status והגשה
        files: uploadedGlobalFiles,
        paymentMethod:
          globalFields.paid === "כן" ? globalFields.paymentMethod : "",
        paymentDate:
          globalFields.paid === "כן" ? globalFields.paymentDate : "",
        checkNumber:
          globalFields.paid === "כן" && globalFields.paymentMethod === "check"
            ? globalFields.checkNumber
            : null,
        checkDate:
          globalFields.paid === "כן" && globalFields.paymentMethod === "check"
            ? globalFields.checkDate
            : null,
        projects: finalProjects,
        fundingProjectsMap,

        // ✅ הגשה – מקור אמת אחד בלבד
        status: forceUnsubmit ? "לא הוגש" : status,
        submittedToProjectId: forceUnsubmit ? null : submittedToProjectId,
        submittedAt: forceUnsubmit ? null : submittedAt,
      };

      setForceUnsubmit(false);
      console.log(payload)
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container max-w-5xl mx-auto px-6">
        {/* HEADER */}
        <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black text-slate-900">עריכת חשבונית</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PROJECT SELECTION */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
          <ProjectSelector
            projects={projects}
            selectedProjects={selectedProjects}
            onProjectsChange={handleProjectsChange}
            multiSelect={true}
            label="שיוך חשבונית לפרויקטים"
            placeholder="חפש פרויקט..."
            showSelectAll={true}
          />
        </div>

        {/* FUNDING PROJECT MODAL */}
        <FundingProjectModal
          open={showFundingModal}
          onClose={() => {
            setShowFundingModal(false);
            setPendingMilgaProject(null);
          }}
          projects={projects}
          onSelect={handleFundingProjectSelect}
          milgaProjectName={pendingMilgaProject?.name || ""}
          multiSelect={true}
        />

        {/* GLOBAL FIELDS */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SupplierSelector
            value={globalFields.supplierId}
            onSelect={(s) => updateGlobal("supplierId", s._id)}
          />

          <div>
            <label className="font-bold block mb-1">מספר חשבונית</label>
            <input
              type="text"
              value={globalFields.invoiceNumber}
              readOnly={globalFields.documentType === "אין צורך"}
              onChange={(e) => updateGlobal("invoiceNumber", e.target.value)}
              className={`w-full p-3 border rounded-xl ${globalFields.documentType === "אין צורך" ? "bg-gray-100 text-gray-500" : ""}`}
            />
            {globalFields.documentType === "אין צורך" && (
              <p className="text-xs text-slate-500 mt-1">מספר סידורי אוטומטי</p>
            )}
          </div>

          <DateField
            type="date"
            label="תאריך החשבונית"
            value={globalFields.invoiceDate}
            onChange={(v) => updateGlobal("invoiceDate", v)}
          />

          <div>
            <label>סוג מסמך</label>
            <select
              className="w-full p-3 border rounded-xl"
              value={globalFields.documentType}
              onChange={(e) => {
                const value = e.target.value;
                const prevType = globalFields.documentType;
                updateGlobal("documentType", value);
                // אם "אין צורך" – שלוף מספר סידורי אוטומטי
                if (value === "אין צורך") {
                  api.get("/invoices/next-no-doc-serial").then(({ data }) => {
                    if (data.success) {
                      updateGlobal("invoiceNumber", data.serial);
                    }
                  }).catch(() => {});
                } else if (prevType === "אין צורך") {
                  // מחק מספר סידורי רק כשעוברים מ-"אין צורך" לסוג אחר
                  updateGlobal("invoiceNumber", "");
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
          {/* ✅ הגשת חשבונית */}
          <div className="md:col-span-2">
            <label className="font-bold mb-2 block">הגשת חשבונית</label>

            {/* 🔔 הודעת ביניים – ביטול הגשה לפני שמירה */}
            {forceUnsubmit && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-sm text-yellow-800">
                ⚠️ ביטול הגשה בוצע – יש לשמור שינויים כדי להחיל
              </div>
            )}

            {globalFields.status === "הוגש" &&
              globalFields.submittedToProjectId &&
              !forceUnsubmit ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    סטטוס: <span className="font-bold text-green-700">הוגש</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    הוגש לפרויקט:{" "}
                    <span className="font-bold">
                      {projects.find(
                        p => p._id === globalFields.submittedToProjectId
                      )?.name || "טוען..."}
                    </span>
                  </p>
                  {globalFields.submittedAt && (
                    <p className="text-sm text-gray-600">
                      תאריך הגשה:{" "}
                      <span className="font-bold">
                        {new Date(globalFields.submittedAt).toLocaleDateString("he-IL")}
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    updateGlobal("status", "לא הוגש");
                    updateGlobal("submittedToProjectId", null);
                    updateGlobal("submittedAt", null);
                    setForceUnsubmit(true);
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
                className="w-56 p-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold rounded-xl"
              >
                סמן כהוגש לפרויקט
              </button>
            )}
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
                  <option value="לא לתשלום">לא לתשלום</option>
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
                      <option value="credit_card">כרטיס אשראי</option>

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

          <div className="md:col-span-2">
            <label className="font-bold mb-1 block flex items-center gap-2">
              הערות פנימיות
              <span className="text-xs text-slate-400 font-normal">(לשימוש המשרד בלבד)</span>
            </label>
            <textarea
              value={globalFields.internalNotes}
              onChange={(e) => updateGlobal("internalNotes", e.target.value)}
              className="w-full p-3 border rounded-xl min-h-[80px] bg-yellow-50/50 border-yellow-200 focus:border-yellow-400 focus:outline-none"
              placeholder="הערות פנימיות..."
            />
          </div>

          <div className="bg-white shadow-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
            <FileUploader
              folder="invoices"
              askForDocumentType={true}
              isExistingInvoice={true}
              onUploadSuccess={(files) => {
                setGlobalFields((prev) => ({
                  ...prev,
                  files: [...prev.files, ...files],
                }));
              }}
            />

            {globalFields.files?.length > 0 &&
              globalFields.files.map((file, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center mt-2 p-3 bg-white border rounded-xl gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate block text-sm font-medium text-blue-600 hover:underline"
                    >
                      {file.name}
                    </a>
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
                    className="text-red-600 text-sm flex-shrink-0"
                    onClick={() => deleteGlobalFile(index)}
                  >
                    הסר
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* סכום כולל */}
        {rows.length > 1 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 mb-6">
            <div className="border-2 border-dashed border-orange-300 rounded-xl p-4 bg-orange-50/50">
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
          </div>
        )}

        {/* ROWS PER PROJECT */}
        <div className="space-y-6">
          {rows.map((row, index) => (
            <div key={index} className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6">
              <h3 className="text-xl font-bold mb-3">
                פרויקט: {row.projectName}
              </h3>

              <label className="font-bold mb-1 block">סכום</label>
              <input
                type="text"
                value={row.sum}
                onChange={(e) => {
                  const clone = [...rows];
                  clone[index].sum = e.target.value;
                  setRows(clone);
                }}
                className="w-full p-3 border rounded-xl mb-4"
              />
            </div>
          ))}
        </div>

        {/* SAVE BUTTON */}
        <div className="mt-10 text-center">
          <button
            onClick={saveInvoice}
            disabled={
              saving ||
              (rows.length > 1 &&
                declaredTotal !== "" &&
                Number(declaredTotal) > 0 &&
                Math.abs(
                  rows.reduce((acc, r) => acc + Number(r.sum || 0), 0) -
                    Number(declaredTotal)
                ) > 0.01)
            }
            className="px-10 py-3 bg-orange-600 text-white font-bold text-lg rounded-xl shadow-xl hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </div>

      {/* ✅ Submission Modal - מודל בחירת פרויקט להגשה */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">סמן חשבונית כהוגשה</h2>
              <p className="text-sm text-gray-600 mt-1">בחר את הפרויקט שאליו הוגשה החשבונית</p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="font-bold mb-2 block">בחר פרויקט:</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={globalFields.submittedToProjectId || ""}
                  onChange={(e) => updateGlobal("submittedToProjectId", e.target.value || null)}
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
                  value={globalFields.submittedAt || new Date().toISOString().split("T")[0]}
                  onChange={(e) => updateGlobal("submittedAt", e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  if (!globalFields.submittedToProjectId) {
                    toast.error("יש לבחור פרויקט");
                    return;
                  }

                  setGlobalFields(prev => ({
                    ...prev,
                    status: "הוגש",
                    submittedToProjectId: prev.submittedToProjectId,
                    submittedAt: prev.submittedAt || new Date().toISOString().split("T")[0],
                  }));

                  setForceUnsubmit(false);
                  setShowSubmissionModal(false);
                  toast.success("החשבונית סומנה כהוגשה");
                }}


                className="flex-1 py-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold rounded-xl  transition-all"
              >
                אישור
              </button>
              <button
                onClick={() => {
                  setShowSubmissionModal(false);
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

export default InvoiceEditPage;
