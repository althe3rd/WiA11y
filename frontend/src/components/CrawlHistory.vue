<template>
  <div class="crawl-history">
    
    <div class="crawl-list">
      <div v-for="(domainData, domain) in groupedCrawls" :key="domain" class="domain-group">
        <div 
          class="domain-header" 
          :class="{ 'expanded': expandedDomains.includes(domain) }"
          @click="toggleDomain(domain)"
        >
          <h3>{{ domain }}</h3>
          <div class="domain-summary">
            <span class="latest-score">
              Latest: {{ getLatestScore(domainData) }}%
            </span>
            <span class="trend-summary" :class="getDomainOverallTrendClass(domainData)">
              {{ getDomainOverallTrendSummary(domainData) }}
            </span>
            <div v-if="getInProgressScan(domainData)" class="progress-bar-container">
              <div class="progress-bar" :style="{ transform: `translateX(${getInProgressScan(domainData).progress}%)` }">
              </div>
            </div>
            <span class="expand-toggle">
              {{ expandedDomains.includes(domain) ? '▼' : '▶' }}
            </span>
          </div>
        </div>
        <div v-if="expandedDomains.includes(domain)" class="domain-details">
          <div v-for="(crawls, wcagSpec) in domainData" :key="wcagSpec" class="wcag-group">
            <h4 class="wcag-header">{{ wcagSpec }}</h4>
            <AccessibilityTrendGraph :crawls="crawls" />
            <div v-for="(crawl, index) in crawls" :key="crawl._id" class="crawl-item">
              <div class="crawl-header">
                <div class="crawl-title">
                  <div class="crawl-timestamp">
                    <font-awesome-icon icon="fa-calendar" class="timestamp-icon" />
                    {{ formatDate(crawl.createdAt) }}
                  </div>
                  <span :class="['status', crawl.status]">{{ formatStatus(crawl) }}</span>
                </div>
                <div class="crawl-stats">
                  <div class="score" :class="getScoreClass(calculateScore(crawl))">
                    {{ calculateScore(crawl) }}%
                  </div>
                  <span 
                    v-if="index < crawls.length - 1" 
                    :class="['score-trend', getScoreTrendClass(calculateScore(crawl), calculateScore(crawls[index + 1]))]"
                  >
                    {{ getScoreDifference(calculateScore(crawl), calculateScore(crawls[index + 1])) }}
                  </span>
                  <button class="view-details-btn" @click="viewDetails(crawl)">
                    <font-awesome-icon icon="fa-chart-line" class="details-icon" />
                    View Details
                  </button>
                  <div v-if="crawl.status === 'queued'" class="queue-position">
                    Queue Position: {{ crawl.queuePosition }}
                  </div>
                  <LoadingSpinner 
                    v-if="['in_progress', 'queued'].includes(crawl.status)"
                    :text="crawl.status === 'queued' ? 'Queued...' : 'Scanning...'"
                    class="crawl-spinner"
                  />
                  <div class="crawl-actions">
                    <button 
                      v-if="crawl.status === 'in_progress'" 
                      @click="cancelCrawl(crawl._id)"
                      class="cancel-button"
                    >
                      Cancel
                    </button>
                    <button 
                      v-if="['completed', 'cancelled', 'pending', 'failed'].includes(crawl.status)"
                      @click="removeCrawl(crawl._id)"
                      class="remove-button"
                      title="Remove scan"
                    >
                      <font-awesome-icon icon="fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="crawl-details">
                <p>Speed: {{ getCrawlSpeed(crawl.crawlRate) }}</p>
                <p>Depth Limit: {{ getDepthLabel(crawl.depthLimit) }}</p>
                <p>WCAG Specification: {{ getWcagSpec(crawl) }}</p>
                <p>Pages Scanned: {{ crawl.pagesScanned }}</p>
                <p>Violations Found: {{ crawl.violationsFound }}</p>
                <div class="violations-bar">
                  <div 
                    v-if="crawl.violationsByImpact.critical > 0"
                    class="violation-segment critical"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.critical, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.critical }}
                  </div>
                  <div 
                    v-if="crawl.violationsByImpact.serious > 0"
                    class="violation-segment serious"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.serious, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.serious }}
                  </div>
                  <div 
                    v-if="crawl.violationsByImpact.moderate > 0"
                    class="violation-segment moderate"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.moderate, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.moderate }}
                  </div>
                  <div 
                    v-if="crawl.violationsByImpact.minor > 0"
                    class="violation-segment minor"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.minor, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.minor }}
                  </div>
                </div>
                <div class="violations-legend">
                  <div class="legend-item">
                    <span class="legend-color critical"></span>
                    <span>Critical</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color serious"></span>
                    <span>Serious</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color moderate"></span>
                    <span>Moderate</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color minor"></span>
                    <span>Minor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { ref } from 'vue';
import AccessibilityTrendGraph from './AccessibilityTrendGraph.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import { useRouter } from 'vue-router';
import CrawlProgress from './CrawlProgress.vue';

export default {
  name: 'CrawlHistory',
  props: {
    selectedTeam: {
      type: String,
      default: ''
    },
    selectedDateRange: {
      type: String,
      default: 'all'
    },
    limit: {
      type: Number,
      default: 10 // Show all when 0, otherwise limit to this number
    }
  },
  components: {
    AccessibilityTrendGraph,
    LoadingSpinner,
    CrawlProgress
  },
  setup() {
    const router = useRouter();
    const crawls = ref([]);
    const pollInterval = ref(null);
    const expandedDomains = ref([]);
    
    const viewDetails = (crawl) => {
      router.push(`/scans/${crawl._id}`);
    };
    
    return {
      crawls,
      pollInterval,
      expandedDomains,
      viewDetails
    };
  },
  computed: {
    groupedCrawls() {
      // Filter crawls based on selected team and date range
      let filtered = this.crawls;
      
      // Filter by team if selected
      if (this.selectedTeam) {
        filtered = filtered.filter(crawl => {
          if (!crawl.team) return false;
          try {
            const teamId = typeof crawl.team === 'object' ? crawl.team._id : crawl.team;
            return teamId?.toString() === this.selectedTeam?.toString();
          } catch (error) {
            console.error('Error comparing team IDs:', error);
            return false;
          }
        });
      }
      
      // Get unique domains
      const uniqueDomains = [...new Set(filtered.map(crawl => crawl.domain))];
      
      // Apply limit if set
      if (this.limit > 0) {
        uniqueDomains.splice(this.limit);
      }
      
      // Filter crawls to only include the limited domains
      if (this.limit > 0) {
        filtered = filtered.filter(crawl => uniqueDomains.includes(crawl.domain));
      }

      // Filter by date range
      if (this.selectedDateRange !== 'all') {
        const now = new Date();
        const ranges = {
          week: 7,
          month: 30,
          quarter: 90
        };
        const days = ranges[this.selectedDateRange];
        const cutoff = new Date(now.setDate(now.getDate() - days));
        
        filtered = filtered.filter(crawl => 
          new Date(crawl.createdAt) >= cutoff
        );
      }

      // First group by domain
      const grouped = filtered.reduce((acc, crawl) => {
        const key = this.normalizeDomain(crawl.domain);
        if (!acc[key]) {
          acc[key] = {};
        }
        // Then subgroup by WCAG specification
        const wcagKey = `WCAG ${crawl.wcagVersion} Level ${crawl.wcagLevel}`;
        if (!acc[key][wcagKey]) {
          acc[key][wcagKey] = [];
        }
        acc[key][wcagKey].push(crawl);
        return acc;
      }, {});
      
      // Sort crawls within each WCAG specification by date
      Object.keys(grouped).forEach(domain => {
        Object.keys(grouped[domain]).forEach(wcagSpec => {
          grouped[domain][wcagSpec].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
      });
      
      // Sort domains by most recent crawl
      const sortedGrouped = Object.fromEntries(
        Object.entries(grouped).sort(([,a], [,b]) => {
          const latestA = Math.max(...Object.values(a).flat().map(c => new Date(c.createdAt)));
          const latestB = Math.max(...Object.values(b).flat().map(c => new Date(c.createdAt)));
          return latestB - latestA;
        })
      );
      
      return sortedGrouped;
    }
  },
  methods: {
    normalizeDomain(domain) {
      return domain.replace(/^www\./i, '');
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(date);
    },
    async fetchCrawls() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.VUE_APP_API_URL}/api/crawls`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        this.crawls = response.data;
      } catch (error) {
        console.error('Failed to fetch crawls:', error);
      }
    },
    getWcagSpec(crawl) {
      return `WCAG ${crawl.wcagVersion} Level ${crawl.wcagLevel}`;
    },
    getCrawlSpeed(rate) {
      if (rate <= 10) return 'Slow';
      if (rate <= 30) return 'Medium';
      return 'Fast';
    },
    getDepthLabel(depth) {
      const labels = {
        1: 'Homepage Only (Level 1)',
        2: 'Shallow (2 Levels)',
        3: 'Medium (3 Levels)',
        4: 'Deep (4 Levels)',
        5: 'Very Deep (5 Levels)'
      };
      return labels[depth] || `${depth} Levels`;
    },
    async removeCrawl(crawlId) {
      try {
        if (!confirm('Are you sure you want to delete this crawl?')) {
          return;
        }
        const token = localStorage.getItem('token');
        await axios.delete(`${process.env.VUE_APP_API_URL}/api/crawls/${crawlId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Remove from local state
        this.crawls = this.crawls.filter(c => c._id !== crawlId);
      } catch (error) {
        console.error('Failed to remove crawl:', error);
        alert(error.response?.data?.error || 'Failed to remove crawl');
      }
    },
    async cancelCrawl(crawlId) {
      try {
        if (!confirm('Are you sure you want to cancel this crawl?')) {
          return;
        }
        const token = localStorage.getItem('token');
        const response = await axios.post(`${process.env.VUE_APP_API_URL}/api/crawls/${crawlId}/cancel`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Update local state
        const index = this.crawls.findIndex(c => c._id === crawlId);
        if (index !== -1) {
          this.crawls[index] = response.data;
        }
      } catch (error) {
        console.error('Failed to cancel crawl:', error);
        alert(error.response?.data?.error || 'Failed to cancel crawl');
      }
    },
    getScoreDifference(currentScore, previousScore) {
      if (currentScore === '—' || previousScore === '—') return '';
      const diff = (currentScore - previousScore).toFixed(1);
      return diff > 0 ? `+${diff}%` : `${diff}%`;
    },
    getScoreTrendClass(currentScore, previousScore) {
      if (currentScore === '—' || previousScore === '—' || currentScore === previousScore) return 'neutral';
      return currentScore > previousScore ? 'improved' : 'declined';
    },
    getLatestScore(domainData) {
      // Find the most recent crawl across all WCAG specifications
      const allCrawls = Object.values(domainData).flat();
      const latestCrawl = allCrawls.reduce((latest, current) => {
        return !latest || new Date(current.createdAt) > new Date(latest.createdAt) 
          ? current 
          : latest;
      }, null);
      return latestCrawl ? this.calculateScore(latestCrawl) : 'N/A';
    },
    getDomainOverallTrendClass(domainData) {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'neutral';
      
      const first = this.calculateScore(allCrawls[0]);
      const last = this.calculateScore(allCrawls[allCrawls.length - 1]);
      
      if (first === '—' || last === '—' || first === last) return 'neutral';
      return last > first ? 'improved' : 'declined';
    },
    getDomainOverallTrendSummary(domainData) {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'No trend data';
      
      const first = this.calculateScore(allCrawls[0]);
      const last = this.calculateScore(allCrawls[allCrawls.length - 1]);
      
      if (first === '—' || last === '—') return 'No trend data';
      
      const diff = (last - first).toFixed(1);
      const totalScans = allCrawls.length;
      if (diff > 0) {
        return `Improved by ${diff}% over ${totalScans} scans`;
      } else if (diff < 0) {
        return `Declined by ${Math.abs(diff)}% over ${totalScans} scans`;
      }
      return 'No change in score';
    },
    toggleDomain(domain) {
      const index = this.expandedDomains.indexOf(domain);
      if (index === -1) {
        this.expandedDomains.push(domain);
      } else {
        this.expandedDomains.splice(index, 1);
      }
    },
    calculateScore(crawl) {
      // If crawl hasn't started or no pages scanned yet, return null
      if (!crawl.status || crawl.status === 'pending' || !crawl.pagesScanned) {
        return '—';
      }
      
      // If no violations found and scan is complete, return 100
      if (crawl.violationsFound === 0 && crawl.status === 'completed') {
        return 100;
      }
      
      // Weight violations by severity
      const deductions = {
        critical: 15.0,   // Critical issues have major impact
        serious: 0.6,     // ~0.6 points per serious violation
        moderate: 0.2,    // ~0.2 points per moderate violation
        minor: 0.1       // Minor issues have minimal impact
      };
      
      // Calculate weighted deductions based on average violations per page
      if (crawl.violationsByImpact) {
        const { critical, serious, moderate, minor } = crawl.violationsByImpact;
        const pagesScanned = crawl.pagesScanned || 1; // Prevent division by zero
        
        // Calculate average violations per page for each severity
        const avgCritical = critical / pagesScanned;
        const avgSerious = serious / pagesScanned;
        const avgModerate = moderate / pagesScanned;
        const avgMinor = minor / pagesScanned;
        
        // Calculate total deduction using averages
        const totalDeduction = 
          (avgCritical * deductions.critical) +
          (avgSerious * deductions.serious) +
          (avgModerate * deductions.moderate) +
          (avgMinor * deductions.minor);
          
        let score = Math.max(0, Math.round(100 - totalDeduction));
        return score;
      }
      
      return '—';
    },
    getScoreClass(score) {
      if (score === '—') return 'score-pending';
      if (score >= 90) return 'score-excellent';
      if (score >= 70) return 'score-good';
      if (score >= 50) return 'score-fair';
      return 'score-poor';
    },
    formatStatus(crawl) {
      const statusMap = {
        completed: 'Completed',
        in_progress: 'In Progress',
        failed: 'Failed',
        cancelled: 'Cancelled',
        pending: 'Pending',
        queued: `Queued (#${crawl.queuePosition})`
      };
      return statusMap[crawl.status] || crawl.status;
    },
    displayDomain(crawl) {
      return this.normalizeDomain(crawl.domain);
    },
    getInProgressScan(domainData) {
      const allCrawls = Object.values(domainData).flat();
      const inProgressCrawl = allCrawls.find(crawl => crawl.status === 'in_progress');
      
      if (!inProgressCrawl) return null;
      
      // Calculate progress based on pages scanned vs page limit
      const progress = Math.min(
        ((inProgressCrawl.pagesScanned || 0) / (inProgressCrawl.pageLimit || 100)) * 100,
        100
      );
      
      return {
        ...inProgressCrawl,
        progress: progress - 100 // Offset for transform
      };
    },
    getViolationPercentage(violationCount, totalViolations) {
      // If there are no violations, return 0
      if (totalViolations === 0) return 0;
      // Calculate the percentage based on the total violations
      // This ensures all segments together will total 100%
      return (violationCount / totalViolations) * 100;
    },
    getTotalViolations(violationsByImpact) {
      return violationsByImpact.critical + 
             violationsByImpact.serious + 
             violationsByImpact.moderate + 
             violationsByImpact.minor;
    }
  },
  created() {
    this.fetchCrawls();
    this.pollInterval = setInterval(this.fetchCrawls, 5000);
  },
  beforeDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
</script>

<style scoped>
.crawl-history {
  
}

.crawl-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crawl-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-background);
}

.crawl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.crawl-stats {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.score {
  background-color: #4CAF50;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
}

.score-trend {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.score-trend.improved {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.score-trend.declined {
  background-color: #ffebee;
  color: #c62828;
}

.score-trend.neutral {
  background-color: #f5f5f5;
  color: #666;
}

.status {
  padding: 5px 10px;
  border-radius: 40px;
  font-size: 0.9em;
  line-height: 1;
}

.status.completed {
  background-color: #a3d266;
  color: white;
}

.status.in_progress {
  background-color: #67b5f5;
  color: white;
}

.status.cancelled {
  background-color: #9e9e9e;
  color: white;
}

.status.failed {
  background-color: #f46e64;
  color: white;
}

.status.pending {
  background-color: #ff9800;
  color: white;
}

.status.queued {
  background-color: #ff9800;
  color: white;
}

.crawl-details p {
  margin: 8px 0;
  color: #666;
}

.crawl-details p strong {
  color: var(--text-color);
}

.violation-counts {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.violation {
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  min-width: 80px;
}

.violation small {
  display: block;
  font-size: 0.8em;
  margin-top: 5px;
}

.critical {
  background-color: #ffebee;
  color: #c62828;
}

.serious {
  background-color: #fff3e0;
  color: #ef6c00;
}

.moderate {
  background-color: #fff8e1;
  color: #f9a825;
}

.minor {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.crawl-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.cancel-button,
.remove-button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.cancel-button {
  background-color: #ff9800;
  color: white;
}

.remove-button {
  background: none;
  border: none;
  color: #dc3545;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-button:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

.cancel-button:hover,
.remove-button:hover {
  opacity: 0.9;
}

.domain-group {
  
}

.domain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.5em;
  color: var(--text-color);
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.domain-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0;
}

.domain-header.expanded {
  background: var(--card-background);
  border-color: var(--border-color);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.domain-header.expanded + .domain-details {
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  margin-top: 0;
  border-color: var(--background-color);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.domain-header:hover {
  background-color: var(--background-color);
}

.domain-header.expanded:hover {
  background-color: var(--card-background);
}

.crawl-timestamp {
  color: var(--text-muted);
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.timestamp-icon {
  color: var(--text-muted);
  font-size: 0.9em;
}

.crawl-item {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-background);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.crawl-item:last-child {
  margin-bottom: 0;
}

.domain-summary {
  font-size: 0.6em;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.latest-score {
  font-weight: bold;
  color: #4CAF50;
  margin-right: 15px;
}

.trend-summary {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: normal;
}

.trend-summary.improved {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.trend-summary.declined {
  background-color: #ffebee;
  color: #c62828;
}

.trend-summary.neutral {
  background-color: #f5f5f5;
  color: #666;
}

.expand-toggle {
  margin-left: 15px;
  font-size: 0.8em;
  color: #666;
}

.domain-details {
  animation: slideDown 0.3s ease-out;

}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wcag-group {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--card-background);
  border-radius: 8px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  
  border: 1px solid var(--border-color);
}

.wcag-header {
  font-size: 1.2em;
  color: var(--text-color);
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.wcag-group:last-child {
  margin-bottom: 0;
}

.crawl-spinner {
  margin-left: 10px;
}

/* Make the spinner smaller in the crawl list */
.crawl-spinner :deep(.spinner) {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.crawl-spinner :deep(.spinner-text) {
  font-size: 0.8em;
}

.score-pending {
  background-color: var(--background-color);
  color: var(--text-color);
}

.score-excellent {
  background-color: #4CAF50;
  color: white;
}

.score-good {
  background-color: #8BC34A;
  color: white;
}

.score-fair {
  background-color: #FFC107;
  color: black;
}

.score-poor {
  background-color: #F44336;
  color: white;
}

.crawl-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-details-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  border: 1px solid var(--primary-color);
  color: var(--text-color);
  font-size: 0.9em;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.details-icon {
  font-size: 0.9em;
}

.queue-position {
  font-size: 0.9em;
  color: #666;
  margin-left: 10px;
}

.progress-bar-container {
  width: 100px;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  border: 1px solid #ededed;
}

.progress-bar {
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #a07ae8 0%, #1eafed 100%);
  
  position: absolute;
  left: 0;
  transform: translateX(-100%);
  transition: transform 0.5s ease-out;
}

/* Updated violation styles */
.violations-bar {
  height: 24px;
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  margin: 10px 0;
  background-color: var(--background-color);
}

.violation-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.violation-segment:hover {
  filter: brightness(1.1);
}

.violations-legend {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* Violation colors */
.violation-segment.critical,
.legend-color.critical {
  background-color: #dc3545;
}

.violation-segment.serious,
.legend-color.serious {
  background-color: #fd7e14;
}

.violation-segment.moderate,
.legend-color.moderate {
  background-color: #ffc107;
}

.violation-segment.minor,
.legend-color.minor {
  background-color: #198754;
}

/* Clean up scan instance styles */
.crawl-item {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.2s ease;
}

.crawl-item:last-child {
  margin-bottom: 0;
}

.crawl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.crawl-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crawl-timestamp {
  color: var(--text-muted);
  font-size: 0.9em;
}

.crawl-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.crawl-details {
  color: var(--text-color);
}

.crawl-details p {
  margin: 8px 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style> 