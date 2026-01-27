import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/api"; // ודא שהנתיב לקובץ ה-API שלך נכון

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // 💡 החלק החשוב: מתחילים במצב טעינה

    // פונקציה שמאמתת את הטוקן מול השרת
    const validateToken = useCallback(async () => {
        if (token) {
            try {
                // הגדרת הטוקן בכותרות של כל הבקשות
                api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

                // בקשה לשרת לקבלת פרטי המשתמש
                const { data } = await api.get("/users/me"); // נניח שיש לך נקודת קצה כזו

                if (data.success) {
                    setUser(data.data);
                    setIsAuthenticated(true);
                } else {
                    // אם הטוקן לא תקין - נקה הכל
                    throw new Error("Invalid token");
                }
            } catch (error) {
                console.error("Auth Error:", error);
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
                setIsAuthenticated(false);
                delete api.defaults.headers.common["Authorization"];
            }
        }
        // 💡 רק אחרי שכל הבדיקות הסתיימו, נכבה את מצב הטעינה
        setIsLoading(false);
    }, [token]);

    // useEffect שירוץ פעם אחת כשהאפליקציה נטענת
    useEffect(() => {
        validateToken();
    }, [validateToken]);

    const login = (userData, userToken) => {
        localStorage.setItem("token", userToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;
        setToken(userToken);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    const value = {
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
    };

    // 💡 בזמן טעינה, אפשר להציג מסך טעינה כללי כדי למנוע קפיצות
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-2xl font-bold text-gray-600">טוען...</div>
            </div>
        );
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};