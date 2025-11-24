import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import api from "../api/api";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // בדיקת תקינות הטוקן
useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await api.get(`/users/verify-reset-token/${token}`);
        
        if (response.data.valid) {
          setTokenValid(true);
          setUsername(response.data.username);
        } else {
          setTokenValid(false);
          toast.error(response.data.message || "הקישור לא תקף או פג תוקפו");
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        setTokenValid(false);
        toast.error("שגיאה באימות הקישור");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // ✅ עדכן את זה
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("הסיסמאות לא תואמות");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post('/users/reset-password', {
        token,
        newPassword: formData.newPassword,
      });

      if (response.data.success) {
        toast.success("הסיסמה שונתה בהצלחה!");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error(response.data.message || "שגיאה באיפוס הסיסמה");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.message || "שגיאה באיפוס הסיסמה");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <ClipLoader size={60} color="#f97316" />
          <p className="mt-4 text-gray-600 font-semibold">מאמת קישור...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            קישור לא תקף
          </h2>
          <p className="text-gray-600 mb-6">
            הקישור לא תקף או שפג תוקפו. אנא בקש קישור חדש.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-orange-400 to-amber-400 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-500 hover:to-amber-500 transition-all"
          >
            חזור להתחברות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            בחר סיסמה חדשה
          </h2>
          <p className="text-gray-600">
            שלום <span className="font-bold text-orange-500">{username}</span>!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              סיסמה חדשה *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                placeholder="הזן סיסמה חדשה"
                className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              אימות סיסמה *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="הזן שוב את הסיסמה"
                className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Password Match Indicator */}
          {formData.confirmPassword && (
            <div className="flex items-center gap-2">
              {formData.newPassword === formData.confirmPassword ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600 font-semibold">
                    הסיסמאות תואמות
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-600 font-semibold">
                    הסיסמאות לא תואמות
                  </span>
                </>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-400 to-amber-400 text-white px-6 py-4 rounded-xl font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <ClipLoader size={20} color="#ffffff" />
                <span>שומר...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>שמור סיסמה חדשה</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;