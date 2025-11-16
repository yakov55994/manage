import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://management-server-owna.onrender.com/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
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

    return Promise.reject(error);
  }
);

export default api;

// 🟦 פונקציה חכמה שמנהלת קריאות עם /projects/:id רק למשתמש רגיל
export const apiWithProject = async (method, path, body = null) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const projectId = localStorage.getItem("selectedProjectId");

  // מנהל → פונה לנתיב רגיל
  if (user?.role === "admin") {
    return api({
      method,
      url: path,
      data: body,
    });
  }

  // משתמש רגיל → חייב projectId
  if (!projectId) {
    throw new Error("חסר projectId למשתמש רגיל");
  }

  // בנייה נכונה של ה־URL
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return api({
    method,
    url: `/projects/${projectId}${cleanPath}`,
    data: body,
  });
};

