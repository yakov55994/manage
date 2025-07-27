import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, ChevronLeft, Eye, EyeOff } from "lucide-react";
import api from '../api/api.jsx';
import { toast } from "sonner";
import '../Components/toastStyles.css';


const Login = () => {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [isCodeFocused, setIsCodeFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();


    const handleLogin = async (code) => {
        if (!code.trim()) {
            toast.error("נא להזין קוד כניסה", {
                className: "sonner-toast error rtl"
            });
            return;
        }
        
        setLoading(true);
        try {
            const response = await api.post('/authenticate', { code });
             
            if (response.data.token) {
                toast.success("ההתחברות בוצעה בהצלחה, ברוך הבא 🙂", {
                    
                    className: "sonner-toast success rtl"
                });
                
                navigate('/projects');
            } else {
                throw new Error('לא התקבל טוקן מהשרת');
            }
        } catch (error) {
           
            const errorMsg = error.response?.data || "שגיאה בהתחברות, אנא נסה שוב";
            toast.error(errorMsg, {
                className: "sonner-toast error rtl"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin(code);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 mt-7">
            <div className="relative w-full max-w-md ">
                {/* Logo Section */}
                <div className="absolute -top-28 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center transform transition-transform hover:rotate-12">
                        <KeyRound className="w-8 h-8 text-orange-950" />
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-12 pb-8">
                        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
                            ברוכים הבאים
                        </h2>
                        <p className="text-center text-gray-500 text-sm font-bold">
                            הזן את קוד הגישה שלך להתחברות למערכת
                        </p>
                    </div>

                    {/* Form Section */}
                    <div className="px-8 pb-8">
                        <div className="relative mb-6">
                            <div className={`relative transition-all duration-300 ${isCodeFocused ? 'transform -translate-y-2' : ''}`}>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        placeholder="קוד גישה" 
                                        value={code} 
                                        onChange={(e) => setCode(e.target.value)}
                                        onFocus={() => setIsCodeFocused(true)}
                                        onBlur={() => setIsCodeFocused(false)}
                                        onKeyPress={handleKeyPress}
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus: transition-all duration-300 outline-none text-right pl-12 font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-lime-950 transition-colors duration-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <div className={`absolute bottom-0 left-0 w-full h-1 bg-lime-900 transform origin-left transition-transform duration-300 ${isCodeFocused ? 'scale-x-100' : 'scale-x-0'}`} />
                            </div>
                        </div>

                        

                        <button 
                            onClick={() => handleLogin(code)}
                            disabled={loading}
                            className="relative w-full py-4 bg-slate-600 text-white rounded-xl font-semibold transition-all duration-300 hover:bg-slate-900 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                        >
                            <div className="relative flex items-center justify-center">
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span className="mr-2">התחבר למערכת</span>
                                        <ChevronLeft className="w-5 h-5 transform transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
                        <div className="flex flex-col items-center">
                            <p className="text-sm text-gray-500 text-center font-bold">
                                מערכת ניהול פרויקטים מתקדמת
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;