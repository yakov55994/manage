import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import FileUploader from "../../Components/FileUploader";

const InvoiceEditPage = () => {
  const [invoice, setInvoice] = useState(null);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [invitingName, setInvitingName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [sum, setSum] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paid, setPaid] = useState(""); // "לא" או "כן"
  const [createdAt, setCreatedAt] = useState(""); // ✅ הוסף state עבור תאריך יצירה
  const [files, setFiles] = useState([]); // הוספת state עבור קבצים
  const [documentType, setDocumentType] = useState("");
  const [loading, setLoading] = useState(false);
  const { id } = useParams(); // Retrieve the invoice ID from the URL
  const navigate = useNavigate();

  useEffect(() => {
    console.log("InvoiceEditPage useEffect started with ID:", id);

    const fetchInvoice = async () => {
      console.log("Starting to fetch invoice for edit...");
      setLoading(true);

      try {
        console.log("Making API call to /invoices/" + id);
        const response = await api.get(`/invoices/${id}`);
        const invoiceData = response.data;

        console.log("Invoice data received:", invoiceData); // דיבוג

        if (!invoiceData) {
          console.log("No invoice data received");
          setLoading(false);
          return;
        }

        setInvoice(invoiceData);
        setInvoiceNumber(invoiceData.invoiceNumber);
        setSum(invoiceData.sum);
        setStatus(invoiceData.status);
        setDetail(invoiceData.detail);
        setInvitingName(invoiceData.invitingName);
        setPaymentDate(invoiceData?.paymentDate || "אין תאריך לתשלום");
        setPaid(invoiceData.paid); // Set paid status
        setDocumentType(invoiceData.documentType || "");

        if (invoiceData.createdAt) {
          console.log("Original createdAt:", invoiceData.createdAt);

          // אם התאריך שמור כ-Date או string, המר ל-string בפורמט YYYY-MM-DD
          let formattedDate;

          if (
            typeof invoiceData.createdAt === "string" &&
            invoiceData.createdAt.includes("-")
          ) {
            // אם זה כבר בפורמט YYYY-MM-DD
            formattedDate = invoiceData.createdAt.split("T")[0];
          } else {
            // אם זה Date object או timestamp
            const date = new Date(invoiceData.createdAt);
            formattedDate = date.toISOString().split("T")[0];
          }

          console.log("Formatted createdAt:", formattedDate);
          setCreatedAt(formattedDate);
        } else {
          console.log("No createdAt found in invoice data");
          // אם אין תאריך, קבע תאריך של היום כברירת מחדל
          const today = new Date().toISOString().split("T")[0];
          setCreatedAt(today);
        }

        // טעינת קבצים - וודא שכל הקבצים נטענים
        if (invoiceData.files && invoiceData.files.length > 0) {
          console.log("Files found in invoice:", invoiceData.files);
          console.log("Number of files:", invoiceData.files.length);

          // אם הקבצים כבר מכילים את כל הנתונים הנחוצים
          const processedFiles = [];

          for (let i = 0; i < invoiceData.files.length; i++) {
            const file = invoiceData.files[i];
            console.log(`Processing file ${i + 1} for edit:`, file);

            try {
              if (file && (file.url || file.fileUrl || file.secure_url)) {
                // הקובץ כבר מכיל URL
                console.log(`File ${i + 1} already has URL`);
                processedFiles.push({
                  ...file,
                  url: file.url || file.fileUrl || file.secure_url,
                  name:
                    file.name ||
                    file.originalName ||
                    file.filename ||
                    `קובץ ${i + 1}`,
                });
              } else if (file && file._id) {
                // נצטרך להביא את פרטי הקובץ
                console.log(`Fetching file details for ${file._id}`);
                const fileResponse = await api.get(`/files/${file._id}`);
                if (fileResponse.data) {
                  console.log(`File details received:`, fileResponse.data);
                  processedFiles.push({
                    ...fileResponse.data,
                    name:
                      fileResponse.data.name ||
                      fileResponse.data.originalName ||
                      fileResponse.data.filename ||
                      `קובץ ${i + 1}`,
                  });
                }
              } else {
                console.log(`File ${i + 1} has no URL or ID, adding anyway`);
                if (file) {
                  processedFiles.push({
                    ...file,
                    name:
                      file.name ||
                      file.originalName ||
                      file.filename ||
                      `קובץ ${i + 1}`,
                  });
                }
              }
            } catch (fileError) {
              console.error("Error fetching file details:", fileError);
              // גם אם יש שגיאה, נשמור את הקובץ המקורי
              if (file) {
                processedFiles.push({
                  ...file,
                  name:
                    file.name ||
                    file.originalName ||
                    file.filename ||
                    `קובץ ${i + 1}`,
                });
              }
            }
          }

          console.log("Processed files for edit:", processedFiles);
          console.log("Total processed files:", processedFiles.length);
          setFiles(processedFiles);
        } else {
          console.log("No files found in invoice");
          setFiles([]);
        }
      } catch (error) {
        console.error("Error loading invoice:", error);
        toast.error("Error loading invoice details", {
          className: "sonner-toast error rtl",
        });
      } finally {
        console.log("Finished loading invoice");
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    } else {
      console.log("No ID provided for edit");
      setLoading(false);
    }
  }, [id]);

  // ניטור שינויים במערך הקבצים
  useEffect(() => {
    console.log("=== FILES STATE CHANGED ===");
    console.log("Current files:", files);
    console.log("Files count:", files?.length || 0);
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, {
          name: file.name,
          url: file.url,
          _id: file._id,
          hasUrl: !!(file.url || file.fileUrl || file.secure_url),
        });
      });
    }
  }, [files]);

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "תאריך לא זמין";

  const handlePaymentDateChange = (e) => {
    const newPaymentDate = e.target.value;
    setPaymentDate(newPaymentDate);

    // אם התאריך קיים, נקבע את 'paid' ל"כן"
    if (newPaymentDate) {
      setPaid("כן");
    }
    // אם מוחקים את התאריך, נקבע את 'paid' ל"לא"
    else {
      setPaid("לא");
    }
  };

  const handlePaidChange = (e) => {
    const newPaidStatus = e.target.value;
    setPaid(newPaidStatus);

    // אם משנים ל"לא שולם", נוודא שאין תאריך תשלום
    if (newPaidStatus === "לא") {
      setPaymentDate("");
    }
  };

  // פונקציה להעלאת קבצים - יישור לדף יצירה
  const handleFileUpload = (selectedFiles) => {
    console.log("Files selected for invoice:", selectedFiles);

    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("לא נבחרו קבצים", { className: "sonner-toast error rtl" });
      return;
    }

    // הוסף את הקבצים החדשים למערך הקיים
    setFiles((prevFiles) => {
      const newFiles = [...(prevFiles || []), ...selectedFiles];
      console.log("Updated files after adding:", newFiles);
      return newFiles;
    });

    toast.success(`${selectedFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
      className: "sonner-toast success rtl",
    });
  };

  // פונקציה לחילוץ publicId מ-URL
  function extractPublicIdFromUrl(url, keepExtension = true) {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      const parts = path.split("/");
      const uploadIndex = parts.indexOf("upload");
      if (uploadIndex === -1 || parts.length <= uploadIndex + 1) return null;

      const relevantParts = parts.slice(uploadIndex + 1);
      if (relevantParts[0].startsWith("v")) {
        relevantParts.shift(); // מסיר את הגרסה
      }

      const fileNameWithExt = relevantParts.pop(); // example.pdf
      const folder = relevantParts.join("/");

      const fileName = keepExtension ? fileNameWithExt : fileNameWithExt;

      return folder ? `${folder}/${fileName}` : fileName;
    } catch (err) {
      console.error("❌ Failed to extract publicId:", err);
      return null;
    }
  }

  // פונקציה למחיקת קובץ - עם מחיקה אמיתית מ-Cloudinary
  const handleRemoveFile = async (fileIndex) => {
    const fileToDelete = files[fileIndex];

    // בדיקה שהקובץ קיים
    if (!fileToDelete) {
      toast.error("קובץ לא נמצא");
      return;
    }

    console.log("=== DELETING FILE ===");
    console.log("File to delete:", fileToDelete);

    // אם זה קובץ מקומי, פשוט תסיר מהמערך
    if (fileToDelete.isLocal) {
      const newFiles = [...files];
      newFiles.splice(fileIndex, 1);
      setFiles(newFiles);

      // נקה את ה-URL הזמני
      if (fileToDelete.tempUrl) {
        URL.revokeObjectURL(fileToDelete.tempUrl);
      }

      toast.success("הקובץ הוסר מהרשימה");
      return;
    }

    // מסיר מה-UI מיד
    const newFiles = [...files];
    newFiles.splice(fileIndex, 1);
    setFiles(newFiles);

    // אם זה קובץ שכבר הועלה, מחק מ-Cloudinary
    if (fileToDelete.url || fileToDelete.fileUrl) {
      const fileUrl = fileToDelete.url || fileToDelete.fileUrl;
      const publicId = extractPublicIdFromUrl(fileUrl, false); // בלי extension

      if (publicId) {
        try {
          console.log(`מנסה למחוק עם publicId: ${publicId}`);

          // צריך לתקן את השרת - אבל בינתיים נשתמש בגישה הזו
          //  await api.delete(`/upload/${fileToDelete._id}`);

          await api.delete("/upload/delete-cloudinary", {
            data: {
              publicId: publicId,
              resourceType: "raw",
            },
          });

          toast.success("הקובץ נמחק בהצלחה מ-Cloudinary");
          console.log("✅ נמחק בהצלחה מ-Cloudinary");
        } catch (deleteError) {
          console.error(
            "מחיקה מ-Cloudinary נכשלה:",
            deleteError.response?.status
          );
          toast.warning("הקובץ הוסר מהרשימה. בדוק ידנית אם נמחק מ-Cloudinary");
        }
      } else {
        console.error("לא הצליח לחלץ publicId מ-URL:", fileUrl);
        toast.warning("הקובץ הוסר מהרשימה, אך לא ניתן לחלץ את פרטי הקובץ");
      }
    } else {
      toast.success("הקובץ הוסר");
    }
  };

  // פונקציה לפתיחת קבצי Excel
  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;
    window.open(officeUrl, "_blank");
  };

  // פונקציה לרינדור קובץ - יישור לדף יצירה
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

    if (fileExtension === "pdf") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{file.name}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 font-bold hover:text-blue-700 transition-colors"
          >
            📂 צפה ב-PDF
          </a>
        </div>
      );
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{file.name}</span>
          <button
            onClick={() => openInExcelViewer(fileUrl)}
            className="text-blue-500 font-bold hover:text-blue-700 transition-colors"
          >
            📂 צפה באקסל
          </button>
        </div>
      );
    } else if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{file.name}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 font-bold hover:text-blue-700 transition-colors"
          >
            📂 צפה בתמונה
          </a>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{file.name}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 font-bold hover:text-blue-700 transition-colors"
          >
            📂 הורד קובץ
          </a>
        </div>
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // בדוק אם כל השדות קיימים
    console.log("=== בדיקת שדות ===");
    console.log("invoiceNumber:", invoiceNumber);
    console.log("sum:", sum);
    console.log("status:", status);
    console.log("invitingName:", invitingName);
    console.log("detail:", detail);
    console.log("paid:", paid);

    if (!invoiceNumber) {
      toast.error("חסר מספר חשבונית");
      setLoading(false);
      return;
    }

    if (!sum || sum <= 0) {
      toast.error("יש להזין סכום תקין");
      setLoading(false);
      return;
    }

    if (!status) {
      toast.error("חסר סטטוס חשבונית");
      setLoading(false);
      return;
    }

    if (!invitingName) {
      toast.error("חסר שם מזמין");
      setLoading(false);
      return;
    }

    if (!paid) {
      toast.error("לא צוין אם החשבונית שולמה");
      setLoading(false);
      return;
    }

    if (!createdAt) {
      toast.error("יש לבחור תאריך יצירת החשבונית", {
        className: "sonner-toast error rtl",
      });
      setLoading(false);
      return;
    }

    // בדיקה מיוחדת לתאריך תשלום
    if (paid === "כן" && (!paymentDate || paymentDate === "אין תאריך לתשלום")) {
      toast.error("יש לבחור תאריך תשלום אם החשבונית שולמה", {
        className: "sonner-toast error rtl",
      });
      setLoading(false);
      return;
    }

    try {
      // עיבוד קבצים: העלאת קבצים מקומיים חדשים - יישור לדף יצירה
      let uploadedFiles = [];

      // העלאת קבצים לקלאודינרי רק עכשיו!
      if (files && files.length > 0) {
        for (const fileData of files) {
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

      console.log("=== FINAL PROCESSED FILES ===");
      console.log("Processed files:", uploadedFiles);

      const formData = {
        invoiceNumber,
        sum: Number(sum),
        status,
        detail,
        invitingName,
        paid,
        files: uploadedFiles, // הקבצים המעובדים
        createdAt,
        documentType,
      };

      // הוספת תאריך תשלום רק אם החשבונית שולמה ויש תאריך תקף
      if (paid === "כן" && paymentDate && paymentDate !== "אין תאריך לתשלום") {
        formData.paymentDate = paymentDate;
      }

      console.log("=== SENDING TO SERVER ===");
      console.log("Form data:", formData);

      const response = await api.put(`/invoices/${id}`, formData);

      console.log("=== SERVER RESPONSE ===");
      console.log("Response:", response.data);

      if (response.data) {
        toast.success("החשבונית עודכנה בהצלחה!", {
          className: "sonner-toast success rtl",
        });
        navigate(`/invoice/${id}`);
      }
    } catch (error) {
      console.error("Error updating invoice:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "שגיאה בעדכון החשבונית";

      toast.error(errorMessage, {
        className: "sonner-toast error rtl",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-center text-slate-700 mb-0">
        עריכת חשבונית
      </h1>

      {invoice && (
        <div className="flex justify-center items-center min-h-screen">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-400 w-full max-w-4xl rounded-xl font-bold p-6 shadow-lg"
          >
            <div className="flex flex-wrap justify-between gap-4">
              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">
                  מספר חשבונית :
                </label>
                <input
                  type="number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="border p-3 text-sm rounded-lg w-44 mt-2"
                  disabled
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">סכום :</label>
                <input
                  type="number"
                  value={sum}
                  onChange={(e) => setSum(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg text-sm w-44 mt-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">סטטוס :</label>
                <select
                  onChange={(e) => setStatus(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg bg-slate-300 text-black font-bold mt-2 w-44"
                  value={status}
                >
                  <option value="הוגש" className="font-bold text-sm">
                    הוגש
                  </option>
                  <option value="בעיבוד" className="font-bold text-sm">
                    בעיבוד
                  </option>
                  <option value="לא הוגש" className="font-bold text-sm">
                    לא הוגש
                  </option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">
                  סוג מסמך :
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg bg-slate-300 text-black font-bold mt-2 w-44"
                  required
                >
                  <option value="">בחר סוג מסמך…</option>
                  <option value="ח. עסקה">ח. עסקה</option>
                  <option value="ה. עבודה">ה. עבודה</option>
                  <option value="ד. תשלום, חשבונית מס / קבלה">
                    ד. תשלום, חשבונית מס / קבלה
                  </option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">
                  שם מזמין :
                </label>
                <input
                  type="text"
                  value={invitingName}
                  onChange={(e) => setInvitingName(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg w-44 mt-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">
                  תאריך חשבונית :
                </label>
                <input
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg text-sm w-44 mt-2"
                  onFocus={(e) => e.target.showPicker()}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">
                  האם שולם?
                </label>
                <select
                  value={paid}
                  onChange={handlePaidChange}
                  className="p-3 border border-gray-300 rounded-lg bg-slate-300 text-black font-bold mt-2 w-44"
                >
                  <option value="לא" className="font-bold text-sm">
                    לא
                  </option>
                  <option value="כן" className="font-bold text-sm">
                    כן
                  </option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black mb-5">
                  תאריך התשלום :
                </label>
                {paid === "כן" ? (
                  <>
                    {/* הצג את התאריך הנוכחי אם קיים */}
                    {paymentDate && paymentDate !== "אין תאריך לתשלום" && (
                      <div className="bg-green-100 border border-green-300 rounded-md text-center p-2 text-black mb-2 w-44">
                        תאריך קיים: {formatDate(paymentDate)}
                      </div>
                    )}

                    {/* תמיד תן אפשרות לשנות/בחור תאריך */}
                    <div className="flex flex-col">
                      {(!paymentDate || paymentDate === "אין תאריך לתשלום") && (
                        <h1 className="text-lg mb-3 text-red-600">
                          " יש לבחור את תאריך התשלום "
                        </h1>
                      )}
                      <input
                        type="date"
                        value={
                          paymentDate === "אין תאריך לתשלום" ? "" : paymentDate
                        }
                        onChange={handlePaymentDateChange}
                        className={`w-44 p-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all ${
                          !paymentDate || paymentDate === "אין תאריך לתשלום"
                            ? "border-red-400"
                            : "border-green-400"
                        }`}
                        onFocus={(e) => e.target.showPicker()}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-200 rounded-md text-center p-2 text-gray-500 mt-2 w-44">
                    החשבונית לא שולמה
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7 w-96">
              <label className="font-bold text-l text-black">פירוט :</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="border-2 bg-slate-300 border-gray-900 p-3 rounded-lg w-full min-h-[100px] h-32 mt-6 px-3 py-2.5"
              />
            </div>

            {/* קטע העלאת קבצים - יישור לדף יצירה */}
            <div className="mt-7">
              <label className="font-bold text-xl text-black mb-4 block">
                קבצי חשבונית:
              </label>

              {/* FileUploader component כמו בדף יצירה */}
              <div className="space-y-2 lg:col-span-3">
                <FileUploader
                  onUploadSuccess={(files) => handleFileUpload(files)}
                  folder="invoices"
                  label="העלה קבצי חשבונית"
                />
              </div>

              {/* Display uploaded files - יישור לדף יצירה */}
              <div className="col-span-3">
                {files && files.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {files.map((file, fileIndex) => (
                      <div
                        key={fileIndex}
                        className="text-center flex items-center justify-center"
                      >
                        <p className="font-bold text-xl mr-2 ml-5">
                          קובץ {fileIndex + 1} :
                        </p>
                        {renderFile(file)}
                        <button
                          onClick={() => handleRemoveFile(fileIndex)}
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

            <button
              type="submit"
              className="bg-slate-900 text-white px-6 py-2 rounded-lg mt-8 font-bold w-28 hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              {loading ? "מעדכן..." : "עדכן"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default InvoiceEditPage;
