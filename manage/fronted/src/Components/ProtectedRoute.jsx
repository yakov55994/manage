import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/api'; // instance מותאם של axios
import { ClipLoader } from 'react-spinners';

const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                // קריאה לנתיב שמחזיר את סטטוס האימות
                const response = await api.get('/auth-status');
                setIsAuthenticated(response.data.authenticated);
            } catch (error) {
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <ClipLoader size={100} color="#3498db" loading={loading} />
                <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                {/* אנימציית מנעול במקום פרצוף */}
                <div className="mb-8 transition-all duration-300 animate-pulse" style={{ animationDuration: '3s' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* מעגל רקע */}
                        <circle cx="70" cy="70" r="65" fill="#F5F7FA" stroke="#CBD5E0" strokeWidth="2" />
                        
                        {/* גוף המנעול */}
                        <rect x="40" y="70" width="60" height="45" rx="6" fill="#3182CE" />
                        
                        {/* חלק עליון של המנעול */}
                        <path d="M50 70V50C50 39 59 30 70 30C81 30 90 39 90 50V70" 
                              stroke="#3182CE" strokeWidth="8" strokeLinecap="round" />
                        
                        {/* חור המפתח */}
                        <circle cx="70" cy="90" r="8" fill="white" />
                        <path d="M70 90V105" stroke="white" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                </div>
                
                <div className="text-center space-y-6 max-w-lg">
                    <h2 className="font-bold text-3xl text-gray-800">דרושה התחברות</h2>
                    <p className="text-xl text-gray-600 mb-4">לצפייה בתוכן זה יש צורך בהתחברות למערכת</p>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center mt-3">
                        <svg className="h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mr-2 text-blue-700">התחבר כדי לקבל גישה מלאה למערכת</p>
                    </div>
                </div>
                
                {/* <div className="mt-8 flex flex-col items-center">
                    <button 
                        onClick={() => window.location.href = '/login'} 
                        className=" bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        התחבר למערכת
                    </button>
                    
                 </div> */}
                
                {/* רקע גרפי עדין */}
                <div className="absolute inset-0 -z-10 overflow-hidden opacity-5">
                    <svg width="100%" height="100%">
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 0 10 L 40 10 M 10 0 L 10 40" stroke="#3182CE" strokeWidth="0.5" fill="none" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;