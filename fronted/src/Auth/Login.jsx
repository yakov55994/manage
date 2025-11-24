import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import { Lock, User, Eye, EyeOff, LogIn, Mail } from "lucide-react";
import api from "../api/api"; // ✅ הוסף את זה

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ✅ עדכן להשתמש ב-api
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error("נא למלא את כל השדות");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/login', formData); // ✅ שימוש ב-api

      if (response.data.success) {
        await login(response.data);
        toast.success("התחברת בהצלחה!");
        navigate("/projects");
      } else {
        toast.error(response.data.message || "שגיאה בהתחברות");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            ברוכים השבים
          </h2>
          <p className="text-gray-600">התחבר למערכת ניהולון</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              שם משתמש
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="הזן שם משתמש"
                className="w-full pr-10 p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              סיסמה
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="הזן סיסמה"
                autoComplete="current-password"
                className="w-full pr-10 pl-10 p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
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

          {/* Forgot Password Link */}
          <div className="text-left">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold hover:underline"
            >
              שכחת סיסמה?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-400 to-amber-400 text-white px-6 py-4 rounded-xl font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <ClipLoader size={20} color="#ffffff" />
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>התחבר</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
};

// ✅ Forgot Password Modal Component
const ForgotPasswordModal = ({ onClose }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("נא למלא שם משתמש");
      return;
    }

    try {
      setLoading(true);

      await api.post('/users/forgot-password', { 
        username: username.trim() 
      }); // ✅ שימוש ב-api

      toast.success("אם המשתמש קיים, מייל נשלח לכתובת המייל הרשומה");
      onClose();
    } catch (error) {
      console.error("Forgot password error:", error);
      // גם בשגיאה נציג הודעה חיובית (אבטחה)
      toast.success("אם המשתמש קיים, מייל נשלח לכתובת המייל הרשומה");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            שכחת סיסמה?
          </h2>
          <p className="text-gray-600 text-sm">
            הזן את שם המשתמש שלך ונשלח לך קישור לאיפוס סיסמה
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              שם משתמש
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="הזן שם משתמש"
                className="w-full pr-10 p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-400 to-amber-400 text-white px-6 py-3 rounded-xl font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <ClipLoader size={20} color="#ffffff" />
                  <span>שולח...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>שלח קישור</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;