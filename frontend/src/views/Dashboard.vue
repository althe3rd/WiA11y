<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="dashboard-header-text">
        <h1>Dashboard</h1>
        <h2>Welcome {{ userFirstName }}</h2>
    </div>
      <router-link to="/scans" class="view-all-link">View All Scanned Sites →</router-link>
    </div>
    
    <h2>Filters</h2>
    <div class="filters">
      <div class="filter-group">
        <label for="teamFilter">Team</label>
        <select id="teamFilter" v-model="selectedTeam">
          <option value="">All Teams</option>
          <option v-for="team in availableTeams" :key="team._id" :value="team._id">
            {{ team.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="dateRange">Time Period</label>
        <select id="dateRange" v-model="selectedDateRange">
          <option value="all">All Time</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="quarter">Past 3 Months</option>
        </select>
      </div>
    </div>
    <TeamStats 
      :selectedTeam="selectedTeam"
      :selectedDateRange="selectedDateRange"
    />
    <h2>Last 10 Scans</h2>
    
    <div class="dashboard-content">
      <div class="dashboard-column">
        <QueueStatus v-if="isNetworkAdmin || isTeamAdmin" mode="detailed" />
      </div>
      <div class="dashboard-column">
        <div class="card" v-if="isLoading">
          <div class="loading-spinner">Loading crawl history...</div>
        </div>
        <div class="card" v-else-if="errorMessage">
          <div class="error-message">{{ errorMessage }}</div>
        </div>
        <CrawlHistory 
          :selectedTeam="selectedTeam"
          :selectedDateRange="selectedDateRange"
          :limit="10" 
          ref="crawlHistory"
          @crawls-loaded="handleCrawlsLoaded"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, defineAsyncComponent } from 'vue'
import { useStore } from 'vuex'
import TeamStats from '../components/TeamStats.vue'
// Use defineAsyncComponent to avoid circular dependencies
const CrawlHistory = defineAsyncComponent(() => import('../components/CrawlHistory.vue'))
const CrawlForm = defineAsyncComponent(() => import('../components/CrawlForm.vue'))
const QueueStatus = defineAsyncComponent(() => import('../components/QueueStatus.vue'))

export default {
  name: 'Dashboard',
  components: {
    TeamStats,
    CrawlHistory,
    CrawlForm,
    QueueStatus
  },
  setup() {
    const store = useStore()
    const selectedTeam = ref('')
    const selectedDateRange = ref('all')
    
    const userFirstName = computed(() => {
      const fullName = store.state.user?.name || ''
      return fullName.split(' ')[0]
    })
    
    const showFilters = computed(() => {
      return store.getters.isNetworkAdmin || 
             store.state.teams.length > 1
    })
    
    const availableTeams = computed(() => {
      return store.state.teams
    })
    
    const isNetworkAdmin = computed(() => {
      return store.getters.isNetworkAdmin
    })
    
    const isTeamAdmin = computed(() => {
      return store.getters.isTeamAdmin
    })
    
    const isLoading = ref(false)
    const errorMessage = ref('')
    const crawlHistory = ref(null)
    
    const handleCrawlsLoaded = (crawls) => {
      // Handle the loaded crawls
    }
    
    return {
      userFirstName,
      selectedTeam,
      selectedDateRange,
      showFilters,
      availableTeams,
      isNetworkAdmin,
      isTeamAdmin,
      isLoading,
      errorMessage,
      crawlHistory,
      handleCrawlsLoaded
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 40px;
  max-width: var(--container-width);
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 20px;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media screen and (min-width: 1200px) {
  .dashboard-content {
    flex-direction: row;
  }
  
  .dashboard-column {
    flex: 1;
  }
  
  .dashboard-column:first-child {
    flex: 0 0 400px;
  }
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-card {
  background: var(--card-background);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 20px;
}

.dashboard-header-text h1, h2, h3 {
  margin: 0;
}

.dashboard-header-text h2 {
  font-weight: 300;
}

.view-all-link {
  color: #0d6efd;
  text-decoration: none;
  font-size: 1.1rem;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: #0a58ca;
  text-decoration: underline;
}

.filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 20px;
  background: var(--card-background);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-group {
  flex: 1;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color);
}

.filter-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--card-background);
}
</style> 