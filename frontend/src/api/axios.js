import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://wai11y-api.heroiccloud.com'
  : 'http://localhost:3000';

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to handle auth
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance; 