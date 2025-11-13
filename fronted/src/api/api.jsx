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
    console.log('📤 Request:', config.url, 'Token:', token ? '✅' : '❌');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Authorization header set');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.config?.url, 'Status:', error.response?.status);
    
    if (error.response?.status === 401) {
      console.warn('🚫 401 - Triggering logout event');
      
      // 🆕 במקום למחוק ישירות - שלח אירוע
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;