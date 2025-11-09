import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MoveInvoiceModal from "../../components/MoveInvoiceModal"; // נתיב בהתאם

// import * as XLSX from "xlsx";
import { toast } from "sonner";

const InvoiceDetailsPage = () => {
  console.log("🚀 InvoiceDetailsPage component loaded!"); // הוסף את זה

  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moveModal, setMoveModal] = useState(false);


  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    console.log("InvoiceDetailsPage useEffect started with ID:", id);

    const fetchInvoiceDetails = async () => {
      console.log("Starting to fetch invoice details...");

      try {
        console.log("Making API call to /invoices/" + id);
        const response = await api.get(`/invoices/${id}`);
        const invoiceData = response.data;

        console.log("Invoice data received:", invoiceData); // לוג לדיבוג
        console.log("Files in invoice data:", invoiceData.files);

        if (!invoiceData) {
          console.log("No invoice data received");
          setLoading(false);
          return;
        }

        // אם יש קבצים, נטפל בהם
        if (invoiceData.files && invoiceData.files.length > 0) {
          console.log("Files found:", invoiceData.files); // לוג לדיבוג
          console.log("Number of files:", invoiceData.files.length);

          // נבדוק אם הקבצים כבר מכילים את כל הנתונים הנחוצים
          const processedFiles = [];

          for (let i = 0; i < invoiceData.files.length; i++) {
            const file = invoiceData.files[i];
            console.log(`Processing file ${i + 1}:`, file);

            try {
              // אם הקובץ כבר מכיל URL, נשתמש בו כפי שהוא
              if (file && (file.url || file.fileUrl || file.secure_url)) {
                console.log(`File ${i + 1} already has URL, using as is`);
                processedFiles.push({
                  ...file,
                  url: file.url || file.fileUrl || file.secure_url,
                  name:
                    file.name ||
                    file.originalName ||
                    file.filename ||
                    `קובץ ${i + 1}`,
                });
                continue;
              }

              // אם יש ID, נשלח בקשה לשרת
              if (file && file._id) {
                console.log(
                  `Fetching details for file ${i + 1} with ID: ${file._id}`
                );
                const fileRes = await api.get(`/files/${file._id}`);
                console.log(`File ${i + 1} details received:`, fileRes.data);
                if (fileRes.data) {
                  processedFiles.push({
                    ...fileRes.data,
                    name:
                      fileRes.data.name ||
                      fileRes.data.originalName ||
                      fileRes.data.filename ||
                      `קובץ ${i + 1}`,
                  });
                }
              } else {
                console.log(`File ${i + 1} has no ID or URL, adding anyway`);
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
              console.error(`Error fetching file ${i + 1}:`, fileError);
              // גם אם יש שגיאה, ננסה להציג את הקובץ אם יש לו מידע בסיסי
              if (file) {
                processedFiles.push({
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

          console.log("All processed files:", processedFiles);
          console.log("Total files processed:", processedFiles.length);
          invoiceData.files = processedFiles;
        } else {
          console.log("No files found in invoice data or files array is empty");
          invoiceData.files = [];
        }

        console.log("Setting invoice data:", invoiceData);
        setInvoice(invoiceData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching invoice details:", error);
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoiceDetails();
    } else {
      console.log("No ID provided, skipping fetch");
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
      </div>
    );
  }

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file, index) => {
    console.log(`Rendering file ${index + 1}:`, file); // לוג לדיבוג

    const fileUrl = file?.url || file?.fileUrl;
    const fileName = file?.name || `קובץ ${index + 1}`;

    if (!fileUrl) {
      console.log(`No URL found for file ${index + 1}`);
      return <div className="text-red-500">שגיאה: לא נמצא קישור לקובץ</div>;
    }

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

  const handleEdit = (id) => {
    navigate(`/update-invoice/${id}`);
  };

  const handleDelete = async () => {
    try {
      if (!invoice?._id) return;
      setDeleting(true);
      await api.delete(`/invoices/${invoice._id}`); // ודא שהראוט שלך הוא /invoices/:id
      toast.success("החשבונית נמחקה בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("שגיאה במחיקת החשבונית", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (!invoice) {
    return (
      <div className="flex justify-center items-center h-64">
        <h1 className="text-2xl font-bold text-red-600">חשבונית לא נמצאה</h1>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-center space-x-3 mb-8">
        <FileText className="text-sky-950 ml-4 mt-2 size-8" />
        <h1 className="text-4xl font-bold text-black">פרטי חשבונית</h1>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(invoice._id);
        }}
        className="ml-2 p-3 bg-slate-400 text-black hover:bg-slate-600 hover:text-white  rounded-full transition-colors duration-150"
      >
        ערוך חשבונית
      </button>

      <button
        onClick={() => setConfirmOpen(true)}
        className="p-3 bg-red-400 text-black hover:bg-red-600 hover:text-white rounded-full transition-colors duration-150"
      >
        מחק חשבונית
      </button>

      <button
  onClick={(e) => {
    e.stopPropagation();
    setMoveModal(true);
  }}
  className="mr-3 p-3 bg-slate-400 text-black hover:bg-slate-600 hover:text-white rounded-full transition-colors duration-150"
>
  העבר לפרויקט
</button>


      <div className="flex justify-center items-center text-center mt-14 mb-14">
        <div className="bg-slate-300 p-5 rounded-lg shadow-xl w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xl text-black">
            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">שם הספק:</b>
              <span className="text-l">{invoice.invitingName}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">מספר חשבונית:</b>
              <span className="text-l">{invoice.invoiceNumber}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">סכום:</b>
              <span className="text-l">{formatNumber(invoice.sum)} ₪</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">תאריך חשבונית:</b>
              <span className="text-l">
                {formatHebrewDate(invoice.createdAt)}
              </span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">פירוט:</b>
              <span className="text-l">
                {invoice.detail || "לא הוזן פירוט"}
              </span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">פרוייקט:</b>
              <span className="text-l">{invoice.projectName}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">סטטוס חשבונית:</b>
              <span className="text-l">{invoice.status}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">תאריך התשלום:</b>
              <span className="text-l">
                {invoice.paymentDate
                  ? formatHebrewDate(invoice.paymentDate)
                  : "לא שולם"}
              </span>
            </div>
            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">סוג מסמך:</b>
              <span className="text-l">
                {invoice.documentType || "לא הוזן"}
              </span>
            </div>
         
            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">צורת תשלום:</b>
              <span className="text-l">
                {invoice.paymentMethod === "check" ? "צ'יק" : invoice.paymentMethod === "bank_transfer" ? "העברה בנקאית" : "לא הוגדר"}
              </span>
            </div>

            {/* קטע הצגת הקבצים */}
            <div className="col-span-3 border-l-2 border-amber-600 pl-4">
              <b className="text-xl block mb-4">קבצים מצורפים:</b>
              {invoice.files && invoice.files.length > 0 ? (
                <div className="space-y-3">
                  {invoice.files.map((file, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800">
                          קובץ {index + 1}:
                        </span>
                        <div className="flex-1 mr-4">
                          {renderFile(file, index)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 text-sm text-gray-600 text-center">
                    סה"כ {invoice.files.length} קבצים
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg text-center">
                  <p className="text-gray-500 text-lg">אין קבצים מצורפים</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              <h3 className="text-2xl font-bold text-center mb-2">
                האם למחוק את החשבונית?
              </h3>
              <p className="text-center">הפעולה בלתי הפיכה.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? "מוחק..." : "מחק חשבונית"}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      <MoveInvoiceModal
  open={moveModal}
  onClose={() => setMoveModal(false)}
  invoice={invoice}
  onMoved={(updated) => {
    // עדכון מצב עמוד פרטים
    setInvoice(updated);
  }}
/>

    </div>
  );
};

export default InvoiceDetailsPage;
