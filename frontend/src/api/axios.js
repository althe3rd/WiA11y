import axios from 'axios';
import store from '../store';
import router from '../router';

const instance = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor with better error handling
instance.interceptors.response.use(
  response => response,
  async error => {
    console.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle different error types
    if (error.response?.status === 404 && error.config?.url === '/api/auth/me') {
      console.log('Auth endpoint not found, logging out...');
      store.dispatch('logout');
      router.push('/login');
    } else if (error.response?.status === 401) {
      console.log('Session expired, logging out...');
      store.dispatch('logout');
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to add token
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

export default instance; 