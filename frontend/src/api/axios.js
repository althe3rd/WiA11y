import axios from 'axios';
import store from '../store';
import router from '../router';

const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://wia11y-api.heroiccloud.com'
  : 'http://localhost:3000';

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor to handle token expiration
instance.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.log('Unauthorized response, clearing auth state');
      store.commit('setToken', null);
      store.commit('setUser', null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to add token
instance.interceptors.request.use(
  config => {
    console.log('Request URL:', config.url);
    const token = localStorage.getItem('token');
    console.log('Token exists in interceptor:', !!token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding token to request:', config.url);
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

export default instance; 