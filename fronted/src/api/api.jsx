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

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("📤 Request:", config.url, "Token:", token ? "✅" : "❌");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Authorization header set");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.log("🚨 INTERCEPTOR FIRED:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message,
    });

    // 👇 כאן ההפניה הפשוטה
    if (error.response?.status === 403) {
      window.location.href = "/no-access";
      return; // שלא ימשיך
    }

    return Promise.reject(error);
  }
);


export default api;
