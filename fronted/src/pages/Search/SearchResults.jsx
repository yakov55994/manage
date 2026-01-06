import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/api.js";
import { useNavigate } from "react-router-dom";
import { Search, Package, FileText, ShoppingCart, Truck } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState({
    projects: [],
    invoices: [],
    orders: [],
    suppliers: [],
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({
    projects: false,
    invoices: false,
    orders: false,
    suppliers: false,
  });
  const query = searchParams.get("query");
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      setLoading(true);
      setErrors({
        projects: false,
        invoices: false,
        orders: false,
        suppliers: false,
      });

      // ביצוע חיפושים נפרדים עם טיפול בשגיאות לכל אחד
      const searchProjects = api
        .get(`/projects/search?query=${encodeURIComponent(query)}`)
        .then((response) => response.data.projects || response.data || [])
        .catch((error) => {
          console.error("Error fetching projects:", error);
          setErrors((prev) => ({ ...prev, projects: true }));
          return [];
        });

      const searchInvoices = api
        .get(`/invoices/search?query=${encodeURIComponent(query)}`)
        .then((res) => res.data.data || [])
        .catch((err) => {
          console.error("Error fetching invoices:", err);
          setErrors((prev) => ({ ...prev, invoices: true }));
          return [];
        });

      const searchOrders = api
        .get(`/orders/search?query=${encodeURIComponent(query)}`)
        .then((response) => response.data.orders || response.data || [])
        .catch((error) => {
          console.error("Error fetching orders:", error);
          setErrors((prev) => ({ ...prev, orders: true }));
          return [];
        });

      const searchSuppliers = api
        .get(`/suppliers/search?query=${encodeURIComponent(query)}`)
        .then((response) => response.data.suppliers || response.data || [])
        .catch((error) => {
          console.error("Error fetching suppliers:", error);
          setErrors((prev) => ({ ...prev, suppliers: true }));
          return [];
        });

      // המתנה לכל החיפושים
      Promise.allSettled([
        searchProjects,
        searchInvoices,
        searchOrders,
        searchSuppliers,
      ])
        .then(
          ([projectsResult, invoicesResult, ordersResult, suppliersResult]) => {
            setResults({
              projects:
                projectsResult.status === "fulfilled"
                  ? projectsResult.value
                  : [],
              invoices:
                invoicesResult.status === "fulfilled"
                  ? invoicesResult.value
                  : [],
              orders:
                ordersResult.status === "fulfilled" ? ordersResult.value : [],
              suppliers:
                suppliersResult.status === "fulfilled"
                  ? suppliersResult.value
                  : [],
            });
          }
        )
        .finally(() => {
          setLoading(false);
        });
    }
  }, [query]);

  if (!query) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="text-center p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 bg-white rounded-2xl shadow-xl">
          <Search className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-xl text-slate-600">נא להזין מילה לחיפוש</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => (num ? num.toLocaleString("he-IL") : "0");

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const ResultCard = ({ item, type, onClick }) => {
    const getGradient = () => {
      switch (type) {
        case "project":
          return "from-blue-500 to-cyan-500";
        case "invoice":
          return "from-purple-500 to-pink-500";
        case "order":
          return "from-amber-500 to-orange-500";
        case "supplier":
          return "from-green-500 to-emerald-500";
        default:
          return "from-gray-500 to-slate-500";
      }
    };

    const getIcon = () => {
      switch (type) {
        case "project":
          return <Package className="w-6 h-6" />;
        case "invoice":
          return <FileText className="w-6 h-6" />;
        case "order":
          return <ShoppingCart className="w-6 h-6" />;
        case "supplier":
          return <Truck className="w-6 h-6" />;
        default:
          return null;
      }
    };

    return (
      <div
        onClick={onClick}
        className={`bg-gradient-to-r ${getGradient()} p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 text-white w-full md:w-80 mx-2 mb-4`}
      >
        <div className="flex items-center justify-between mb-4">
          {getIcon()}
          <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
            {type === "project"
              ? "פרוייקט"
              : type === "invoice"
              ? "חשבונית"
              : type === "order"
              ? "הזמנה"
              : "ספק"}
          </div>
        </div>

        <div className="space-y-2">
          {type === "project" && (
            <>
              <h3 className="text-xl font-bold truncate">
                {item.name || "לא זמין"}
              </h3>
              <p className="text-white/90">
                תקציב:{" "}
                {item.budget ? `₪${formatNumber(item.budget)}` : "לא הוגדר"}
              </p>
              <p className="text-white/80 text-sm">
                מזמין: {item.invitingName || "לא זמין"}
              </p>
              {item.createdAt && (
                <p className="text-white/70 text-sm">
                  נוצר: {formatDate(item.createdAt)}
                </p>
              )}
            </>
          )}
          {type === "invoice" && (
            <>
              <h3 className="text-xl font-bold">
                חשבונית מס׳ {item.invoiceNumber || "לא זמין"}
              </h3>
              <p className="text-white/90">
                סכום: {item.sum ? `₪${formatNumber(item.sum)}` : "לא זמין"}
              </p>
              <p className="text-white/80 text-sm truncate">
                פרוייקט: {item.projectName || "לא זמין"}
              </p>
              <p className="text-white/80 text-sm">
                סטטוס: {item.status || "לא זמין"}
              </p>
              {item.paid && (
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    item.paid === "כן"
                      ? "bg-green-500/20 text-green-100"
                      : "bg-red-500/20 text-red-100"
                  }`}
                >
                  {item.paid === "כן" ? "שולם" : "לא שולם"}
                </span>
              )}
            </>
          )}
          {type === "order" && (
            <>
              <h3 className="text-xl font-bold">
                הזמנה מס׳ {item.orderNumber || "לא זמין"}
              </h3>
              <p className="text-white/90">
                סכום: {item.sum ? `₪${formatNumber(item.sum)}` : "לא זמין"}
              </p>
              <p className="text-white/80 text-sm truncate">
                פרוייקט: {item.projectName || "לא זמין"}
              </p>
              <p className="text-white/80 text-sm">
                סטטוס: {item.status || "לא זמין"}
              </p>
              {item.invitingName && (
                <p className="text-white/70 text-sm">
                  מזמין: {item.invitingName}
                </p>
              )}
            </>
          )}
          {type === "supplier" && (
            <>
              <h3 className="text-xl font-bold truncate">
                {item.name || item.companyName || "ספק"}
              </h3>
              <p className="text-white/90">
                ח.פ/ע.מ: {item.business_tax || item.taxId || "לא זמין"}
              </p>
              <p className="text-white/80 text-sm">
                טלפון: {item.phone || "לא זמין"}
              </p>
              <p className="text-white/80 text-sm truncate">
                כתובת: {item.address || "לא זמין"}
              </p>
              {item.email && (
                <p className="text-white/70 text-sm truncate">
                  אימייל: {item.email}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const ErrorMessage = ({ type, error }) => {
    if (!error) return null;

    const getTypeLabel = () => {
      switch (type) {
        case "projects":
          return "פרויקטים";
        case "invoices":
          return "חשבוניות";
        case "orders":
          return "הזמנות";
        case "suppliers":
          return "ספקים";
        default:
          return "";
      }
    };

    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
        <p className="text-sm">⚠️ שגיאה בחיפוש {getTypeLabel()}</p>
      </div>
    );
  };

  const renderResults = () => {
    const { projects, invoices, orders, suppliers } = results;

    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center h-64">
          <ClipLoader size={100} color="#3498db" loading={loading} />
          <h1 className="mt-4 font-bold text-2xl text-cyan-950">
            טוען תוצאות חיפוש...
          </h1>
        </div>
      );
    }

    const totalResults =
      projects.length + invoices.length + orders.length + suppliers.length;
    const hasErrors =
      errors.projects || errors.invoices || errors.orders || errors.suppliers;

    if (totalResults === 0 && !hasErrors) {
      return (
        <div className="text-center p-4 sm:p-4 sm:p-5 md:p-6 md:p-8 bg-white rounded-2xl shadow-xl">
          <Search className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-xl text-slate-600 mb-2">
            לא נמצאו תוצאות עבור "{query}"
          </p>
          <p className="text-sm text-slate-400">
            נסה לחפש במילים אחרות או בדוק את האיות
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* הצגת הודעות שגיאה */}
        <ErrorMessage type="projects" error={errors.projects} />
        <ErrorMessage type="invoices" error={errors.invoices} />
        <ErrorMessage type="orders" error={errors.orders} />
        <ErrorMessage type="suppliers" error={errors.suppliers} />

        {/* סיכום תוצאות */}
        {totalResults > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:mb-5 md:mb-6">
            <p className="text-blue-800 font-medium">
              נמצאו {totalResults} תוצאות: {projects.length} פרויקטים,{" "}
              {invoices.length} חשבוניות, {orders.length} הזמנות,{" "}
              {suppliers.length} ספקים
            </p>
          </div>
        )}

        {/* תוצאות פרויקטים */}
        {projects.length > 0 && (
          <section className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4 sm:mb-5 md:mb-6 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-500" />
              <span>פרוייקטים ({projects.length})</span>
            </h2>
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-start">
              {projects.map((project) => (
                <ResultCard
                  key={project._id}
                  item={project}
                  type="project"
                  onClick={() => navigate(`/projects/${project._id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* תוצאות חשבוניות */}
        {invoices.length > 0 && (
          <section className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4 sm:mb-5 md:mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-500" />
              <span>חשבוניות ({invoices.length})</span>
            </h2>
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-start">
              {invoices.map((invoice) => (
                <ResultCard
                  key={invoice._id}
                  item={invoice}
                  type="invoice"
                  onClick={() => navigate(`/invoices/${invoice._id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* תוצאות הזמנות */}
        {orders.length > 0 && (
          <section className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4 sm:mb-5 md:mb-6 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-amber-500" />
              <span>הזמנות ({orders.length})</span>
            </h2>
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-start">
              {orders.map((order) => (
                <ResultCard
                  key={order._id}
                  item={order}
                  type="order"
                  onClick={() => navigate(`/orders/${order._id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* תוצאות ספקים */}
        {suppliers.length > 0 && (
          <section className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4 sm:mb-5 md:mb-6 flex items-center gap-2">
              <Truck className="w-6 h-6 text-green-500" />
              <span>ספקים ({suppliers.length})</span>
            </h2>
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-start">
              {suppliers.map((supplier) => (
                <ResultCard
                  key={supplier._id}
                  item={supplier}
                  type="supplier"
                  onClick={() => navigate(`/suppliers/${supplier._id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-4 md:p-4 sm:p-4 sm:p-5 md:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 md:p-4 sm:p-6 md:p-8 shadow-xl">
          <h1 className="text-2xl md:text-xl sm:text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3 flex-wrap">
            <Search className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0" />
            <span className="break-words">תוצאות החיפוש עבור "{query}"</span>
          </h1>
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
