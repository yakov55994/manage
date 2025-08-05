import axios from 'axios';

const baseURL = import.meta.env.MODE === 'production' 
    ? 'https://baloona-server.onrender.com'
    : 'http://localhost:3000/api';

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});


export default api;
