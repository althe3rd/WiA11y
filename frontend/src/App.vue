<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="main-nav">
      <div class="nav-left">
        <router-link to="/dashboard" class="nav-link" v-if="isAuthenticated">
          Dashboard
        </router-link>
        <router-link v-if="isNetworkAdmin || isAdmin" to="/users">Users</router-link>
        <router-link to="/team-management" class="nav-link" v-if="isTeamAdmin || isNetworkAdmin">
          Team Management
        </router-link>
      </div>
      <div class="nav-right">
        <span class="user-info">{{ user?.name }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>
    </nav>
    <router-view></router-view>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'App',
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
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.main-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-left {
  display: flex;
  gap: 1rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  color: #666;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style> 