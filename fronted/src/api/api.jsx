import axios from 'axios';

const baseURL = import.meta.env.MODE === 'production' 
    ? 'https://management-server-owna.onrender.com/api'
    : 'http://localhost:3000/api';

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔥 חשוב! Interceptor לטיפול בשגיאות 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // אם קיבלנו 401 - נקה את ה-token ונתב ללוגין
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export default api;
