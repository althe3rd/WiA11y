<template>
  <div class="crawl-history">
    <h2>Crawl History</h2>
    <div class="crawl-list">
      <div v-for="(domainData, domain) in groupedCrawls" :key="domain" class="domain-group">
        <div class="domain-header" @click="toggleDomain(domain)">
          <h3>{{ domain }}</h3>
          <div class="domain-summary">
            <span class="latest-score">
              Latest: {{ getLatestScore(domainData) }}%
            </span>
            <span class="trend-summary" :class="getDomainOverallTrendClass(domainData)">
              {{ getDomainOverallTrendSummary(domainData) }}
            </span>
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
                <div class="crawl-timestamp">
                  {{ formatDate(crawl.createdAt) }}
                </div>
                <div class="crawl-stats">
                  <span class="score">{{ crawl.accessibilityScore.toFixed(0) }}%</span>
                  <span 
                    v-if="index < crawls.length - 1" 
                    :class="['score-trend', getScoreTrendClass(crawl.accessibilityScore, crawls[index + 1].accessibilityScore)]"
                  >
                    {{ getScoreDifference(crawl.accessibilityScore, crawls[index + 1].accessibilityScore) }}
                  </span>
                  <span :class="['status', crawl.status]">{{ crawl.status }}</span>
                  <div class="crawl-actions">
                    <button 
                      v-if="crawl.status === 'in_progress'" 
                      @click="cancelCrawl(crawl._id)"
                      class="cancel-button"
                    >
                      Cancel
                    </button>
                    <button 
                      v-if="crawl.status === 'completed' || crawl.status === 'cancelled'"
                      @click="removeCrawl(crawl._id)"
                      class="remove-button"
                    >
                      Remove
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
                <div class="violation-counts">
                  <span class="violation critical">
                    {{ crawl.violationsByImpact.critical }}
                    <small>Critical</small>
                  </span>
                  <span class="violation serious">
                    {{ crawl.violationsByImpact.serious }}
                    <small>Serious</small>
                  </span>
                  <span class="violation moderate">
                    {{ crawl.violationsByImpact.moderate }}
                    <small>Moderate</small>
                  </span>
                  <span class="violation minor">
                    {{ crawl.violationsByImpact.minor }}
                    <small>Minor</small>
                  </span>
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
import AccessibilityTrendGraph from './AccessibilityTrendGraph.vue';

export default {
  name: 'CrawlHistory',
  components: {
    AccessibilityTrendGraph
  },
  data() {
    return {
      crawls: [],
      pollInterval: null,
      expandedDomains: []
    }
  },
  computed: {
    groupedCrawls() {
      // First group by domain
      const grouped = this.crawls.reduce((acc, crawl) => {
        if (!acc[crawl.domain]) {
          acc[crawl.domain] = {};
        }
        // Then subgroup by WCAG specification
        const wcagKey = `WCAG ${crawl.wcagVersion} Level ${crawl.wcagLevel}`;
        if (!acc[crawl.domain][wcagKey]) {
          acc[crawl.domain][wcagKey] = [];
        }
        acc[crawl.domain][wcagKey].push(crawl);
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
        const response = await axios.get('http://localhost:3000/api/crawls');
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
        await axios.delete(`http://localhost:3000/api/crawls/${crawlId}`);
        // Remove from local state
        this.crawls = this.crawls.filter(crawl => crawl._id !== crawlId);
      } catch (error) {
        console.error('Failed to remove crawl:', error);
      }
    },
    async cancelCrawl(crawlId) {
      try {
        await axios.post(`http://localhost:3000/api/crawls/${crawlId}/cancel`);
        await this.fetchCrawls(); // Refresh the list
      } catch (error) {
        console.error('Failed to cancel crawl:', error);
      }
    },
    getScoreDifference(currentScore, previousScore) {
      const diff = (currentScore - previousScore).toFixed(1);
      return diff > 0 ? `+${diff}%` : `${diff}%`;
    },
    getScoreTrendClass(currentScore, previousScore) {
      if (currentScore === previousScore) return 'neutral';
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
      return latestCrawl ? latestCrawl.accessibilityScore.toFixed(0) : 'N/A';
    },
    getDomainOverallTrendClass(domainData) {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'neutral';
      const first = allCrawls[0].accessibilityScore;
      const last = allCrawls[allCrawls.length - 1].accessibilityScore;
      if (first === last) return 'neutral';
      return last > first ? 'improved' : 'declined';
    },
    getDomainOverallTrendSummary(domainData) {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'No trend data';
      const first = allCrawls[0].accessibilityScore;
      const last = allCrawls[allCrawls.length - 1].accessibilityScore;
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
  padding: 20px;
}

.crawl-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.crawl-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
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
  border-radius: 4px;
  font-size: 0.9em;
}

.status.completed {
  background-color: #4CAF50;
  color: white;
}

.status.in_progress {
  background-color: #2196F3;
  color: white;
}

.status.cancelled {
  background-color: #9e9e9e;
  color: white;
}

.status.failed {
  background-color: #f44336;
  color: white;
}

.crawl-details p {
  margin: 8px 0;
  color: #666;
}

.crawl-details p strong {
  color: #2c3e50;
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
  background-color: #f44336;
  color: white;
}

.cancel-button:hover,
.remove-button:hover {
  opacity: 0.9;
}

.domain-group {
  margin-bottom: 40px;
}

.domain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.5em;
  color: #2c3e50;
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.domain-header:hover {
  background-color: #f5f5f5;
}

.crawl-timestamp {
  color: #666;
  font-size: 0.9em;
}

.crawl-item {
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.crawl-item:last-child {
  margin-bottom: 0;
}

.domain-summary {
  font-size: 0.6em;
  padding: 5px 10px;
  border-radius: 4px;
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
  background: #f9f9f9;
  border-radius: 8px;
}

.wcag-header {
  font-size: 1.2em;
  color: #2c3e50;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.wcag-group:last-child {
  margin-bottom: 0;
}
</style> 