<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="main-nav">
      <div class="nav-left">
        <div class="logo">
          <Logo />
        </div>
        <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
        <router-link to="/scans" class="nav-link">Scans</router-link>
        <router-link to="/queue" class="nav-link" :class="{ active: $route.path === '/queue' }">
          Queue
        </router-link>
        <router-link v-if="isNetworkAdmin || isAdmin" to="/users" class="nav-link">Users</router-link>
        <router-link to="/team-management" class="nav-link" v-if="isTeamAdmin || isNetworkAdmin">
          Team Management
        </router-link>
        <router-link 
          v-if="isNetworkAdmin" 
          to="/settings" 
          class="nav-link" 
          :class="{ active: $route.path === '/settings' }"
        >
          Settings
        </router-link>
      </div>
      <div class="nav-right">
        <QueueStatus />
        <div class="user-info">
          <span class="user-name">{{ user?.name }}</span>
          <div class="role-info">
            <span :class="['role-tag', getRoleClass]">{{ formatRole(user?.role) }}</span>
            <span v-if="!isNetworkAdmin && userTeam" class="team-tag">{{ userTeam }}</span>
          </div>
        </div>
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
import QueueStatus from './components/QueueStatus.vue';
import UserManagement from '@/components/UserManagement.vue'
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'App',
  components: {
    Logo,
    CrawlForm,
    QueueStatus,
    UserManagement
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    
    // Fetch teams when app loads
    onMounted(async () => {
      if (store.getters.isAuthenticated) {
        await store.dispatch('fetchTeams');
      }
    });
    
    const isAuthenticated = computed(() => store.getters.isAuthenticated);
    const isAdmin = computed(() => store.getters.isAdmin);
    const isNetworkAdmin = computed(() => store.getters.isNetworkAdmin);
    const isTeamAdmin = computed(() => store.getters.isTeamAdmin);
    const user = computed(() => store.state.user);
    
    const userTeam = computed(() => {
      // Get the team ID from the user's teams array
      const teamId = user.value?.teams?.[0];
      if (!teamId) return null;
      
      // Get the team name from the Vuex store's teams array
      const team = store.state.teams.find(t => t._id === teamId);
      if (team) {
        return team.name;
      }
      return null;
    });
    
    const getRoleClass = computed(() => {
      const role = user.value?.role;
      return {
        'network-admin': role === 'network_admin',
        'team-admin': role === 'team_admin',
        'admin': role === 'admin',
        'team-member': role === 'team_member'
      };
    });
    
    const formatRole = (role) => {
      switch(role) {
        case 'network_admin': return 'Network Admin';
        case 'team_admin': return 'Team Admin';
        case 'admin': return 'Admin';
        case 'team_member': return 'Team Member';
        default: return role;
      }
    };
    
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
      userTeam,
      getRoleClass,
      formatRole,
      logout
    };
  },
  async created() {
    console.log('App created, initializing auth...');
    await this.$store.dispatch('initializeAuth');
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

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid #e6e6e6;
  border-radius: 40px;
  padding: 0.15rem 0.15rem;
  padding-left: 1rem;
}

.user-name {
  font-weight: 500;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 0rem;
  
}

.role-info span:first-child {
  border-top-left-radius: 40px;
  border-bottom-left-radius: 40px;
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}

.role-info span:last-child {
  border-top-right-radius: 40px;
  border-bottom-right-radius: 40px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
}

.role-tag {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  font-weight: 500;
}

.role-tag.network-admin {
  
  background: linear-gradient(90deg, #ffffff, #e6cff8);
  color: rgb(57, 6, 62);
}

.role-tag.team-admin {
  background-color: #b6d4ed;
  color: rgb(50, 94, 152);
}

.role-tag.admin {
  background-color: #ff9800;
  color: white;
}

.role-tag.team-member {
  background-color: #4caf50;
  color: white;
}

.team-tag {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;

  font-weight: 500;
  background-color: #e6e6e6;
  color: #666;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* Add these styles for the queue status positioning */
.queue-status {
  margin-right: 20px;
}
</style> 