import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SuccessAnimation from "../../Components/SuccessAnimation.jsx";
import api from "../../api/api";
import FileUploader from "../../Components/FileUploader";
import { toast } from "sonner";
import SupplierSelector from "../../Components/SupplierSelector.jsx";

const CreateInvoice = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceIndexToDelete, setInvoiceIndexToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  // const [Contact_person, setContact_Person] = useState('')

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get("/projects");
        setProjects(response?.data || []);
      } catch (err) {
        toast.error("שגיאה בטעינת הפרויקטים", {
          className: "sonner-toast error rtl",
        });
        setProjects([]);
      }
    };
    fetchProjects();
  }, []);

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    if (!projectId) {
      setSelectedProject(null);
      return;
    }
    const selected = projects.find((project) => project._id === projectId);
    setSelectedProject(selected || null);
  };

  const validateInvoice = (invoice) => {
    console.log("🔍 Validating invoice:", invoice);

    const requiredFields = [
      "invoiceNumber",
      "detail",
      "sum",
      "status",
      "paid",
      "invitingName", // ✅ שם הספק מהרשימה
      "supplierId",
      "createdAt",
      // "Contact_person"
    ];

    const missingFields = requiredFields.filter((field) => !invoice[field]);

    if (missingFields.length > 0) {
      console.log("❌ Missing fields:", missingFields);
      return false;
    }

    return true;
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
        supplierId: "", // ✅ הוסף את זה!
      },
    ]);
  };

  // 🔍 לבדיקה - הוסף console.log בתחילת handleSubmit:
  console.log("🔍 All invoices before submit:", invoices);
  console.log("🔍 First invoice supplierId:", invoices[0]?.supplierId);

  const removeInvoice = (index) => {
    setInvoiceIndexToDelete(index);
    setShowModal(true);
  };
  const handleDelete = () => {
    // מחיקת החשבונית לאחר אישור
    setInvoices(invoices.filter((_, i) => i !== invoiceIndexToDelete));
    setShowModal(false); // סגירת המודל
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
    console.log("Files selected for invoice:", selectedFiles);

    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("לא נבחרו קבצים", { className: "sonner-toast error rtl" });
      return;
    }

    const newInvoices = [...invoices];

    // Initialize files array if it doesn't exist
    if (!newInvoices[index].files) {
      newInvoices[index].files = [];
    }

    // Add the new files to the invoice's files array (מקומית בלבד!)
    newInvoices[index] = {
      ...newInvoices[index],
      files: [...newInvoices[index].files, ...selectedFiles],
    };

    console.log("Updated invoice with local files:", newInvoices[index]);
    setInvoices(newInvoices);

    toast.success(`${selectedFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
      className: "sonner-toast success rtl",
    });
  };
  const handlePaidChange = (index, e) => {
    const newInvoices = [...invoices];
    newInvoices[index] = {
      ...newInvoices[index],
      paid: e.target.value,
      paymentDate:
        e.target.value === "לא" ? "" : newInvoices[index].paymentDate,
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
      // בדיקה מול הדטהבייס לכל חשבונית
      for (const invoice of invoices) {
        console.log(
          "🔍 Checking invoice:",
          invoice.invoiceNumber,
          "for supplier:",
          invoice.invitingName
        );

        // ✅ בדיקה שהנתונים קיימים לפני השליחה
        if (!invoice.invoiceNumber || !invoice.invitingName) {
          console.log("❌ Missing invoice data");
          continue; // דלג על חשבונית לא מלאה
        }

        // ✅ בדיקה לפי שם ספק ומספר חשבונית (לא ID)
        const response = await api.get(`/invoices/check-duplicate`, {
          params: {
            supplierName: invoice.invitingName, // ✅ שם הספק
            invoiceNumber: invoice.invoiceNumber, // ✅ מספר החשבונית
            // לא שולחים supplierId כי זה גורם לשגיאה
          },
        });

        console.log("🔍 Server response:", response.data);

        // ✅ אם יש כפילות לאותו ספק
        if (response.data.exists) {
          toast.error(
            `לספק "${invoice.invitingName}" כבר קיימת חשבונית עם מספר "${invoice.invoiceNumber}"`,
            {
              className: "sonner-toast error rtl",
            }
          );
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error("Error checking duplicate invoices:", err);
      console.error("Error details:", err.response?.data);

      // ✅ הצגת השגיאה המדויקת מהשרת
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

  // תיקון בפונקציית handleSubmit:
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("🔍 Starting validation...");

    // בדיקה בסיסית שכל החשבוניות מלאות
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const invoiceNumber = i + 1; // מספר החשבונית בממשק

      // בדיקת מספר חשבונית
      if (!invoice.invoiceNumber) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר מספר חשבונית`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      // בדיקת שם ספק
      if (!invoice.invitingName) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר שם ספק`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      // בדיקת ID ספק
      if (!invoice.supplierId) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: חסר זיהוי ספק (בחר ספק מהרשימה)`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      // בדיקת תאריך יצירה
      if (!invoice.createdAt) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר תאריך יצירת החשבונית`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      // בדיקת סכום
      if (!invoice.sum || invoice.sum <= 0) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: חסר סכום או שהסכום לא תקין`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      // בדיקת פירוט
      // if (!invoice.detail || invoice.detail.trim() === '') {
      //   toast.error(`חשבונית מספר ${invoiceNumber}: חסר פירוט החשבונית`, {
      //     className: "sonner-toast error rtl",
      //   });
      //   return;
      // }

      // בדיקת סטטוס
      if (!invoice.status) {
        toast.error(`חשבונית מספר ${invoiceNumber}: חסר סטטוס החשבונית`, {
          className: "sonner-toast error rtl",
        });
        return;
      }

      // בדיקת סטטוס תשלום
      if (!invoice.paid) {
        toast.error(
          `חשבונית מספר ${invoiceNumber}: לא צוין אם החשבונית שולמה`,
          {
            className: "sonner-toast error rtl",
          }
        );
        return;
      }

      // בדיקה מיוחדת: אם החשבונית שולמה, חייב להיות תאריך תשלום
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

          // העלאת קבצים לקלאודינרי רק עכשיו!
          if (invoice.files && invoice.files.length > 0) {
            for (const fileData of invoice.files) {
              // בדיקה אם זה קובץ מקומי שצריך להעלות
              if (fileData.isLocal && fileData.file) {
                try {
                  console.log(`מעלה קובץ: ${fileData.name}`);

                  const formData = new FormData();
                  formData.append("file", fileData.file);
                  formData.append("folder", fileData.folder || "invoices");

                  const uploadResponse = await api.post("/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });

                  // הקובץ הועלה בהצלחה
                  uploadedFiles.push({
                    name: fileData.name,
                    url: uploadResponse.data.file.url,
                    type: fileData.type,
                    size: fileData.size,
                    publicId: uploadResponse.data.file.publicId,
                    resourceType: uploadResponse.data.file.resourceType,
                  });

                  console.log(`✅ קובץ ${fileData.name} הועלה בהצלחה`);
                } catch (uploadError) {
                  console.error("Error uploading file:", uploadError);
                  toast.error(`שגיאה בהעלאת ${fileData.name}`, {
                    className: "sonner-toast error rtl",
                  });
                  throw uploadError; // עצור את התהליך אם יש שגיאה
                }
              } else {
                // קובץ שכבר הועלה (אם יש כאלה)
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
            files: uploadedFiles, // הקבצים שהועלו עכשיו
            paymentDate:
              invoice.paid === "כן"
                ? formatHebrewDate(invoice.paymentDate)
                : null,
            createdAt: invoice.createdAt,
            supplierId: invoice.supplierId,
          };
        })
      );

      console.log("✅ כל הקבצים הועלו, שולח נתונים לשרת...");

      const response = await api.post(
        "/invoices",
        { invoices: invoiceData },
        { headers: { "Content-Type": "application/json" } }
      );

      toast.success("החשבונית/ות נוצרו בהצלחה!", {
        className: "sonner-toast success rtl",
      });
      navigate("/invoices");
    } catch (err) {
      console.error("שגיאה במהלך יצירת החשבונית/יות:", err);

      // אם יש שגיאה, כדאי לנקות קבצים שכבר הועלו (אופציונלי)

      if (err.response?.data?.message) {
        toast.error(`שגיאה: ${err.response.data.message}`, {
          className: "sonner-toast error rtl",
        });
      } else {
        toast.error("שגיאה ביצירת החשבונית - אנא נסה שוב", {
          className: "sonner-toast error rtl",
        });
      }
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
    // בדיקה אם זה קובץ מקומי או שכבר הועלה
    const fileUrl = file?.url || file?.fileUrl;
    const isLocal = file?.isLocal || false;

    if (!fileUrl) return null;

    // אם זה קובץ מקומי, הצג רק את השם
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

    // אם הקובץ כבר הועלה, הצג כרגיל
    const fileExtension = fileUrl.split(".").pop().toLowerCase();

    if (fileExtension === "xlsx") {
      return (
        <div>
          <button
            onClick={() => openInExcelViewer(fileUrl)}
            className="text-blue-500 font-bold mt-2"
          >
            📂 לצפייה בקובץ לחץ כאן
          </button>
        </div>
      );
    }

    if (fileExtension === "pdf") {
      return (
        <div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-500 font-bold mt-2"
          >
            📂 לצפייה בקובץ לחץ כאן
          </a>
        </div>
      );
    }

    if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-500 font-bold mt-2"
          >
            📂 לצפייה בקובץ לחץ כאן
          </a>
        </div>
      );
    }

    return (
      <div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-blue-500 font-bold mt-2"
        >
          📂 לצפייה בקובץ לחץ כאן
        </a>
      </div>
    );
  };
  const handleRemoveFile = async (invoiceIndex, fileIndex) => {
    const fileToDelete = invoices[invoiceIndex].files[fileIndex];
    
    // בדיקה שהקובץ קיים
    if (!fileToDelete) {
        toast.error("קובץ לא נמצא");
        return;
    }
    
    // אם זה קובץ מקומי, פשוט תסיר מהמערך
    if (fileToDelete.isLocal) {
        const newInvoices = [...invoices];
        newInvoices[invoiceIndex].files.splice(fileIndex, 1);
        setInvoices(newInvoices);
        
        // נקה את ה-URL הזמני
        if (fileToDelete.url) {
            URL.revokeObjectURL(fileToDelete.url);
        }
        
        toast.success("הקובץ הוסר מהרשימה");
        return;
    }
    
    // אם זה קובץ שכבר הועלה, מחק מהשרת
    try {
        await api.delete(`/upload/${fileToDelete._id}`);
        
        const newInvoices = [...invoices];
        newInvoices[invoiceIndex].files.splice(fileIndex, 1);
        setInvoices(newInvoices);
        
        toast.success("הקובץ נמחק בהצלחה");
    } catch (error) {
        toast.error("שגיאה במחיקת הקובץ");
    }
};

  return (
    <div className="mx-auto mt-10 bg-gray-300 p-8 rounded-lg shadow-xl w-full max-w-5xl ">
      <h1 className="text-4xl font-bold text-center text-slate-800 mb-8 drop-shadow-lg">
        יצירת חשבונית / חשבוניות לפרוייקט
      </h1>

      <div className="mb-8 flex justify-center">
        <select
          onChange={handleProjectChange}
          className="mt-5 w-64 p-3 border border-gray-300 rounded-lg bg-slate-400 text-black font-bold"
        >
          <option value="" className="font-bold">
            לא נבחר פרוייקט
          </option>
          {projects.map((project) => (
            <option key={project._id} value={project._id} className="font-bold">
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {/* {!selectedProject && (
                <div className="flex justify-center items-center">
                    <div className="mt-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg w-fit flex items-center">
                        <p className="text-red-700 text-center font-medium">
                            יש לבחור פרויקט תחילה כדי ליצור חשבונית / חשבוניות !
                        </p>
                    </div>
                </div>
            )} */}

      {selectedProject && (
        <div className="mb-4 text-center">
          {selectedProject.remainingBudget < 0 ? (
            <h2 className="font-bold text-xl flex justify-center">
              תקציב שנותר:{" "}
              <b className="mr-3 text-red-700">
                {" "}
                {selectedProject.remainingBudget?.toLocaleString()} ₪ ❗
              </b>
            </h2>
          ) : (
            <h2 className="font-bold text-lg">
              תקציב שנותר: {selectedProject.remainingBudget?.toLocaleString()} ₪
            </h2>
          )}
        </div>
      )}

      {invoices.map((invoice, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-xl shadow-xl mb-8 hover:shadow-2xl transition-shadow duration-300"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <SupplierSelector
                label="שם הספק"
                value={invoice.invitingName}
                onChange={(supplier) => {
                  console.log("🔍 Raw supplier data:", supplier);

                  const newInvoices = [...invoices];
                  newInvoices[index] = {
                    ...newInvoices[index],
                    invitingName:
                      supplier?.name || supplier?.supplierName || "",
                    supplierId: supplier?._id || supplier?.id || "", // ✅ וודא שזה נשמר!
                  };
                  setInvoices(newInvoices);

                  console.log(
                    "🔍 After update - invoice with supplier:",
                    newInvoices[index]
                  );
                }}
                placeholder="בחר ספק מהרשימה..."
                required={true}
              />

              {/* כפתור ליצירת ספק חדש */}
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    // שמירת הנתונים הנוכחיים ב-localStorage
                    localStorage.setItem(
                      "tempProjectData",
                      JSON.stringify({
                        name,
                        // Contact_person
                      })
                    );

                    // מעבר לדף יצירת ספק עם פרמטר חזרה
                    navigate("/create-supplier?returnTo=/create-project");
                  }}
                  className="px-4 py-2 bg-gray-400 text-sm text-black font-bold rounded-xl hover:bg-gray-900 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>➕</span>
                  <span>אין ספק ברשימה? צור ספק חדש</span>
                </button>
              </div>
            </div>

            {/* <div className="space-y-2">
  <label className="block text-slate-700 font-semibold">
    איש קשר:
  </label>
  <input
    type="text"
    value={invoice.Contact_person} // ✅ הערך של החשבונית הספציפית
    onChange={(e) =>
      handleInvoiceChange(index, "Contact_person", e.target.value)
    }
    placeholder="הכנס שם איש הקשר"
    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
    required
  />
</div> */}

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                מספר חשבונית:
              </label>
              <input
                type="number"
                value={invoice.invoiceNumber}
                onChange={(e) =>
                  handleInvoiceChange(index, "invoiceNumber", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                סכום החשבונית:
              </label>
              <input
                type="number"
                value={invoice.sum}
                onChange={(e) =>
                  handleInvoiceChange(index, "sum", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                min="0"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-slate-700 font-semibold">
                פירוט חשבונית:
              </label>
              <textarea
                value={invoice.detail}
                onChange={(e) =>
                  handleInvoiceChange(index, "detail", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all h-24"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                תאריך יצירת החשבונית:
              </label>
              <input
                type="date"
                value={invoice.createdAt}
                onChange={(e) =>
                  handleInvoiceChange(index, "createdAt", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                required
                onFocus={(e) => e.target.showPicker()}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                סטטוס:
              </label>
              <select
                value={invoice.status}
                onChange={(e) =>
                  handleInvoiceChange(index, "status", e.target.value)
                }
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all bg-white"
                required
              >
                <option value="לא הוגש">לא הוגש</option>
                <option value="הוגש">הוגש</option>
                <option value="בעיבוד">בעיבוד</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                האם שולם?
              </label>
              <select
                value={invoice.paid}
                onChange={(e) => handlePaidChange(index, e)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all bg-white"
                required
              >
                <option value="לא">לא</option>
                <option value="כן">כן</option>
              </select>
            </div>

            {invoice.paid === "כן" && (
              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">
                  תאריך תשלום:
                </label>
                <input
                  type="date"
                  value={invoice.paymentDate}
                  onChange={(e) =>
                    handleInvoiceChange(index, "paymentDate", e.target.value)
                  }
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                  required
                  onFocus={(e) => e.target.showPicker()}
                />
              </div>
            )}

            <div className="space-y-2 lg:col-span-3">
              <FileUploader
                onUploadSuccess={(files) => handleInvoiceUpload(index, files)}
                folder="invoices"
                label="העלה קבצי חשבונית"
              />

           {/* Display uploaded files */}
<div className="col-span-3">
  {invoice.files && invoice.files.length > 0 ? (
    <div className="mt-4 space-y-4">
      {invoice.files.map((file, fileIndex) => ( // ✅ שינוי השם ל-fileIndex
       <div
       key={fileIndex}
       className="text-center flex items-center justify-center"
       >
          {console.log(file)}
          <p className="font-bold text-xl mr-2 ml-5">
            קובץ {fileIndex + 1} :
          </p>
          {renderFile(file)}
          <button
            onClick={() => handleRemoveFile(index, fileIndex)} // ✅ עכשיו נכון!
            className="text-xl font-bold mr-6 mt-2"
          >
            ❌ הסר
          </button>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex justify-center">
      <p className="text-gray-700 bg-white w-44 p-2 mt-10 text-center text-lg rounded-2xl">
        אין קבצים להצגה
      </p>
    </div>
  )}
</div>
            </div>
          </div>

          <button
            onClick={() => removeInvoice(index)}
            className="mt-6 px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            type="button"
          >
            <span>מחק חשבונית</span>
            <span>❌</span>
          </button>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row justify-center gap-4 items-center mt-8">
        <button
          onClick={addInvoice}
          className="w-48 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          type="button"
        >
          <span>הוסף חשבונית</span>
          <span>➕</span>
        </button>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-center text-red-600">
                  האם אתה בטוח?
                </h3>
                <p className="mt-1 text-l text-center">
                  שים לב! פעולה זו תמחק את החשבונית לצמיתות.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  מחק
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleSubmit}
          className="w-48 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isLoading || !selectedProject || invoices.length === 0}
        >
          {isLoading ? "יוצר אנא המתן..." : "צור חשבונית/ות"}
        </button>
      </div>
    </div>
  );
};

export default CreateInvoice;
