<template>
  <div class="crawl-list">
    <h2>Crawl History</h2>
    <div v-if="crawls.length === 0" class="no-crawls">
      No crawls started yet
    </div>
    <div v-else class="crawls">
      <div v-for="crawl in crawls" :key="crawl._id" class="crawl-item">
        <div class="crawl-header">
          <h3>{{ crawl.domain }}</h3>
          <div class="header-info">
            <div class="score-badge" :class="getScoreClass(crawl.accessibilityScore)">
              {{ Math.round(crawl.accessibilityScore) }}%
            </div>
            <span :class="['status', crawl.status]">{{ crawl.status }}</span>
          </div>
        </div>
        <div class="crawl-details">
          <p>Speed: {{ getCrawlSpeedLabel(crawl.crawlRate) }}</p>
          <p>Depth Limit: {{ getDepthLabel(crawl.depthLimit) }}</p>
          <p>Pages Scanned: {{ crawl.pagesScanned }}</p>
          <div class="violations-summary">
            <h4>Violations Found: {{ crawl.violationsFound }}</h4>
            <div class="violations-by-impact">
              <div v-if="crawl.violationsByImpact?.critical" class="violation-count critical">
                <span class="count">{{ crawl.violationsByImpact.critical }}</span>
                <span class="label">Critical</span>
              </div>
              <div v-if="crawl.violationsByImpact?.serious" class="violation-count serious">
                <span class="count">{{ crawl.violationsByImpact.serious }}</span>
                <span class="label">Serious</span>
              </div>
              <div v-if="crawl.violationsByImpact?.moderate" class="violation-count moderate">
                <span class="count">{{ crawl.violationsByImpact.moderate }}</span>
                <span class="label">Moderate</span>
              </div>
              <div v-if="crawl.violationsByImpact?.minor" class="violation-count minor">
                <span class="count">{{ crawl.violationsByImpact.minor }}</span>
                <span class="label">Minor</span>
              </div>
            </div>
          </div>
          <p v-if="crawl.error" class="error">Error: {{ crawl.error }}</p>
          <button 
            v-if="crawl.status === 'in_progress'"
            @click="cancelCrawl(crawl._id)"
            class="cancel-button"
            :disabled="cancellingIds.has(crawl._id)"
          >
            {{ cancellingIds.has(crawl._id) ? 'Cancelling...' : 'Cancel Crawl' }}
          </button>
          <button 
            v-if="['pending', 'cancelled'].includes(crawl.status)"
            @click="removeCrawl(crawl._id)"
            class="remove-button"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'CrawlList',
  data() {
    return {
      crawls: [],
      cancellingIds: new Set()
    }
  },
  async created() {
    await this.fetchCrawls();
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
    async cancelCrawl(id) {
      try {
        this.cancellingIds.add(id);
        await axios.post(`http://localhost:3000/api/crawls/${id}/cancel`);
        await this.fetchCrawls();
      } catch (error) {
        console.error('Failed to cancel crawl:', error);
      } finally {
        this.cancellingIds.delete(id);
      }
    },
    async removeCrawl(id) {
      try {
        await axios.delete(`http://localhost:3000/api/crawls/${id}`);
        await this.fetchCrawls();
      } catch (error) {
        console.error('Failed to remove crawl:', error);
      }
    },
    getCrawlSpeedLabel(rate) {
      if (rate <= 10) return 'Slow';
      if (rate <= 30) return 'Medium';
      return 'Fast';
    },
    getScoreClass(score) {
      if (score >= 90) return 'excellent';
      if (score >= 80) return 'good';
      if (score >= 70) return 'fair';
      return 'poor';
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
    }
  },
  mounted() {
    this.pollInterval = setInterval(this.fetchCrawls, 5000);
  },
  beforeDestroy() {
    clearInterval(this.pollInterval);
  }
}
</script>

<style scoped>
.crawl-list {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
}

.crawl-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 15px;
}

.crawl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 1.1em;
}

.score-badge.excellent {
  background-color: #4CAF50;
  color: white;
}

.score-badge.good {
  background-color: #8BC34A;
  color: white;
}

.score-badge.fair {
  background-color: #FFC107;
  color: black;
}

.score-badge.poor {
  background-color: #F44336;
  color: white;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.status.pending {
  background-color: #ffd700;
}

.status.in_progress {
  background-color: #87ceeb;
}

.status.completed {
  background-color: #90ee90;
}

.status.failed {
  background-color: #ffcccb;
}

.status.cancelled {
  background-color: #808080;
}

.crawl-details {
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
}

.cancel-button {
  background-color: #ff4444;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.cancel-button:hover {
  background-color: #cc0000;
}

.error {
  color: #ff0000;
  margin-top: 5px;
}

.remove-button {
  background-color: #ff9800;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.remove-button:hover {
  background-color: #f57c00;
}

.violations-summary {
  margin: 10px 0;
}

.violations-by-impact {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.violation-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  min-width: 80px;
}

.violation-count .count {
  font-size: 1.2em;
  font-weight: bold;
}

.violation-count .label {
  font-size: 0.8em;
}

.violation-count.critical {
  background-color: #ffebee;
  color: #c62828;
}

.violation-count.serious {
  background-color: #fff3e0;
  color: #ef6c00;
}

.violation-count.moderate {
  background-color: #fff8e1;
  color: #f9a825;
}

.violation-count.minor {
  background-color: #e8f5e9;
  color: #2e7d32;
}
</style> 