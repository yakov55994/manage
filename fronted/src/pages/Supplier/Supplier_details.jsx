import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ClipLoader } from "react-spinners";
import { User, Edit2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const SupplierDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplierDetails = async () => {
      try {
        const response = await api.get(`/suppliers/${id}`);
        setSupplier(response.data.data);
      } catch (error) {
        console.error("Error fetching supplier details:", error);
        toast.error("שגיאה בטעינת פרטי הספק", {
          className: "sonner-toast error rtl",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={loading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">
          טוען פרטי ספק . . .
        </h1>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <h1 className="text-2xl font-bold text-red-600">ספק לא נמצא</h1>
        <button
          onClick={() => navigate("/suppliers")}
          className="mt-4 px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
        >
          חזור לרשימת ספקים
        </button>
      </div>
    );
  }

  const formatNumber = (num) => {
    return num ? num.toLocaleString("he-IL") : "0";
  };

  function formatHebrewDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isoDate = "2025-07-24T14:32:48.702Z";
  const date = new Date(isoDate);

  // פורמט של יום/חודש/שנה
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b py-8">
      <div className="container mx-auto px-4">
        {/* כותרת */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <User className="text-sky-950 ml-4 mt-2 size-8" />
          <h1 className="text-4xl font-bold text-black">פרטי ספק</h1>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => navigate("/suppliers")}
            className="flex items-center gap-3 px-6 py-2 bg-slate-400 font-bold rounded-xl hover:bg-slate-600 hover:text-white transition-colors"
          >
            <ArrowRight size={20} />
            <span>חזור לרשימה</span>
          </button>
          <button
            onClick={() => navigate(`/update-supplier/${id}`)}
            className="flex items-center gap-3 px-6 py-2 bg-slate-400 font-bold rounded-xl hover:bg-slate-600 hover:text-white transition-colors"
          >
            <Edit2 size={20} />
            <span>עריכת ספק</span>
          </button>
        </div>

        {/* פרטי הספק */}
        <div className="flex justify-center items-center">
          <div className="bg-slate-300 p-8 rounded-lg shadow-xl w-full max-w-6xl">
            {/* פרטים עיקריים */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-amber-600 pb-2">
                פרטי הספק
              </h2>
              {console.log(supplier)}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xl text-black">
                <div className="border-l-4 border-amber-600 pl-4 bg-white p-4 rounded-lg shadow">
                  <b className="text-xl block mb-2">שם הספק:</b>
                  <span className="text-lg">{supplier.name}</span>
                </div>
                <div className="border-l-4 border-amber-600 pl-4 bg-white p-4 rounded-lg shadow">
                  <b className="text-xl block mb-2">מספר עוסק:</b>
                  <span className="text-lg">
                    {formatNumber(supplier.business_tax)}
                  </span>
                </div>
                <div className="border-l-4 border-amber-600 pl-4 bg-white p-4 rounded-lg shadow">
                  <b className="text-xl block mb-2">טלפון:</b>
                  <span className="text-lg">{supplier.phone}</span>
                </div>
                <div className="border-l-4 border-amber-600 pl-4 bg-white p-4 rounded-lg shadow">
                  <b className="text-xl block mb-2">אימייל:</b>
                  <span className="text-lg">{supplier.email || "לא הוכנס אימיל"}</span>
                </div>
                <div className="border-l-4 border-amber-600 pl-4 bg-white p-4 rounded-lg shadow lg:col-span-2">
                  <b className="text-xl block mb-2">כתובת:</b>
                  <span className="text-lg">{supplier.address || "לא הוכנס כתובת"}</span>
                </div>
                <div className="border-l-4 border-amber-600 pl-4 bg-white p-4 rounded-lg shadow">
                  <b className="text-xl block mb-2">תאריך יצירה:</b>
                  <span className="text-lg">
                    {formatDate(supplier.date)}
                  </span>
                </div>
              </div>
            </div>

            {/* פרטי בנק */}
            {supplier.bankDetails && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-green-600 pb-2">
                  פרטי חשבון בנק
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xl text-black">
                  <div className="border-l-4 border-green-600 pl-4 bg-white p-4 rounded-lg shadow">
                    <b className="text-xl block mb-2">שם הבנק:</b>
                    <span className="text-lg">
                      {supplier.bankDetails.bankName || "לא זמין"}
                    </span>
                  </div>
                  <div className="border-l-4 border-green-600 pl-4 bg-white p-4 rounded-lg shadow">
                    <b className="text-xl block mb-2">מספר סניף:</b>
                    <span className="text-lg">
                      {supplier.bankDetails.branchNumber || "לא זמין"}
                    </span>
                  </div>
                  <div className="border-l-4 border-green-600 pl-4 bg-white p-4 rounded-lg shadow">
                    <b className="text-xl block mb-2">מספר חשבון:</b>
                    <span className="text-lg">
                      {supplier.bankDetails.accountNumber || "לא זמין"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* אם אין פרטי בנק */}
            {!supplier.bankDetails && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>שים לב:</strong> לא נמצאו פרטי חשבון בנק עבור ספק
                      זה.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailsPage;
