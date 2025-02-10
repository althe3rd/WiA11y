import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://wia11y-api.heroiccloud.com'
  : 'http://localhost:3000';

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Only add this if you're using a self-signed cert temporarily
  httpsAgent: process.env.NODE_ENV === 'development' ? new (require('https').Agent)({
    rejectUnauthorized: false
  }) : undefined
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