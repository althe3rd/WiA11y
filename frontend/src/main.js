import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'

// Create and mount the Vue application
const app = createApp(App)
app.use(store)
app.use(router)

// Set axios defaults
axios.defaults.baseURL = process.env.VUE_APP_API_URL

app.mount('#app') 