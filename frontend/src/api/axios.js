import axios from 'axios';

// Create and export a configured axios instance
const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL
});

// Add request interceptor to handle auth
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api; 