import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import router from './router'
import store from './store'

// Create the Vue application
const app = createApp(App)

// Initialize auth before mounting the app
console.log('Initializing application...');
store.dispatch('initializeAuth').then(() => {
  console.log('Auth initialized, mounting app...');
  app.use(store)
  app.use(router)
  app.mount('#app')
}).catch(error => {
  console.error('Failed to initialize auth:', error);
  // Mount app anyway to show login screen
  app.use(store)
  app.use(router)
  app.mount('#app')
}) 