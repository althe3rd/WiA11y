<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="main-nav">
      <div class="nav-left">
        <div class="logo">
          <Logo />
        </div>
        <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
        <router-link to="/scans" class="nav-link">Scans</router-link>
        <router-link v-if="isNetworkAdmin || isAdmin" to="/users" class="nav-link">Users</router-link>
        <router-link to="/team-management" class="nav-link" v-if="isTeamAdmin || isNetworkAdmin">
          Team Management
        </router-link>
      </div>
      <div class="nav-right">
        <span class="user-info">{{ user?.name }}</span>
        <button @click="logout" class="button-primary">Logout</button>
      </div>
    </nav>
    <CrawlForm v-if="isAuthenticated" />
    <router-view></router-view>
  </div>
</template> 

<script>
import Logo from './components/Logo.vue';
import CrawlForm from './components/CrawlForm.vue';
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'App',
  components: {
    Logo,
    CrawlForm
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    
    const isAuthenticated = computed(() => store.getters.isAuthenticated);
    const isAdmin = computed(() => store.getters.isAdmin);
    const isNetworkAdmin = computed(() => store.getters.isNetworkAdmin);
    const isTeamAdmin = computed(() => store.getters.isTeamAdmin);
    const user = computed(() => store.state.user);
    
    const logout = async () => {
      await store.dispatch('logout');
      router.push('/login');
    };
    
    return {
      isAuthenticated,
      isAdmin,
      isNetworkAdmin,
      isTeamAdmin,
      user,
      logout
    };
  }
}
</script>

<style>
:root {
  --primary-color: #8338EC;
  --primary-hover: #7029d8;
  --secondary-color: #FF006E;
  --text-color: #2c3e50;
  --background-color: #f5f7fa;
  --card-background: #ffffff;
  --border-color: #e1e4e8;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
}

#app {
  min-height: 100vh;
}

.main-nav {
  background-color: var(--card-background);
  padding: 1rem 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo img {
  height: 32px;
}

.nav-link {
  text-decoration: none;
  color: var(--text-color);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.nav-link:hover {
  background-color: var(--background-color);
}

.router-link-active {
  color: var(--primary-color);
  background-color: rgba(131, 56, 236, 0.1);
}

.button-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button-primary:hover {
  background-color: var(--primary-hover);
}

/* Global styles for cards */
.card {
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Global styles for headings */
h1, h2, h3 {
  color: var(--text-color);
  font-weight: 600;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Global styles for forms */
.form-group {
  margin-bottom: 1.5rem;
}

input, select, textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(131, 56, 236, 0.1);
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-color);
}

/* Global styles for buttons */
.button-secondary {
  background-color: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.button-secondary:hover {
  background-color: rgba(131, 56, 236, 0.1);
}
</style> 