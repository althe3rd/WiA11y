<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="dashboard-header-text">
        <h1>Dashboard</h1>
        <h2>Welcome {{ userFirstName }}</h2>
      </div>
      <div class="header-actions">
        <button @click="exportFiltered" class="export-button">
          <i class="fas fa-file-export"></i> Export as CSV
        </button>
        <router-link to="/scans" class="view-all-link">View All Scanned Sites →</router-link>
      </div>
    </div>
    
    <h2>Filters</h2>
    <div class="filters">
      <div class="filter-group">
        <label for="teamFilter">Team</label>
        <TeamSelector 
          id="teamFilter"
          v-model="selectedTeam"
          :required="false"
          showAllOption
          allTeamsLabel="All Teams"
        />
        <div v-if="selectedTeam && hasChildTeams(selectedTeam)" class="filter-info">
          <span class="info-icon">ℹ️</span>
          Showing data from {{ getTeamName(selectedTeam) }} and all its sub-teams
        </div>
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
import TeamSelector from '../components/TeamSelector.vue'
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
    QueueStatus,
    TeamSelector
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
    
    const hasChildTeams = (teamId) => {
      const allTeams = store.state.teams || [];
      return allTeams.some(team => team.parentTeam && team.parentTeam._id === teamId);
    }
    
    const getTeamName = (teamId) => {
      const team = store.state.teams.find(t => t._id === teamId);
      return team ? team.name : 'Selected Team';
    }
    
    const exportFiltered = () => {
      if (crawlHistory.value && typeof crawlHistory.value.exportToCsv === 'function') {
        crawlHistory.value.exportToCsv();
      }
    };
    
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
      handleCrawlsLoaded,
      hasChildTeams,
      getTeamName,
      exportFiltered
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: var(--secondary-button-bg, #6c757d);
  color: var(--secondary-button-text, #ffffff);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.export-button:hover {
  background-color: var(--secondary-button-hover-bg, #5a6268);
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

.filter-info {
  margin-top: 5px;
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}

.info-icon {
  font-size: 1rem;
}
</style> 