import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { KeyRound, Loader2, ChevronLeft, Eye, EyeOff, User } from "lucide-react";
import api from "../api/api.jsx";
import { toast } from "sonner";
import "../Components/toastStyles.css";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!username.trim() || !password) {
      toast.error("נא להזין שם משתמש וסיסמה", { className: "sonner-toast error rtl" });
      return;
    }
    setLoading(true);
    try {
      // שרת צריך להחזיר: { token, user: {_id, username, role} }
      const { data } = await api.post("/auth/login", { username, password });
      if (!data?.token) throw new Error("לא התקבל טוקן מהשרת");
      await login({ token: data.token, user: data.user }); // עדכון ה־AuthContext
      toast.success("ברוך/ה הבא/ה 🙂", { className: "sonner-toast success rtl" });
      const from = location.state?.from?.pathname || "/projects";
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        "שם משתמש או סיסמה שגויים";
      toast.error(msg, { className: "sonner-toast error rtl" });
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 mt-7">
      <div className="relative w-full max-w-md ">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl grid place-items-center hover:rotate-12 transition">
            <KeyRound className="w-8 h-8 text-orange-950" />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-12 pb-8">
            <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
              התחברות למערכת
            </h2>
            <p className="text-center text-gray-500 text-sm font-bold">שם משתמש וסיסמה</p>
          </div>

          <form className="px-8 pb-8 space-y-5" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="שם משתמש"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-right pl-12 font-bold"
                  autoFocus
                  autoComplete="username"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-right pl-12 font-bold"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-lime-900"
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-4 bg-slate-600 text-white rounded-xl font-semibold transition hover:bg-slate-900 focus:ring-4 focus:ring-blue-200 disabled:opacity-50"
            >
              <div className="flex items-center justify-center">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="mr-2">התחבר/י</span>
                    <ChevronLeft className="w-5 h-5 transition group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center font-bold">
              מערכת ניהול פרויקטים מתקדמת
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
