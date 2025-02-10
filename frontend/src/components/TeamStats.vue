<template>
  <div class="team-stats">
    <h2>Accessibility Statistics</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Average Score</h3>
        <div class="stat-value" :class="getScoreClass(averageScore)">
          {{ averageScore }}%
        </div>
        <p class="stat-description">Across all scanned sites</p>
      </div>
      
      <div class="stat-card">
        <h3>Sites Scanned</h3>
        <div class="stat-value">{{ uniqueSites }}</div>
        <p class="stat-description">Total unique domains</p>
      </div>
      
      <div class="stat-card">
        <h3>Total Scans</h3>
        <div class="stat-value">{{ totalScans }}</div>
        <p class="stat-description">Completed accessibility checks</p>
      </div>

      <div class="stat-card">
        <h3>Common Issues</h3>
        <ul class="issues-list">
          <li v-for="(count, issue) in topIssues" :key="issue">
            <span class="issue-count">{{ count }}</span>
            {{ issue }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useStore } from 'vuex'
import api from '../api/axios'
import { calculateScore } from '../utils/scoreCalculator'

export default {
  name: 'TeamStats',
  props: {
    selectedTeam: {
      type: String,
      default: ''
    },
    selectedDateRange: {
      type: String,
      default: 'all'
    }
  },
  setup(props) {
    const store = useStore()
    const crawls = ref([])
    
    const showFilters = computed(() => {
      return store.getters.isNetworkAdmin || 
             store.state.teams.length > 1
    })
    
    const availableTeams = computed(() => {
      return store.state.teams
    })
    
    const fetchAllAccessibleCrawls = async () => {
      try {
        const { data } = await api.get('/api/crawls')
        crawls.value = data
      } catch (error) {
        console.error('Failed to fetch crawls:', error)
      }
    }
    
    // Filter crawls based on selected team and date range
    const filteredCrawls = computed(() => {
      let filtered = crawls.value
      
      // Filter by team if selected
      if (props.selectedTeam) {
        filtered = filtered.filter(crawl => {
          // Handle both populated and unpopulated team references
          if (!crawl.team) return false;
          try {
            const teamId = typeof crawl.team === 'object' ? crawl.team._id : crawl.team;
            return teamId?.toString() === props.selectedTeam?.toString();
          } catch (error) {
            console.error('Error comparing team IDs:', error);
            return false;
          }
        })
      }
      
      // Filter by date range
      if (props.selectedDateRange !== 'all') {
        const now = new Date()
        const ranges = {
          week: 7,
          month: 30,
          quarter: 90
        }
        const days = ranges[props.selectedDateRange]
        const cutoff = new Date(now.setDate(now.getDate() - days))
        
        filtered = filtered.filter(crawl => 
          new Date(crawl.createdAt) >= cutoff
        )
      }
      
      return filtered
    })

    const averageScore = computed(() => {
      const completedCrawls = filteredCrawls.value.filter(c => c.status === 'completed')
      if (!completedCrawls.length) return '—'
      
      const totalScore = completedCrawls.reduce((sum, crawl) => {
        const score = calculateScore(crawl)
        return sum + (score === '—' ? 0 : score)
      }, 0)
      
      return Math.round(totalScore / completedCrawls.length)
    })

    const uniqueSites = computed(() => {
      return new Set(filteredCrawls.value.map(c => c.domain)).size
    })

    const totalScans = computed(() => {
      return filteredCrawls.value.filter(c => c.status === 'completed').length
    })

    const topIssues = computed(() => {
      const issues = {}
      filteredCrawls.value.forEach(crawl => {
        // Check if violations is an array and not empty
        if (Array.isArray(crawl.violations) && crawl.violations.length > 0) {
          crawl.violations.forEach(violation => {
            const key = violation.description || violation.id
            if (!issues[key]) issues[key] = 0
            issues[key]++
          })
        }
      })
      
      return Object.fromEntries(
        Object.entries(issues)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
      )
    })

    const getScoreClass = (score) => {
      if (score === '—') return 'score-pending'
      if (score >= 90) return 'score-excellent'
      if (score >= 70) return 'score-good'
      if (score >= 50) return 'score-fair'
      return 'score-poor'
    }

    onMounted(fetchAllAccessibleCrawls)
    
    // Watch for prop changes and refresh data if needed
    watch([() => props.selectedTeam, () => props.selectedDateRange], () => {
      fetchAllAccessibleCrawls()
    })

    return {
      averageScore,
      uniqueSites,
      totalScans,
      topIssues,
      getScoreClass,
      showFilters,
      availableTeams
    }
  }
}
</script>

<style scoped>
.team-stats {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
  color: var(--text-color);
  font-size: 1rem;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  margin: 10px 0;
}

.stat-description {
  color: #666;
  font-size: 0.9rem;
}

.issues-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.issues-list li {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.issue-count {
  background: var(--background-color);
  padding: 2px 8px;
  border-radius: 12px;
  margin-right: 8px;
  font-size: 0.8rem;
  font-weight: 500;
}

.score-excellent { color: #4CAF50; }
.score-good { color: #8BC34A; }
.score-fair { color: #FFC107; }
.score-poor { color: #F44336; }
.score-pending { color: #9E9E9E; }
</style> 