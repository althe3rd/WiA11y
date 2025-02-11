import axios from 'axios';
import store from '../store';
import router from '../router';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
  withCredentials: true // Add this to ensure cookies are sent
});

// Add request interceptor to add token
instance.interceptors.request.use(
  config => {
    console.log('Making request:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL
    });
    
    const token = store.state.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
instance.interceptors.response.use(
  response => {
    console.log('Response received:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });

    if (error.response?.status === 401) {
      if (error.config.url !== '/api/auth/login') {
        console.log('Session expired, logging out...');
        store.dispatch('logout');
        router.push('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default instance; 