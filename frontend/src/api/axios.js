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
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized response
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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export default instance; 