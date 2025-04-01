import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import router from './router'
import store from './store'

/* Import Font Awesome */
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
  faMagnifyingGlassChart, 
  faSpider,
  faCheck, 
  faCircleNotch,
  faSlidersH,
  faSun,
  faMoon,
  faTrash,
  faCalendar,
  faChartLine,
  faEdit,
  faRedoAlt
} from '@fortawesome/free-solid-svg-icons'

/* Add icons to the library */
library.add(
  faMagnifyingGlassChart,
  faSpider,
  faCheck,
  faCircleNotch,
  faSlidersH,
  faSun,
  faMoon,
  faTrash,
  faCalendar,
  faChartLine,
  faEdit,
  faRedoAlt
)

// Create the Vue application
const app = createApp(App)

// Initialize auth before mounting the app
console.log('Initializing application...');
store.dispatch('initializeAuth').then(() => {
  console.log('Auth initialized, mounting app...');
  app.use(store)
  app.use(router)
  app.component('font-awesome-icon', FontAwesomeIcon)
  app.mount('#app')
}).catch(error => {
  console.error('Failed to initialize auth:', error);
  // Mount app anyway to show login screen
  app.use(store)
  app.use(router)
  app.component('font-awesome-icon', FontAwesomeIcon)
  app.mount('#app')
}) 