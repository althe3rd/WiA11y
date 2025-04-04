<template>
  <div class="team-stats">
    <h2>Accessibility Statistics</h2>
    
    <div class="stats-grid">
      <!-- Core stats in top row -->
      <div class="core-stats">
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
      </div>

      <!-- Detailed analysis row -->
      <div class="detailed-analysis">
        <div class="trend-section">
          <h3>Average Score Trend</h3>
          <AverageScoreTrendGraph :crawls="filteredCrawls" />
        </div>

        <div class="issues-section">
          <h3>Common Issues</h3>
          <div class="stat-card">
            
            <div class="issues-content">
              <div v-if="Object.keys(topIssues).length === 0" class="no-issues">
                No issues found in selected time period
              </div>
              <ul v-else class="issues-list">
                <li v-for="(count, issue) in topIssues" :key="issue">
                  <span class="issue-count">{{ count }}</span>
                  <span class="issue-text">
                    <span class="issue-title">{{ formatIssueTitle(issue) }}</span>
                    <span v-if="isImpactSummary(issue)" class="issue-impact">{{ issue }}</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useStore } from 'vuex'
import api from '../api/axios'
import { calculateScore } from '../utils/scoreCalculator'
import AverageScoreTrendGraph from './AverageScoreTrendGraph.vue'

export default {
  name: 'TeamStats',
  components: {
    AverageScoreTrendGraph
  },
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
      
      // Filter by team if selected (including child teams)
      if (props.selectedTeam) {
        // Get all teams from the store
        const allTeams = store.state.teams || [];
        // Get selected team object
        const selectedTeamObj = allTeams.find(t => t._id === props.selectedTeam);
        
        if (selectedTeamObj) {
          // Build a list of team IDs to include (the selected team and all its sub-teams)
          const teamIdsToInclude = [props.selectedTeam];
          
          // Find all child teams recursively
          const findChildTeams = (parentId) => {
            const childTeams = allTeams.filter(t => t.parentTeam && t.parentTeam._id === parentId);
            
            childTeams.forEach(childTeam => {
              teamIdsToInclude.push(childTeam._id);
              findChildTeams(childTeam._id); // Recursively find nested children
            });
          };
          
          // Start recursive search for child teams
          findChildTeams(props.selectedTeam);
          
          // Filter crawls to only include those from the selected team or its children
          filtered = filtered.filter(crawl => {
            // Handle both populated and unpopulated team references
            if (!crawl.team) return false;
            try {
              const teamId = typeof crawl.team === 'object' ? crawl.team._id : crawl.team;
              return teamIdsToInclude.includes(teamId);
            } catch (error) {
              console.error('Error comparing team IDs:', error);
              return false;
            }
          });
          
          console.log('TeamStats: Filtered by team hierarchy:', props.selectedTeam, 'including sub-teams:', teamIdsToInclude);
        } else {
          // Fallback to original filtering if selected team not found
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
          });
        }
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
      console.log('Processing crawls for issues:', filteredCrawls.value);
      filteredCrawls.value.forEach(crawl => {
        // Check violationsByImpact first
        if (crawl.violationsByImpact) {
          Object.entries(crawl.violationsByImpact).forEach(([impact, count]) => {
            const key = `${impact} impact violations`;
            if (!issues[key]) issues[key] = 0
            issues[key] += count;
          })
        }
        
        // Also check individual violations if available
        if (Array.isArray(crawl.violations) && crawl.violations.length > 0) {
          console.log('Found violations for crawl:', crawl.domain, crawl.violations);
          crawl.violations.forEach(violation => {
            const key = violation.help || violation.description || violation.id;
            if (!issues[key]) issues[key] = 0;
            issues[key]++;
          });
        }
      })
      
      console.log('Processed issues:', issues);
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

    const formatIssueTitle = (issue) => {
      // If it's an impact summary, return as is
      if (issue.includes('impact violations')) {
        return issue;
      }
      // Otherwise format the issue title
      return issue.charAt(0).toUpperCase() + issue.slice(1)
        .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
        .trim();
    }
    
    const isImpactSummary = (issue) => {
      return issue.includes('impact violations');
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
      availableTeams,
      filteredCrawls,
      formatIssueTitle,
      isImpactSummary
    }
  }
}
</script>

<style scoped>
.team-stats {
  margin-bottom: 40px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.core-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.detailed-analysis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  background: var(--card-background);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: 100%;
}

.issues-section  {
  height: 400px; /* Match height of trend graph */
  display: flex;
  flex-direction: column;
}

.issues-section .stat-card {
  height: 300px;
}

.issues-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
}

.stat-card h3 {
  color: var(--text-color);
  font-size: 1rem;
  margin-bottom: 10px;
}

.issues-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.issues-list li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  font-size: 0.9rem;
  line-height: 1.4;
}

.issue-count {
  background: var(--background-color);
  padding: 2px 8px;
  border-radius: 12px;
  margin-right: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 10px 0;
}

.stat-description {
  color: #666;
  font-size: 0.9rem;
}

/* Score color classes */
.score-excellent { color: #4CAF50; }
.score-good { color: #8BC34A; }
.score-fair { color: #FFC107; }
.score-poor { color: #F44336; }
.score-pending { color: #9E9E9E; }

.issue-text {
  flex: 1;
}

.no-issues {
  color: #666;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.trend-section {
  height: 400px;
}

.trend-section h3 {
  margin-bottom: 20px;
  color: var(--text-color);
  font-size: 1.2em;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .detailed-analysis {
    grid-template-columns: 1fr;
  }
  
  .issues-section .stat-card {
    height: 300px;
  }
}

.issue-title {
  display: block;
  font-weight: 500;
}

.issue-impact {
  font-size: 0.85em;
  color: #666;
}
</style> 