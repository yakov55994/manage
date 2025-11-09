import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api'; import { ClipLoader } from 'react-spinners';  // ייבוא של האנימציה החדשה
import { ShoppingCart } from "lucide-react";
import { toast } from 'sonner';

const OrderDetailsPage = () => {

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        const orderData = response.data;

        if (orderData.files && orderData.files.length > 0) {
          const fileDetails = await Promise.all(
            orderData.files.map(async (file) => {
              if (file && file._id) {
                // אם יש ID, שלח את הבקשה הרגילה
                // console.log("File ID:", file._id);
                const fileRes = await api.get(`/files/${file._id}`);
                return fileRes.data;
              } else {
                // אם אין ID, פשוט הצג את הקובץ (או טיפל בו אחרת)
                console.warn("File has no ID, using URL directly:", file.url);
                return file;  // החזר את הקובץ כפי שהוא (למשל, רק עם URL)
              }
            })
          );
          orderData.files = fileDetails;
        }

        setOrder(orderData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching order details:", error);
        setLoading(false);
      }
    };




    fetchInvoiceDetails();
  }, [id]);


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num ? num.toLocaleString() : "0";
  };

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  
  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;

    if (!fileUrl) return null;

    const fileExtension = fileUrl.split('.').pop().toLowerCase();

    if (fileExtension === 'pdf') {
      return (
        <div>
          {/* <embed src={fileUrl} type="application/pdf" width="100%" height="600px" /> */}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-bold mt-2">
            📂 צפה בקובץ בחלון חדש
          </a>
        </div>
      );
    }

    // בתוך ה-renderFile
    else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return (
        <div>
          <button
            onClick={() => openInExcelViewer(fileUrl)}
            className="block text-blue-500 font-bold mt-2"
          >
            📂 לצפייה בקובץ לחץ כאן

          </button>
        </div>
      );
    }
    else if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <div>
          {/* <img src={fileUrl} alt="Invoice File" className="w-full max-w-lg mx-auto rounded-lg shadow-md" /> */}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-bold mt-2">
            📂 צפה בקובץ בחלון חדש
          </a>
        </div>
      );
    } else {
      return (
        <div>
          {/* <iframe src={fileUrl} className="w-full max-w-lg h-96 mx-auto" title="Document Preview"></iframe> */}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-bold mt-2">
            📂 צפה בקובץ בחלון חדש
          </a>
        </div>
      );
    }
  };


    const handleEdit = (id) => {
    navigate(`/update-order/${id}`);
  };

 const handleDelete = async () => {
    try {
      if (!order?._id) return;
      setDeleting(true);
      await api.delete(`/orders/${order._id}`); // ודא שהראוט שלך הוא /invoices/:id
      toast.success("ההזמנה נמחקה בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate("/orders");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("שגיאה במחיקת ההזמנה", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

    if (!order) {
    return (
      <div className="flex justify-center items-center h-64">
        <h1 className="text-2xl font-bold text-red-600">הזמנה לא נמצאה</h1>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-center space-x-3 mb-8">
        <ShoppingCart className="text-sky-950 ml-4 mt-2 size-8" />
        <h1 className="text-4xl font-bold text-black">פרטי הזמנה</h1>
      </div>

       <button
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(order._id);
        }}
        className="ml-2 p-3 bg-slate-400 text-black hover:bg-slate-600 hover:text-white  rounded-full transition-colors duration-150"
      >
        עריכת הזמנה
      </button>

   <button
        onClick={() => setConfirmOpen(true)}
        className="p-3 bg-red-400 text-black hover:bg-red-600 hover:text-white rounded-full transition-colors duration-150"
      >
        מחק הזמנה
      </button>
      <div className="flex justify-center items-center mt-14 mb-14">
        <div className="bg-slate-300 p-5 rounded-lg shadow-xl w-full max-w-4xl">
          <div key={order._id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xl text-black text-center">
            
             <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">שם המזמין:</b>
              <span className="text-lg">{order.invitingName}</span>
            </div>
            
            
            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">מספר הזמנה:</b>
              <span className="text-lg">{order.orderNumber}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">סכום:</b>
              <span className="text-lg">{formatNumber(order.sum)} ₪</span>
            </div>

           <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">פירוט:</b>
              <span className="text-lg">{order.detail}</span>
            </div>

             <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">פרוייקט:</b>
              <span className="text-lg">{order.projectName}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">תאריך יצירת הזמנה:</b>
              <span className="text-lg">{formatHebrewDate(order.createdAt)}</span>
            </div>

            {/* <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">תאריך תשלום:</b>
              <span className="text-lg">{order.paymentDate ? formatHebrewDate(order.paymentDate) : "לא שולם"}</span>
            </div> */}

           

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">סטטוס הזמנה:</b>
              <span className="text-lg">{order.status}</span>
            </div>

            <div className="border-l-2 border-amber-600 pl-4">
              <b className="text-xl block">איש קשר:</b>
              <span className="text-lg">{order.Contact_person}</span>
            </div>

       
           
            <div className="col-span-3">
              <div className="col-span-3">
                {order.files && order.files.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {order.files.map((file, index) => (
                      <div key={index} className="text-center flex items-center justify-center ">
                        {/* הצגת מספר הקובץ מצד שמאל */}
                        <p className="font-bold text-xl mr-2 ml-5  ">קובץ {index + 1} :</p>
                        {/* הצגת הקובץ מצד ימין */}
                        {renderFile(file)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <p className="text-gray-700 bg-white w-44 p-2 mt-10 text-center text-xl rounded-2xl">אין קבצים להצגה</p>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
      </div>
 {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              <h3 className="text-2xl font-bold text-center mb-2">
                האם למחוק את ההזמנה?
              </h3>
              <p className="text-center">הפעולה בלתי הפיכה.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? "מוחק..." : "מחק הזמנה"}
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
    </div>
  );

};

export default OrderDetailsPage;
