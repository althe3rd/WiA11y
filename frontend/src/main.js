import axios from 'axios'

// Set base URL before any other imports that might use axios
axios.defaults.baseURL = process.env.VUE_APP_API_URL
console.log('API URL:', process.env.VUE_APP_API_URL) // Add this for debugging

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import router from './router'
import store from './store'

// Create and mount the Vue application
const app = createApp(App)
app.use(store)
app.use(router)

app.mount('#app') 