import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import FileUploader from "../../Components/FileUploader";
import SupplierSelector from "../../Components/SupplierSelector.jsx";
import DateField from "../../Components/DateField.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

// Icons (lucide-react)
import { ClipboardList, User as UserIcon, Building2 } from "lucide-react";

const InvoiceEditPage = () => {
  // State for multi-invoice editing
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [initialProjectId, setInitialProjectId] = useState(null);
  const [originalProjectName, setOriginalProjectName] = useState("");

  // Global fields shared across all invoices
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
  });

  // Per-project rows (each project gets its own sum and files)
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const { canViewInvoices, isAdmin } = useAuth();

  useEffect(() => {
    if (!canViewInvoices) {
      navigate("/no-access");
    }
  }, [canViewInvoices]);

  // Load all projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await api.get("/projects");
        const data = res.data?.data || [];
        setProjects(data);
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת פרויקטים");
      }
    };
    loadProjects();
  }, []);

  // Load invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/invoices/${id}`);
        const invoiceData = response.data?.data;
        if (!invoiceData) return;

        // Set global fields
        setGlobalFields({
          invoiceNumber: invoiceData.invoiceNumber ?? "",
          invitingName: invoiceData.invitingName ?? "",
          supplierId: invoiceData.supplierId ?? "",
          documentType: invoiceData.documentType ?? "",
          createdAt: invoiceData.createdAt
            ? new Date(invoiceData.createdAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          detail: invoiceData.detail ?? "",
          paid: invoiceData.paid ?? "לא",
          paymentDate: invoiceData.paymentDate
            ? new Date(invoiceData.paymentDate).toISOString().split("T")[0]
            : "",
          paymentMethod: invoiceData.paymentMethod ?? "",
        });

        const processed = await ensureFilesHydrated(invoiceData.files || []);

        // ✅ המר ל-string
        const projectIdString =
          invoiceData.projectId?._id ||
          invoiceData.projectId?.toString() ||
          invoiceData.projectId;

        setInitialProjectId(projectIdString);
        setOriginalProjectName(invoiceData.projectName || ""); // אל תשכח את זה!

        setRows([
          {
            projectId: projectIdString, // ✅ שמור כ-string
            projectName: invoiceData.projectName,
            sum: invoiceData.sum ?? "",
            files: processed,
          },
        ]);

        // ❌ הסר את כל הקונסולים והחיפוש הזה - זה לא צריך
        // ה-useEffect השלישי יטפל בזה

        setInitialLoadDone(true); // ✅ זה יפעיל את ה-useEffect השלישי
      } catch (err) {
        console.error("Error loading invoice:", err);
        toast.error("שגיאה בטעינת החשבונית");
      } finally {
        setLoading(false);
      }
    };

    if (id && projects.length > 0) fetchInvoice();
  }, [id, projects]);
  // אחרי שהחשבונית נטענה וגם הפרויקטים נטענו
  useEffect(() => {
    if (!initialLoadDone || !initialProjectId || projects.length === 0) return;

    const found = projects.find((p) => {
      // השווה גם string לstring וגם אפשר object._id
      return p._id === initialProjectId || p._id === initialProjectId?._id;
    });

    console.log("Found project:", found);

    if (found) {
      setSelectedProjects((prev) => {
        if (prev.some((p) => p._id === found._id)) return prev;
        return [...prev, found];
      });
    }
  }, [initialLoadDone, initialProjectId, projects]);

  // ✅ הסר את ההערות מה-useEffect הזה והוסף אותו אחרי שטוענים את הפרויקטים
  useEffect(() => {
    if (!initialLoadDone) return; // ❗ חשוב - אל תרוץ לפני שהחשבונית נטענה
    if (!selectedProjects.length) {
      // אם אין פרויקטים נבחרים, אל תנקה - תשאיר את השורה הראשונית
      return;
    }

    setRows((prevRows) => {
      const updated = [...prevRows];

      // הוסף שורות לפרויקטים חדשים
      selectedProjects.forEach((project) => {
        const exists = updated.find((r) => r.projectId === project._id);

        if (!exists) {
          updated.push({
            projectId: project._id,
            projectName: project.name,
            sum: "",
            files: [],
          });
        }
      });

      // הסר שורות של פרויקטים שבוטלו (אבל לא אם זה הפרויקט המקורי)
      const filteredRows = updated.filter((row) =>
        selectedProjects.some((p) => p._id === row.projectId)
      );

      return filteredRows;
    });
  }, [selectedProjects, initialLoadDone]);
  const ensureFilesHydrated = async (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        if (file?.url || file?.fileUrl || file?.secure_url) {
          out.push({
            ...file,
            url: file.url || file.fileUrl || file.secure_url,
            name:
              file.name ||
              file.originalName ||
              file.filename ||
              `קובץ ${i + 1}`,
          });
        } else if (file?._id) {
          const { data } = await api.get(`/files/${file._id}`);
          if (data) {
            out.push({
              ...data,
              url: data.url || data.fileUrl || data.secure_url,
              name:
                data.name ||
                data.originalName ||
                data.filename ||
                `קובץ ${i + 1}`,
            });
          }
        } else if (file) {
          out.push({
            ...file,
            name:
              file.name ||
              file.originalName ||
              file.filename ||
              `קובץ ${i + 1}`,
          });
        }
      } catch {
        if (file) {
          out.push({
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
    return out;
  };

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

  const updateGlobal = (field, value) => {
    setGlobalFields({ ...globalFields, [field]: value });
  };

  const deleteFile = async (rowIndex, fileIndex) => {
    const fileToDelete = rows[rowIndex].files[fileIndex];

    if (!fileToDelete) {
      toast.error("קובץ לא נמצא");
      return;
    }

    // Local file - just remove from UI
    if (fileToDelete.isLocal) {
      const clone = [...rows];
      clone[rowIndex].files.splice(fileIndex, 1);
      setRows(clone);

      if (fileToDelete.tempUrl) {
        URL.revokeObjectURL(fileToDelete.tempUrl);
      }

      toast.success("הקובץ הוסר מהרשימה");
      return;
    }

    // Cloudinary file - delete from server
    try {
      const clone = [...rows];
      clone[rowIndex].files.splice(fileIndex, 1);
      setRows(clone);

      const fileUrl = fileToDelete.url || fileToDelete.fileUrl;

      if (fileUrl) {
        const publicId =
          fileToDelete.publicId || extractPublicIdFromUrl(fileUrl);

        if (publicId) {
          await api.delete("/upload/delete-cloudinary", {
            data: {
              publicId,
              resourceType: fileToDelete.resourceType || "raw",
            },
          });

          toast.success("הקובץ נמחק מהשרת ומ-Cloudinary");
        } else {
          console.warn("⚠️ Could not extract publicId from:", fileUrl);
          toast.warning("הקובץ הוסר מהרשימה, אך לא ניתן למחוק מ-Cloudinary");
        }
      } else {
        toast.success("הקובץ הוסר מהרשימה");
      }
    } catch (error) {
      console.error("❌ Error deleting file:", error);

      if (
        error.response?.status === 404 ||
        error.response?.data?.result === "not found"
      ) {
        toast.info("הקובץ כבר לא קיים ב-Cloudinary");
      } else {
        toast.error(
          "שגיאה במחיקת הקובץ: " +
            (error.response?.data?.message || error.message)
        );

        const clone = [...rows];
        clone[rowIndex].files.splice(fileIndex, 0, fileToDelete);
        setRows(clone);
      }
    }
  };

  const saveInvoice = async () => {
    if (!globalFields.invoiceNumber) {
      toast.error("חסר מספר חשבונית");
      return;
    }
    if (!globalFields.supplierId) {
      toast.error("יש לבחור ספק");
      return;
    }
    if (!globalFields.documentType) {
      toast.error("יש לבחור סוג מסמך");
      return;
    }
    if (!globalFields.createdAt) {
      toast.error("יש לבחור תאריך יצירה");
      return;
    }
    if (!rows.length) {
      toast.error("יש לבחור לפחות פרויקט אחד");
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].sum || rows[i].sum <= 0) {
        toast.error(`סכום לא תקין בשורה ${i + 1}`);
        return;
      }
    }

    if (
      globalFields.paid === "כן" &&
      (!globalFields.paymentDate || !globalFields.paymentMethod)
    ) {
      toast.error("יש לבחור גם תאריך תשלום וגם צורת תשלום");
      return;
    }

    setSaving(true);

    try {
      // Upload files for each row
      const finalRows = await Promise.all(
        rows.map(async (row) => {
          let uploadedFiles = [];

          if (row.files && row.files.length > 0) {
            for (const file of row.files) {
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
            ...row,
            files: uploadedFiles,
          };
        })
      );

      // For now, we're editing a single invoice
      // You can extend this to handle multiple invoices if needed
      const payload = {
        invoiceNumber: globalFields.invoiceNumber,
        invitingName: globalFields.invitingName,
        supplierId: globalFields.supplierId,
        documentType: globalFields.documentType,
        createdAt: globalFields.createdAt,
        detail: globalFields.detail,
        paid: globalFields.paid,
        paymentMethod:
          globalFields.paid === "כן" ? globalFields.paymentMethod : "",
        paymentDate: globalFields.paid === "כן" ? globalFields.paymentDate : "",
        rows: finalRows.map((r) => ({
          projectId: r.projectId,
          projectName: r.projectName,
          sum: Number(r.sum),
          files: r.files,
        })),
      };

      // שים לב → לא עושים PUT אלא POST מיוחד
      await api.post(`/invoices/split/${id}`, payload);

      toast.success("החשבונית עודכנה בהצלחה!");
      navigate(`/invoices`);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "שגיאה בעדכון החשבונית";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-12 relative">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="relative mb-10">
          <div className="absolute -inset-x-6 -inset-y-2 bg-gradient-to-r from-orange-500 to-yellow-500 opacity-10 rounded-3xl blur-xl"></div>

          <div className="relative bg-white/80 rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black text-slate-900">
                עריכת חשבונית
              </h1>
            </div>

            {/* MULTI PROJECT SELECT */}
            <div className="mt-6 max-w-2xl mx-auto">
              <label className="text-base font-bold flex items-center gap-3 mb-4 text-slate-800">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                שיוך חשבונית לעוד פרויקטים (בחרו אחד או יותר)
              </label>

              {/* Selected Projects Tags */}
              {selectedProjects.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-3">
                  {selectedProjects.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center gap-2 bg-orange-200 border border-orange-300 rounded-xl px-4 py-2 shadow-sm"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <button
                        onClick={() => toggleProject(p)}
                        className="text-orange-600 hover:text-red-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                      p.name.toLowerCase().includes(projectSearch.toLowerCase())
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
                              isSelected ? "text-orange-900" : "text-slate-700"
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
                      p.name.toLowerCase().includes(projectSearch.toLowerCase())
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
              {/* </div> */}

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
              <div>
                {/* <label className="font-bold text-sm mb-2 block">ספק</label> */}
                <SupplierSelector
                  projectId={null}
                  value={globalFields.supplierId}
                  onSelect={(supplier) =>
                    updateGlobal("supplierId", supplier._id)
                  }
                />
              </div>

              <div>
                <label className="font-bold text-sm mb-2 block">
                  מספר חשבונית
                </label>
                <input
                  type="number"
                  value={globalFields.invoiceNumber}
                  onChange={(e) =>
                    updateGlobal("invoiceNumber", e.target.value)
                  }
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-sm mb-2 block">
                  תאריך יצירה
                </label>
                <DateField
                  type="date"
                  value={globalFields.createdAt}
                  onChange={(val) => updateGlobal("createdAt", val)}
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>
              {console.log("globalFields: ", globalFields)}
              <div>
                <label className="font-bold text-sm mb-2 block">סוג מסמך</label>
                <select
                  value={globalFields.documentType}
                  onChange={(e) => updateGlobal("documentType", e.target.value)}
                  className="w-full p-3 border-2 rounded-xl"
                >
                  <option value="">בחר סוג מסמך…</option>
                  <option value="ח. עסקה">ח. עסקה</option>
                  <option value="ה. עבודה">ה. עבודה</option>
                  <option value="ד. תשלום">ד. תשלום</option>
                  <option value="חשבונית מס / קבלה">חשבונית מס / קבלה</option>
                </select>
              </div>

              {isAdmin && (
                <>
                  <div>
                    <label className="font-bold text-sm mb-2 block">
                      האם שולם?
                    </label>
                    <select
                      value={globalFields.paid}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateGlobal("paid", val);
                        if (val === "לא") {
                          updateGlobal("paymentDate", "");
                          updateGlobal("paymentMethod", "");
                        }
                      }}
                      className="w-full p-3 border-2 rounded-xl"
                    >
                      <option value="לא">לא</option>
                      <option value="כן">כן</option>
                    </select>
                  </div>

                  {globalFields.paid === "כן" && (
                    <>
                      <div>
                        <label className="font-bold text-sm mb-2 block">
                          תאריך תשלום
                        </label>
                        <DateField
                          type="date"
                          value={globalFields.paymentDate}
                          onChange={(val) => updateGlobal("paymentDate", val)}
                          className="w-full p-3 border-2 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-sm mb-2 block">
                          צורת תשלום
                        </label>
                        <select
                          value={globalFields.paymentMethod}
                          onChange={(e) =>
                            updateGlobal("paymentMethod", e.target.value)
                          }
                          className="w-full p-3 border-2 rounded-xl"
                        >
                          <option value="">בחר צורת תשלום…</option>
                          <option value="bank_transfer">העברה בנקאית</option>
                          <option value="check">צ׳ק</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="md:col-span-2">
                <label className="font-bold text-sm mb-2 block">פירוט</label>
                <textarea
                  value={globalFields.detail}
                  onChange={(e) => updateGlobal("detail", e.target.value)}
                  className="w-full p-3 border-2 rounded-xl min-h-[100px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PER PROJECT ROWS */}
        <div className="mt-6 space-y-6">
          {rows.map((row, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl shadow-xl p-6 border border-orange-100"
            >
              <h3 className="text-2xl font-bold mb-4">
                פרויקט: {row.projectName}
              </h3>

              <label className="font-bold text-sm mb-2 block">
                סכום לפרויקט זה
              </label>
              <input
                type="number"
                value={row.sum}
                onChange={(e) => {
                  const copy = [...rows];
                  copy[index].sum = e.target.value;
                  setRows(copy);
                }}
                className="w-full p-3 border-2 rounded-xl mb-4"
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
                  className="flex justify-between items-center mt-2 p-2 bg-white rounded border"
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

        <div className="mt-10 text-center">
          <button
            onClick={saveInvoice}
            disabled={saving}
            className="px-10 py-3 rounded-xl bg-orange-600 text-white font-bold text-lg hover:bg-orange-700 shadow-xl"
          >
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditPage;
