import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";

import {
    ShoppingCart,
    Edit2,
    Trash2,
    AlertCircle,
    User,
    Hash,
    DollarSign,
    Calendar,
    FileText,
    Building2,
    CheckCircle2,
    ArrowRight,
    ExternalLink,
    Paperclip,
    Phone,
    Briefcase,
    GraduationCap,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";

const OrderDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { user, canViewOrders, canEditOrders, isAdmin } = useAuth();

    // טוען הזמנה
    useEffect(() => {
        const loadOrder = async () => {
            try {
                const res = await api.get(`/orders/${id}`);
                const data = res.data?.data;

                if (!data) {
                    setLoading(false);
                    return;
                }

                // בדיקת הרשאות
                const projectId = typeof data.projectId === 'object' ? data.projectId._id : data.projectId;
                if (!canViewOrders(projectId)) {
                    toast.error("אין לך הרשאה לצפות בהזמנה זו");
                    navigate("/orders");
                    return;
                }

                // עיבוד קבצים
                const normalizeFiles = (filesArray) => {
                    return (filesArray || []).map((file, i) => ({
                        ...file,
                        name: file.name || file.originalName || `קובץ ${i + 1}`,
                        url: file.url || file.fileUrl || file.secure_url,
                    }));
                }

                data.files = normalizeFiles(data.files);
                data.invoiceFiles = normalizeFiles(data.invoiceFiles);
                data.receiptFiles = normalizeFiles(data.receiptFiles);

                setOrder(data);
            } catch (err) {
                console.error(err);
                toast.error("שגיאה בטעינת ההזמנה");
            } finally {
                setLoading(false);
            }
        };

        loadOrder();
    }, [id, user, canViewOrders, navigate]);

    const formatDate = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString("he-IL");
    };

    const handleDelete = async () => {
        if (!order?._id) return;

        try {
            setDeleting(true);
            await api.delete(`/orders/${order._id}`);
            toast.success("ההזמנה נמחקה בהצלחה");
            navigate("/orders");
        } catch (err) {
            toast.error("שגיאה במחיקה");
        } finally {
            setDeleting(false);
            setConfirmOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-orange-50">
                <ClipLoader size={90} color="#f97316" />
                <h1 className="mt-6 text-2xl font-bold">טוען הזמנה...</h1>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-orange-50">
                <AlertCircle className="w-20 h-20 text-red-500" />
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">הזמנה לא נמצאה</h1>
                <button
                    onClick={() => navigate("/orders")}
                    className="mt-6 px-6 py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-800"
                >
                    חזור לרשימה
                </button>
            </div>
        );
    }

    const projectId = typeof order.projectId === 'object' ? order.projectId._id : order.projectId;
    const userCanEdit = canEditOrders(projectId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6">
                {/* HEADER */}
                <header className="mb-4 sm:mb-5 md:mb-6 sm:mb-8 md:mb-10">
                    <div className="relative">
                        <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-5 blur-xl"></div>

                        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-white/50">
                            <div className="flex flex-col items-center">
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                                    <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                                </div>

                                <h1 className="text-2xl sm:text-xl sm:text-2xl md:text-3xl md:text-4xl font-black mt-4 text-slate-900 flex items-center gap-3">
                                    <span>הזמנה #{order.orderNumber}</span>
                                </h1>
                                <p className="text-slate-600 mt-2">פרויקט: {order.projectName}</p>

                                <div className="flex gap-3 sm:gap-4 mt-6">
                                    <button
                                        onClick={() => navigate("/orders")}
                                        className="px-6 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold"
                                    >
                                        <ArrowRight className="inline-block w-4 h-4 ml-1" />
                                        חזרה
                                    </button>

                                    {userCanEdit && (
                                        <button
                                            onClick={() => navigate(`/update-order/${order._id}`)}
                                            className="px-6 py-3 rounded-xl bg-orange-600 text-white font-bold shadow"
                                        >
                                            <Edit2 className="inline-block w-4 h-4 ml-1" />
                                            עריכה
                                        </button>
                                    )}

                                    {isAdmin && (
                                        <button
                                            onClick={() => setConfirmOpen(true)}
                                            className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold shadow"
                                        >
                                            <Trash2 className="inline-block w-4 h-4 ml-1" />
                                            מחיקה
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* DETAILS */}
                <div className="bg-white/90 shadow-lg rounded-2xl sm:rounded-3xl p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 border border-orange-100">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-green-600" />
                            סכום כולל:{" "}
                            <span className="text-green-700">
                                {Number(order?.sum || 0).toLocaleString()} ₪
                            </span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:p-5 md:p-6 mb-8">
                        <DetailCard
                            label="פרויקט"
                            icon={<Briefcase />}
                            value={order.projectName || "—"}
                        />
                        <DetailCard
                            label="ספק"
                            icon={<User />}
                            value={order.supplierId?.name || "לא הוזן"}
                        />
                        <DetailCard
                            label="שם מזמין"
                            icon={<User />}
                            value={order.invitingName || "—"}
                        />
                        <DetailCard
                            label="איש קשר"
                            icon={<Phone />}
                            value={order.Contact_person || "—"}
                        />
                        <DetailCard
                            label="תאריך יצירה"
                            icon={<Calendar />}
                            value={formatDate(order.createdAt)}
                        />
                        <DetailCard
                            label="סטטוס הגשה"
                            icon={<CheckCircle2 />}
                            value={order.status || "—"}
                        />
                        {order.status === 'הוגש חלקי' && (
                            <DetailCard
                                label="סכום שהוגש"
                                icon={<DollarSign />}
                                value={`${Number(order?.submittedAmount || 0).toLocaleString()} ₪`}
                            />
                        )}
                        {order.status !== 'לא הוגש' && order.submittedDate && (
                            <DetailCard
                                label="תאריך הגשה"
                                icon={<Calendar />}
                                value={formatDate(order.submittedDate)}
                            />
                        )}
                        <DetailCard
                            label="פירוט"
                            icon={<FileText />}
                            value={order.detail || "—"}
                            fullWidth={true}
                        />
                    </div>

                    {/* Financial Documents */}
                    <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            מסמכים פיננסיים
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailCard
                                label="מספר חשבונית"
                                icon={<Hash />}
                                value={order.invoiceNumber || "—"}
                            />
                            <DetailCard
                                label="תאריך חשבונית"
                                icon={<Calendar />}
                                value={formatDate(order.invoiceDate)}
                            />
                            <DetailCard
                                label="מספר קבלה"
                                icon={<Hash />}
                                value={order.receiptNumber || "—"}
                            />
                            <DetailCard
                                label="תאריך קבלה"
                                icon={<Calendar />}
                                value={formatDate(order.receiptDate)}
                            />
                            <DetailCard
                                label="ההזמנה זוכתה"
                                icon={<CheckCircle2 />}
                                value={order.isCredited ? `כן (${formatDate(order.creditDate)})` : 'לא'}
                            />
                        </div>

                        {/* מילגה */}
                        {order.isScholarship && (
                            <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-purple-100">
                                        <GraduationCap className="w-5 h-5 text-purple-700" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-purple-900 mb-1">חשבונית מילגה</p>
                                        {order.scholarshipProjectId && (
                                            <p className="text-sm text-slate-700">
                                                <span className="font-semibold">פרויקט: </span>
                                                {order.scholarshipProjectId === 'scholarship'
                                                    ? 'מילגה'
                                                    : (typeof order.scholarshipProjectId === 'object'
                                                        ? order.scholarshipProjectId.name
                                                        : order.scholarshipProjectId)
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FILES */}
                    <div className="space-y-8">
                        <FileSection title="קבצי הזמנה" files={order.files} icon={<Paperclip className="w-6 h-6 text-orange-600" />} />
                        <FileSection title="קבצי חשבונית" files={order.invoiceFiles} icon={<FileText className="w-6 h-6 text-blue-600" />} />
                        <FileSection title="קבצי קבלה" files={order.receiptFiles} icon={<FileText className="w-6 h-6 text-green-600" />} />
                    </div>
                </div>

                {/* DELETE MODAL */}
                {confirmOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full">
                            <h3 className="text-2xl font-bold text-center mb-4">
                                למחוק הזמנה?
                            </h3>
                            <p className="text-center text-slate-700 mb-4 sm:mb-5 md:mb-6">
                                פעולה זו בלתי הפיכה.
                            </p>

                            <div className="flex gap-3 sm:gap-4">
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold"
                                >
                                    {deleting ? "מוחק..." : "מחק"}
                                </button>

                                <button
                                    onClick={() => setConfirmOpen(false)}
                                    className="flex-1 bg-slate-200 py-3 rounded-xl font-bold"
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailCard = ({ label, value, icon, fullWidth = false }) => (
    <div className={`p-4 bg-orange-50 border-2 border-orange-200 rounded-xl ${fullWidth ? 'md:col-span-2' : ''}`}>
        <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-orange-100">{icon}</div>
            <div className="flex-1">
                <p className="text-xs font-bold text-orange-600">{label}</p>
                <p className="font-bold text-slate-900 whitespace-pre-wrap">{value}</p>
            </div>
        </div>
    </div>
);

const FileSection = ({ title, files, icon }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                {icon}
                {title}
            </h2>
            {(!files || files.length === 0) ? (
                <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-xl text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-slate-600 font-medium">אין קבצים</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {files.map((file, idx) => (
                        <FileItem key={idx} file={file} />
                    ))}
                </div>
            )}
        </div>
    );
}

const FileItem = ({ file }) => {
    const url = file.url;
    const name = file.name;

    return (
        <div className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-slate-600 flex-shrink-0" />
                <span className="font-medium truncate">{name}</span>
            </div>

            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-bold flex items-center gap-2 flex-shrink-0"
            >
                <ExternalLink className="w-4 h-4" />
                פתח
            </a>
        </div>
    );
};

export default OrderDetailsPage;