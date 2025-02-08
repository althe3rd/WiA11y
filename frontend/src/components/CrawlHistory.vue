<template>
  <div class="crawl-history">
    <h2>Crawl History</h2>
    <div class="crawl-list">
      <div v-for="crawl in crawls" :key="crawl._id" class="crawl-item">
        <div class="crawl-header">
          <h3>{{ crawl.domain }}</h3>
          <div class="crawl-stats">
            <span class="score">{{ crawl.accessibilityScore.toFixed(0) }}%</span>
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
</template>

<script>
import axios from 'axios';

export default {
  name: 'CrawlHistory',
  data() {
    return {
      crawls: [],
      pollInterval: null
    }
  },
  methods: {
    async fetchCrawls() {
      try {
        const response = await axios.get('http://localhost:3000/api/crawls');
        this.crawls = response.data;
      } catch (error) {
        console.error('Failed to fetch crawls:', error);
      }
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
</style> 