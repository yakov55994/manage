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
api.interceptors.response.use(
  (response) => response,

  (error) => {
    // לוג מסודר לשגיאות
    console.error("❌ API ERROR:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message,
    });

    // הפניה לדף אין גישה
    if (error.response?.status === 403) {
      window.location.href = "/no-access";
      return;
    }

    return Promise.reject(error);
  }
);

export default api;
