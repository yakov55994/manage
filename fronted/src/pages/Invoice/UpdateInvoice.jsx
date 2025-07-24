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
    const [files, setFiles] = useState([]); // הוספת state עבור קבצים
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

    // פונקציה להעלאת קבצים מקומית בלבד
    const handleFileUpload = (selectedFiles) => {
      console.log("=== FILES SELECTED ===");
      console.log("Files received in handleFileUpload:", selectedFiles);
      console.log("Current files before adding:", files);

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

    // פונקציה למחיקת קובץ
    const handleRemoveFile = async (fileIndex) => {
      const fileToRemove = files[fileIndex];

      if (!fileToRemove) return;

      console.log("=== DELETING FILE ===");
      console.log("File to delete:", fileToRemove);

      try {
        // מסיר את הקובץ מהרשימה המקומית מיד
        const newFiles = files.filter((_, index) => index !== fileIndex);
        setFiles(newFiles);

        // אם הקובץ לא מקומי (יש לו URL אמיתי), מחק מקלאודינרי
        if (!fileToRemove.isLocal && fileToRemove.publicId) {
          try {
              console.log(
                      "Attempting to delete from Cloudinary. PublicId:",
                      fileToRemove.publicId,
                      "ResourceType:",
                      fileToRemove.resourceType // ודא שזה קיים ב-fileToRemove
                  );

            console.log("🔍 Type of URL to delete:", fileToRemove.url);
  // invoices
            // שלח בקשה למחיקה מקלאודינרי
            await api.delete("/invoices/upload/cloudinary", {
              data: {
                publicId: fileToRemove.publicId, // שלח את ה-publicId ששמור במונגו
                resourceType: fileToRemove.resourceType, // שלח את ה-resourceType ששמור במונגו
              },
            });

            console.log("File deleted from Cloudinary successfully");
            toast.success("הקובץ נמחק מהמערכת ומקלאודינרי", {
              className: "sonner-toast success rtl",
            });
          } catch (cloudinaryError) {
            console.error("Error deleting from Cloudinary:", cloudinaryError);
            toast.warning("הקובץ הוסר מהחשבונית אך לא נמחק מקלאודינרי", {
              className: "sonner-toast warning rtl",
            });
          }
        } else {
          // קובץ מקומי או בלי URL
          toast.success("הקובץ הוסר", {
            className: "sonner-toast success rtl",
          });
        }
      } catch (error) {
        console.error("Error in handleRemoveFile:", error);
        toast.error("שגיאה במחיקת הקובץ", {
          className: "sonner-toast error rtl",
        });
      }
    };

    // פונקציה לפתיחת קבצי Excel
    const openInExcelViewer = (fileUrl) => {
      const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
        fileUrl
      )}`;
      window.open(officeUrl, "_blank");
    };

    // פונקציה לרינדור קובץ
    const renderFile = (file) => {
      // אם זה קובץ מקומי, השתמש ב-tempUrl
      const fileUrl = file.isLocal ? file.tempUrl : file.url || file.fileUrl;
      const fileName = file.name || `קובץ`;

      if (!fileUrl) return null;

      // אם זה קובץ מקומי, הראה תצוגה מקדימה פשוטה
      if (file.isLocal) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">{fileName}</span>
            <span className="text-blue-500 font-bold">
              📁 {file.type.startsWith("image/") ? "תמונה" : "קובץ"} (יועלה
              בשמירה)
            </span>
          </div>
        );
      }

      // לקבצים שכבר קיימים - הצג כרגיל
      const fileExtension = fileUrl.split(".").pop().toLowerCase();

      if (fileExtension === "pdf") {
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">{fileName}</span>
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
            <span className="text-gray-600">{fileName}</span>
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
            <span className="text-gray-600">{fileName}</span>
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
            <span className="text-gray-600">{fileName}</span>
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
     // לפני הבדיקה, תדפיס את כל הערכים
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

if (!detail) {
  toast.error("חסרים פרטים");
  setLoading(false);
  return;
}

if (!paid) {
  toast.error("לא צוין אם החשבונית שולמה");
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
      

        // עיבוד קבצים: העלאת קבצים מקומיים חדשים
        let processedFiles = [];

        for (const file of files || []) {

          if (file.isLocal) {
            // העלה קובץ מקומי לקלאודינרי עכשיו
            try {

              const formData = new FormData();
              formData.append("file", file.file);
              formData.append("folder", "invoices");

              const uploadResponse = await api.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });

              // חילוץ נכון של ה-URL מהתגובה
              const fileUrl =
                uploadResponse.data.url ||
                uploadResponse.data.secure_url ||
                uploadResponse.data.file?.url ||
                uploadResponse.data.file?.secure_url ||
                uploadResponse.data.fileUrl;

              console.log("Extracted file URL:", fileUrl);

              if (!fileUrl) {
                throw new Error("No URL received from upload response");
              }

              processedFiles.push({
                name: file.name,
                url: fileUrl, // ⬅️ זה החשוב!
                type: file.type,
                size: file.size,
              });

              console.log("File uploaded successfully with URL:", fileUrl);
            } catch (uploadError) {
              console.error("Error uploading file:", uploadError);
              console.error("Upload response:", uploadError.response?.data);
              toast.error(`שגיאה בהעלאת ${file.name}`, {
                className: "sonner-toast error rtl",
              });
            }
          } else {
            // קובץ שכבר קיים - שמור כפי שהוא
            console.log("Keeping existing file:", file.name);
            processedFiles.push({
              _id: file._id || null,
              name: file.name,
              url: file.url || file.fileUrl,
              type: file.type,
              size: file.size,
              folder: file.folder || "invoices",
            });
          }
        }

        console.log("=== FINAL PROCESSED FILES ===");
        console.log("Processed files:", processedFiles);

        const formData = {
          invoiceNumber,
          sum: Number(sum),
          status,
          detail,
          invitingName,
          paid,
          files: processedFiles, // הקבצים המעובדים
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
    תאריך לתשלום :
  </label>
  {paid === "כן" ? (
    <>
      {/* הצג את התאריख הנוכחי אם קיים */}
      {paymentDate && paymentDate !== "אין תאריך לתשלום" && (
        <div className="bg-green-100 border border-green-300 rounded-md text-center p-2 text-black mb-2 w-44">
          תאריך קיים: {formatDate(paymentDate)}
        </div>
      )}
      
      {/* תמיד תן אפשרות לשנות/בחור תאריך */}
      <div className="flex flex-col">
        {(!paymentDate || paymentDate === "אין תאריך לתשלום") && (
          <h1 className="text-lg mb-3 text-red-600">
            " יש לבחור תאריך תשלום "
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

              {/* קטע העלאת קבצים */}
              <div className="mt-7">
                <label className="font-bold text-xl text-black mb-4 block">
                  קבצי חשבונית:
                </label>

                {/* LocalFileUploader component */}
                <div className="space-y-2">
                  <label className="block text-slate-700 font-semibold">
                    העלה קבצי חשבונית:
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => {
                      const selectedFiles = Array.from(event.target.files);
                      console.log("Files selected locally:", selectedFiles);

                      if (selectedFiles.length === 0) return;

                      // יצירת objects עם מידע נוסף
                      const filesWithPreview = selectedFiles.map(
                        (file, index) => ({
                          file: file, // הקובץ המקורי
                          name: file.name,
                          type: file.type,
                          size: file.size,
                          tempUrl: URL.createObjectURL(file), // URL זמני לתצוגה
                          isLocal: true, // סימן שזה קובץ מקומי
                          id: Date.now() + index, // ID זמני
                        })
                      );

                      handleFileUpload(filesWithPreview);
                    }}
                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <p className="text-sm text-gray-600">
                    הקבצים יועלו רק לאחר שמירת החשבונית
                  </p>
                </div>

                {/* Display uploaded files */}
                <div className="mt-6">
                  {files && files.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-black">
                        קבצים מועלים:
                      </h3>
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <p className="font-bold text-lg mr-2">
                              קובץ {index + 1}:
                            </p>
                            {renderFile(file)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 font-bold hover:text-red-700 transition-colors flex items-center gap-1"
                          >
                            ❌ הסר קובץ
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <p className="text-gray-700 bg-white w-44 p-2 mt-4 text-center text-lg rounded-2xl">
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
