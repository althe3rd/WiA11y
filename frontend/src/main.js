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