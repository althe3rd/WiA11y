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
    <CrawlHistory 
      :selectedTeam="selectedTeam"
      :selectedDateRange="selectedDateRange"
      :limit="10"
    />
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import CrawlHistory from '../components/CrawlHistory.vue'
import TeamStats from '../components/TeamStats.vue'

export default {
  name: 'Dashboard',
  components: {
    CrawlHistory,
    TeamStats
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
    
    return {
      userFirstName,
      selectedTeam,
      selectedDateRange,
      showFilters,
      availableTeams
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 40px;
  padding-top: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header-text h1, h2, h3 {
  margin: 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
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