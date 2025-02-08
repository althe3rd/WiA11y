import { createApp } from 'vue'
import { createStore } from 'vuex'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Create Vuex store
const store = createStore({
  modules: {
    crawls: {
      namespaced: true,
      state: {
        crawls: []
      },
      actions: {
        createCrawl({ commit }, crawlData) {
          // TODO: Implement API call
          console.log('Creating crawl:', crawlData)
        }
      }
    }
  }
})

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('./views/Dashboard.vue')
    }
  ]
})

// Create and mount the Vue application
const app = createApp(App)
app.use(store)
app.use(router)
app.mount('#app') 