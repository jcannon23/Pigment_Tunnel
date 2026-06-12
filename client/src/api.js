import axios from 'axios';

// In production the API is served from the same origin under /api.
// For local dev, Vite proxies /api to the backend (see vite.config.js),
// or you can override with VITE_API_URL.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
