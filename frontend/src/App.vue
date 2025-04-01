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
        <QueueStatus mode="simplified" />
        <DarkModeToggle />
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
    <CrawlForm v-if="isAuthenticated && !hasPendingRequest" />
    <router-view></router-view>
  </div>
</template> 

<script>
import Logo from './components/Logo.vue';
import CrawlForm from './components/CrawlForm.vue';
import QueueStatus from './components/QueueStatus.vue';
import UserManagement from '@/components/UserManagement.vue'
import DarkModeToggle from './components/DarkModeToggle.vue'
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import api from './api/axios';

export default {
  name: 'App',
  components: {
    Logo,
    CrawlForm,
    QueueStatus,
    UserManagement,
    DarkModeToggle
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const hasPendingRequest = ref(false);
    
    // Fetch teams and settings when app loads
    onMounted(async () => {
      // Always fetch settings
      await store.dispatch('settings/fetchSettings');
      
      // Only fetch teams if authenticated
      if (store.getters.isAuthenticated) {
        await store.dispatch('fetchTeams');
        // Check for pending request
        try {
          const response = await api.get('/api/teams/request/status');
          hasPendingRequest.value = response.data.hasPendingRequest;
        } catch (err) {
          console.error('Failed to check request status:', err);
        }
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
      logout,
      hasPendingRequest
    };
  },
  async created() {
    console.log('App created, initializing auth...');
    await this.$store.dispatch('initializeAuth');
    // Always fetch settings, regardless of auth status
    await this.$store.dispatch('settings/fetchSettings');
  }
}
</script>

<style>
:root {
  --primary-color: #388fec;
  --primary-hover: #7029d8;
  --secondary-color: #FF006E;
  --text-color: var(--text-color);
  --text-muted: #666666;
  --background-color: #f5f7fa;
  --card-background: #ffffff;
  --nav-background: #ffffff;
  --border-color: #e1e4e8;
  --input-background: #ffffff;
  --input-border: #ced4da;
  --dropdown-background: #ffffff;
  --dropdown-hover: var(--background-color);
  --chart-grid: #e1e4e8;
  --container-width: 1400px;
  --secondary-button-bg: #6c757d;
  --secondary-button-hover-bg: #5a6268;
  --secondary-button-text: #ffffff;
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
  transition: background-color 0.3s ease, color 0.3s ease;
}

#app {
  min-height: 100vh;
}

.main-nav {
  background-color: var(--nav-background);
  padding: 1rem 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background-color 0.3s ease;
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
  transition: all 0.2s ease;
}

.nav-link:hover {
  background-color: var(--hover-background);
}

.router-link-active {
  color: var(--primary-color);
  background-color: var(--hover-background);
}

.button-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
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
  transition: background-color 0.3s ease;
}

/* Global styles for headings */
h1, h2, h3 {
  color: var(--text-color);
  font-weight: 600;
  margin-bottom: 1rem;
}

h1 {
  display: inline-block;
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
  border: 1px solid var(--input-border);
  border-radius: 6px;
  font-size: 1rem;
  background-color: var(--input-background);
  color: var(--text-color);
  transition: all 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(56, 143, 236, 0.1);
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-color);
}

/* User info styles */
.main-nav .user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 40px;
  padding: 0.15rem 0.15rem;
  padding-left: 1rem;
  background-color: var(--card-background);
  transition: all 0.2s ease;
}

.main-nav .user-name {
  font-weight: 500;
  color: var(--text-color);
}

.main-nav .role-info {
  display: flex;
  align-items: center;
  gap: 0;
  
}

.role-tag {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-radius: 40px;
}

.role-tag.network-admin {
  background: #e6cff8;
  color: rgb(57, 6, 62);
}

.role-tag.team-admin {
  background-color: #b6d4ed;
  color: #000;
}

.role-tag.admin {
  background-color: #b6d4ed;
  color: #000;
}

.role-tag.team-member {
  background-color: #b6edbd;
  color: #000;
}

.team-tag {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  font-weight: 500;
  background-color: var(--hover-background);
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* Chart styles */
.chart-container {
  background-color: var(--card-background);
  border-radius: 8px;
  padding: 1rem;
  transition: background-color 0.3s ease;
}

.chart-grid line {
  stroke: var(--chart-grid);
}

/* Status badges */
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.875rem;
}

.status-badge.success {
  background-color: var(--success-background);
  color: #28a745;
}

.status-badge.warning {
  background-color: var(--warning-background);
  color: #ffc107;
}

.status-badge.error {
  background-color: var(--error-background);
  color: #dc3545;
}
</style> 