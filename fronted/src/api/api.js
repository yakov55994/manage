import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://management-server-owna.onrender.com/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================
// REQUEST INTERCEPTOR
// =========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// RESPONSE INTERCEPTOR
// =========================
// =========================
// RESPONSE INTERCEPTOR – FIXED
// =========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // שגיאות הרשאה - 401 (לא מחובר) או 403 (אין הרשאה)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // אם ההודעה מכילה "הרשאה" - נווט לדף אין הרשאה
      if (error.response?.data?.message?.includes("הרשאה") || 
          error.response?.data?.message?.includes("אין גישה")) {
        window.location.href = "/no-access";
        return Promise.reject(error);
      }
      
      // אחרת - נווט ללוגין (למקרה של token שפג תוקפו)
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);
export default api;
