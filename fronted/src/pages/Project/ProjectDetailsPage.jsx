import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import {
  Building2,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
  User,
  DollarSign,
  Calendar,
  FileText,
  Receipt,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Package,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

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
  }, [id]);

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
    .filter((order) => order.projectId === project?._id)
    .filter((order) => !statusFilter || order.status === statusFilter)
    .sort((a, b) => (sortOrder === "desc" ? b.sum - a.sum : a.sum - b.sum));

  const filteredInvoices = invoices
    .filter((invoice) => invoice.projectId === project?._id)
    .filter((invoice) => !statusFilter || invoice.status === statusFilter)
    .sort((a, b) => (sortOrder === "desc" ? b.sum - a.sum : a.sum - b.sum));

  if (loadingProject || loadingInvoices || loadingOrders) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">
          טוען פרטי פרויקט...
        </h1>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num?.toLocaleString();
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
    navigate(`/invoices/${invoice._id}`);
  }

  function moveToOrderDetails(order) {
    navigate(`/orders/${order._id}`);
  }

  const formatCurrencyWithAlert = (num) => {
    if (num === null || num === undefined) return "אין עדיין תקציב";

    const number = Number(num);
    if (isNaN(number)) return "₪ 0";

    if (number < 0) {
      return (
        <span className="text-sm font-bold text-red-600 flex items-center gap-1" dir="ltr">
          <AlertCircle className="w-4 h-4" />
          ₪ -{Math.abs(number).toLocaleString("he-IL")}
        </span>
      );
    } else {
      return (
        <span className="text-sm font-bold text-emerald-600" dir="ltr">
          ₪ {number.toLocaleString("he-IL")}
        </span>
      );
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/projects/${project._id}`);
      toast.success("הפרוייקט נמחק בהצלחה", {
        className: "sonner-toast success rtl",
      });
      navigate("/projects");
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">פרטי פרויקט</h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      {project.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/projects")}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לרשימה</span>
                </button>
                <button
                  onClick={() => handleEdit(project._id)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>עריכת פרויקט</span>
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl shadow-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>מחק פרויקט</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Project Details Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {/* Section Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">פרטי הפרויקט</h2>
                </div>
              </div>
            </div>

            {/* Project Info Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Project Name */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Building2 className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        שם הפרויקט
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Person */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        איש קשר
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project.Contact_person || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Budget */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <DollarSign className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תקציב
                      </p>
                      <div className="text-sm font-bold text-slate-900">
                        {project.budget
                          ? formatCurrencyWithAlert(project.budget)
                          : "עדיין אין תקציב"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remaining Budget */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        תקציב שנותר
                      </p>
                      <div className="font-bold">
                        {formatCurrencyWithAlert(project.remainingBudget)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Name */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        שם הספק
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project.supplierName || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Receipt className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        סטטוס תשלום
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project.paymentStatus || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Missing Document */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        חסר מסמך?
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {project.missingDocument || "לא הוזן"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Created Date */}
                <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-orange-600 mb-1">
                        נוצר בתאריך
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatDate(project.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    הזמנות של הפרויקט
                  </h2>
                  <span className="mr-auto px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                    {filteredOrders.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingOrders ? (
                <div className="flex items-center gap-3 text-slate-700 justify-center py-8">
                  <ClipLoader size={26} color="#3b82f6" />
                  <span>טוען הזמנות…</span>
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border-2 border-blue-200">
                  <table className="min-w-full text-right">
                    <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-blue-900">
                          מספר הזמנה
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-blue-900">
                          פרויקט
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-blue-900">
                          סכום
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-blue-900">
                          סטטוס
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredOrders.map((order) => (
                        <tr
                          key={order._id}
                          onClick={() => moveToOrderDetails(order)}
                          className="cursor-pointer border-t border-blue-100 hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-bold">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            {order.projectName}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrencyWithAlert(order.sum)}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            {order.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-lg">לא נמצאו הזמנות</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-500/10 border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    חשבוניות של הפרויקט
                  </h2>
                  <span className="mr-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                    {filteredInvoices.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingInvoices ? (
                <div className="flex items-center gap-3 text-slate-700 justify-center py-8">
                  <ClipLoader size={26} color="#10b981" />
                  <span>טוען חשבוניות…</span>
                </div>
              ) : filteredInvoices.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border-2 border-emerald-200">
                  <table className="min-w-full text-right">
                    <thead className="bg-gradient-to-r from-emerald-100 to-teal-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-emerald-900">
                          מספר חשבונית
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-emerald-900">
                          פרויקט
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-emerald-900">
                          סכום
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-emerald-900">
                          סטטוס
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredInvoices.map((invoice) => (
                        <tr
                          key={invoice._id}
                          onClick={() => moveToInvoiceDetails(invoice)}
                          className="cursor-pointer border-t border-emerald-100 hover:bg-emerald-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-bold">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            {invoice.projectName}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrencyWithAlert(invoice.sum)}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            {invoice.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-lg">לא נמצאו חשבוניות</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את הפרויקט לצמיתות.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg disabled:opacity-60"
                  >
                    {deleting ? "מוחק..." : "מחק"}
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;