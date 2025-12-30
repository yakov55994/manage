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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ מצב עבור מודל בחירת פרויקט ממומן
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [pendingMilgaProject, setPendingMilgaProject] = useState(null);
  const [fundingProjectsMap, setFundingProjectsMap] = useState({}); // { milgaProjectId: fundingProjectId }

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
              createdAt: invoice.createdAt
                ? invoice.createdAt.split("T")[0]
                : new Date().toISOString().split("T")[0],
              detail: invoice.detail || "",
              paid: invoice.paid || "לא",
              paymentDate: invoice.paymentDate
                ? invoice.paymentDate.split("T")[0]
                : "",
              paymentMethod: invoice.paymentMethod || "",
              checkNumber: invoice.checkNumber || "",
              checkDate: invoice.checkDate
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

  // טיפול בבחירת פרויקט ממומן
  const handleFundingProjectSelect = (fundingProject) => {
    if (!pendingMilgaProject) return;

    // שמור את המיפוי בין פרויקט מילגה לפרויקט ממומן
    setFundingProjectsMap((prev) => ({
      ...prev,
      [pendingMilgaProject._id]: fundingProject._id,
    }));

    // עכשיו הוסף את פרויקט המילגה לבחירה
    const updatedProjects = [...selectedProjects, pendingMilgaProject];
    setSelectedProjects(updatedProjects);

    // הוסף שורה
    setRows((prev) => [
      ...prev,
      {
        projectId: pendingMilgaProject._id,
        projectName: pendingMilgaProject.name,
        sum: "",
      },
    ]);

    // נקה את המצב הזמני
    setPendingMilgaProject(null);
  };

  // ===============================================================
  // GLOBAL FIELDS CHANGE
  // ===============================================================
  const updateGlobal = (field, value) => {
    setGlobalFields({ ...globalFields, [field]: value });
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
          });
        }
      }

      // בניית מערך פרויקטים ללא קבצים (כל הקבצים בשדה הכללי)
      const finalProjects = rows.map((r) => ({
        projectId: r.projectId,
        projectName: r.projectName,
        sum: Number(r.sum),
      }));

      const payload = {
        ...globalFields,
        files: uploadedGlobalFiles, // קבצים כלליים מועלים
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
        fundingProjectsMap, // ✅ מיפוי פרויקטי מילגה לפרויקטים ממומנים
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container max-w-5xl mx-auto px-6">
        {/* HEADER */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <ClipboardList className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">עריכת חשבונית</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PROJECT SELECTION */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-10">
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
        />

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
            <label>סוג מסמך</label>
            <select
              className="w-full p-3 border rounded-xl"
              value={globalFields.documentType}
              onChange={(e) => updateGlobal("documentType", e.target.value)}
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
              askForDocumentType={true}
              isExistingInvoice={true}
              onUploadSuccess={(files) => {
                setGlobalFields((prev) => ({
                  ...prev,
                  files: [...prev.files, ...files],
                  // עדכן את סוג המסמך הראשי אם נבחר סוג מסמך בקובץ
                  documentType: files[0]?.documentType || prev.documentType,
                }));
              }}
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
                    onClick={() => deleteGlobalFile(index)}
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
