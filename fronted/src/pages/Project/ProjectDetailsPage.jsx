import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import { PanelsTopLeft } from "lucide-react";
import { toast } from "sonner";

const ProjectDetailsPage = () => {
  const { id } = useParams(); // שליפת ה-ID מה-URL
  const [project, setProject] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  // const [sortBy, setSortBy] = useState('name');
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const response = await api.get(`/projects/${id}`);
        setProject(response.data);
        setLoadingProject(false);
      } catch (error) {
        console.error("Error fetching project details:", error);
        toast.error("שגיאה בשליפת פרטי הפרויקט", {
          className: "sonner-toast error rtl",
        });
        setLoadingProject(false);
      }
    };

    fetchProjectDetails();
  }, [id]); // תלות ב-ID, כך שכש-ID משתנה, הפונקציה תרוץ מחדש

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderResponse = await api.get("/orders");
        const invoiceResponse = await api.get("/invoices");

        setOrders(orderResponse.data);
        setInvoices(invoiceResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("שגיאה בטעינת הנתונים. נסה שנית מאוחר יותר.", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setLoadingOrders(false);
        setLoadingInvoices(false);
      }
    };

    fetchData();
  }, []);

  const filteredOrders = orders
    .filter((order) => order.projectId === project?._id) // סינון לפי ה-ID של הפרויקט
    .filter((order) => !statusFilter || order.status === statusFilter)
    .sort((a, b) => (sortOrder === "desc" ? b.sum - a.sum : a.sum - b.sum));

  const filteredInvoices = invoices
    .filter((invoice) => invoice.projectId === project?._id) // סינון לפי ה-ID של הפרויקט
    .filter((invoice) => !statusFilter || invoice.status === statusFilter)
    .sort((a, b) => (sortOrder === "desc" ? b.sum - a.sum : a.sum - b.sum));

  if (loadingProject || loadingInvoices || loadingOrders) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader
          size={100}
          color="#3498db"
          loading={loadingProject || loadingInvoices || loadingOrders}
        />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num?.toLocaleString(); // הוספת פסיקים במספרים גדולים מ-999
  };

  const formatDate = (dateString) => {
    if (!dateString) return "תאריך לא זמין";
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  function moveToInvoiceDetails(invoice) {
    navigate(`/invoice/${invoice._id}`);
  }

  function moveToOrderDetails(order) {
    navigate(`/order/${order._id}`);
  }

  const formatCurrencyWithAlert = (num) => {
    if (num === null || num === undefined) return "אין עדיין תקציב";

    const number = Number(num);
    if (isNaN(number)) return "₪ 0";

    if (number < 0) {
      return (
        <span className="text-l font-bold text-red-800" dir="ltr">
          ₪ -{Math.abs(number).toLocaleString("he-IL")}
        </span>
      );
    } else {
      return (
        <span className="text-l px-2 py-0" dir="ltr">
          ₪ {number.toLocaleString("he-IL")}
        </span>
      );
    }
  };
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/projects/${project._id}`); // או `/projects/${id}`
      toast.success("הפרוייקט נמחק בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate("/projects"); // נווט חזרה לרשימת הפרויקטים
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("שגיאה במחיקת הפרויקט", {
        className: "sonner-toast error rtl",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/update-project/${id}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center space-x-3 mb-8">
        <PanelsTopLeft className="text-sky-950 ml-4 mt-2 size-8" />
        <h1 className="text-4xl font-bold text-slate-700">פרטי פרויקט</h1>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(project._id);
        }}
        className="p-3 ml-2 bg-slate-400 text-black hover:bg-slate-600 hover:text-white rounded-full transition-colors duration-150"
      >
        עריכת פרוייקט
      </button>
      <button
        onClick={() => setConfirmOpen(true)}
        className="p-3 bg-red-400 text-black hover:bg-red-600 hover:text-white rounded-full transition-colors duration-150"
      >
        מחק פרויקט
      </button>

      <div className="flex justify-center items-center mt-14 mb-14">
        <div className="bg-slate-300 p-5 rounded-lg shadow-xl w-full max-w-4xl text-center">
          <div className="grid grid-cols-5 gap-4 text-lg text-black">
            <div className="border-l-2 border-gray-500 pl-4">
              <b className="text-lg block">שם הפרוייקט:</b>
              <span className="text-l">{project.name}</span>
            </div>

            <div className="border-l-2 border-gray-500 pl-4">
              <b className="text-lg block">איש קשר :</b>
              <span className="text-l">{project.Contact_person}</span>
            </div>

            <div className="border-l-2 border-gray-500 pl-4">
              <b className="text-lg block">תקציב:</b>
              <span className="text-l">
                {project.budget
                  ? formatCurrencyWithAlert(project.budget)
                  : "עדיין אין תקציב"}
              </span>
            </div>

            <div className="border-l-2 border-gray-500 pl-4">
              <b className="text-lg block">תקציב שנותר:</b>
              <td className="px-6 py-0.5">
                {formatCurrencyWithAlert(project.remainingBudget)}
              </td>
            </div>

            {console.log(project)}
            <div className=" border-gray-500 pl-4">
              <b className="text-lg block">שם הספק:</b>
              <span className="text-l">{project.supplierName}</span>
            </div>

            <div className=" border-gray-500 pl-4">
              <b className="text-lg block">סטטוס תשלום:</b>
              <span className="text-l">{project.paymentStatus}</span>
            </div>

            <div className=" border-gray-500 pl-4">
              <b className="text-lg block">חסר מסמך ?</b>
              <span className="text-l">{project.missingDocument}</span>
            </div>

            <div className=" border-gray-500 pl-4">
              <b className="text-lg block">נוצר בתאריך:</b>
              <span className="text-l">{formatDate(project.createdAt)}</span>
            </div>

            {/* <div className="border-l-2 border-gray-500 pl-4">
              <b className="text-lg block">שם הספק:</b>
              <span className="text-l">{project.invitingName}</span>
            </div> */}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-7 text-center">
          {" "}
          הזמנות של הפרוייקט
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-300 text-slate-800 text-l">
                <th className="px-6 py-4 text-right">מספר הזמנה</th>
                <th className="px-6 py-4 text-right">פרויקט</th>
                <th className="px-6 py-4 text-right">סכום</th>
                {/* <th className="px-6 py-4 text-right">שם המזמין</th> */}
                {/* <th className="px-6 py-4 text-right">תאריך</th> */}
                <th className="px-6 py-4 text-right">סטטוס</th>
                {/* <th className="px-6 py-4 text-right">פירוט</th> */}
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <div className="flex flex-col justify-center items-center h-64">
                  <ClipLoader size={100} color="#3498db" loading={loading} />
                  <h1 className="mt-4 font-bold text-2xl text-cyan-950">
                    טוען . . .
                  </h1>
                </div>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => moveToOrderDetails(order)}
                    className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                  >
                    <td className="px-6 py-4 font-bold">{order.orderNumber}</td>
                    <td className="px-6 py-4 font-bold">{order.projectName}</td>
                    <td className="px-6 py-4 font-bold">
                      {formatCurrencyWithAlert(order.sum)}
                    </td>
                    <td className="px-6 py-4 font-bold">{order.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    <p className="font-bold text-2xl text-red-500 mt-2 mb-2">
                      לא נמצאו הזמנות . . .
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">
          חשבוניות של הפרוייקט
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-300 text-slate-800 text-l">
                <th className="px-6 py-4 text-right">מספר חשבונית</th>
                <th className="px-6 py-4 text-right">פרויקט</th>
                <th className="px-6 py-4 text-right">סכום</th>
                {/* <th className="px-6 py-4 text-right">שם המזמין</th> */}
                {/* <th className="px-6 py-4 text-right">פירוט</th> */}
                {/* <th className="px-6 py-4 text-right">תאריך</th> */}
                <th className="px-6 py-4 text-right">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {loadingInvoices ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    <p className="font-bold text-xl text-cyan-500">
                      טוען . . .
                    </p>
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice._id}
                    className="cursor-pointer text-l border-t border-slate-200 hover:bg-slate-200 transition-colors duration-150 bg-slate-50"
                    onClick={() => moveToInvoiceDetails(invoice)}
                  >
                    <td className="px-6 py-4 font-bold">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {invoice.projectName}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {formatCurrencyWithAlert(invoice.sum)}
                    </td>
                    <td className="px-6 py-4 font-bold">{invoice.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center ">
                    <p className="font-bold text-2xl text-red-500 mt-2 mb-2">
                      לא נמצאו חשבוניות . . .
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4">
              <h3 className="text-3xl font-bold text-center mb-3">
                האם אתה בטוח?
              </h3>
              <p className="mt-1 text-l text-center">
                שים לב! פעולה זו תמחק את הפרויקט לצמיתות.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-l font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? "מוחק..." : "מחק פרויקט"}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-l font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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

export default ProjectDetailsPage;
