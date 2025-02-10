import axios from 'axios';
import store from '../store';
import router from '../router';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: process.env.VUE_APP_API_URL
});

// Add request interceptor to add token
instance.interceptors.request.use(config => {
  const token = store.state.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token expiration
instance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      store.commit('setToken', null);
      store.commit('setUser', null);
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

export default instance; 