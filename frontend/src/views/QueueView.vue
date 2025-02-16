<template>
  <div class="queue-view">
    <div class="page-header">
      <h1>Scan Queue</h1>
      <div class="queue-stats">
        <div class="stat">
          <span class="label">Active Scans:</span>
          <span class="value">{{ activeScans }}</span>
        </div>
        <div class="stat">
          <span class="label">Queued Scans:</span>
          <span class="value">{{ queuedScans }}</span>
        </div>
      </div>
    </div>

    <div class="queue-list">
      <div v-if="queueItems.length === 0" class="no-items">
        <p>No scans currently in queue or processing</p>
      </div>
      <div v-for="item in queueItems" :key="item.position" class="queue-item">
        <div class="position-badge" :class="{ 'active': item.status === 'processing' }">
          {{ item.status === 'processing' ? 'Active' : `#${item.position}` }}
        </div>
        <div class="item-details">
          <div class="main-info">
            <h3>{{ item.domain }}</h3>
            <div class="meta">
              <span>Team: {{ item.team }}</span>
              <span>By: {{ item.createdBy }}</span>
            </div>
          </div>
          <div class="scan-specs">
            <span>WCAG {{ item.wcagVersion }} Level {{ item.wcagLevel }}</span>
            <span>Depth: {{ item.depthLimit }}</span>
            <span>Speed: {{ formatCrawlRate(item.crawlRate) }}</span>
          </div>
          <div v-if="item.status === 'processing'" class="progress-info">
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ width: `${item.progress}%` }"
              ></div>
            </div>
            <span class="progress-text">
              {{ item.progress }}% Complete
              ({{ item.pagesScanned }} pages scanned)
            </span>
          </div>
          <div v-if="!item.isAccessible" class="private-notice">
            Limited visibility - Not in your team
          </div>
          <button 
            v-if="item.status === 'processing' || item.status === 'queued'"
            @click="cancelScan(item._id)"
            class="cancel-button"
            title="Cancel scan"
          >
            Cancel Scan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../api/axios'

export default {
  name: 'QueueView',
  setup() {
    const queueItems = ref([])
    const activeScans = ref(0)
    const queuedScans = ref(0)
    let pollInterval = null

    const fetchQueue = async () => {
      try {
        console.log('Fetching queue data...')
        const response = await api.get('/api/queue')
        console.log('Queue data received:', response.data)
        queueItems.value = response.data
        activeScans.value = queueItems.value.filter(item => item.status === 'processing').length
        queuedScans.value = queueItems.value.filter(item => item.status === 'queued').length
        console.log('Queue stats:', {
          active: activeScans.value,
          queued: queuedScans.value
        })
      } catch (error) {
        console.error('Failed to fetch queue:', error)
      }
    }

    const cancelScan = async (crawlId) => {
      try {
        if (!confirm('Are you sure you want to cancel this scan?')) {
          return;
        }
        await api.post(`/api/crawls/${crawlId}/cancel`);
        // Refresh the queue immediately after cancellation
        await fetchQueue();
      } catch (error) {
        console.error('Failed to cancel scan:', error);
        alert('Failed to cancel scan. Please try again.');
      }
    }

    const formatCrawlRate = (rate) => {
      if (rate <= 10) return 'Slow'
      if (rate <= 30) return 'Medium'
      return 'Fast'
    }

    onMounted(() => {
      fetchQueue()
      pollInterval = setInterval(fetchQueue, 5000)
    })

    onUnmounted(() => {
      if (pollInterval) clearInterval(pollInterval)
    })

    return {
      queueItems,
      activeScans,
      queuedScans,
      formatCrawlRate,
      cancelScan
    }
  }
}
</script>

<style scoped>
.queue-view {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.queue-stats {
  display: flex;
  gap: 20px;
}

.stat {
  background: var(--card-background);
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat .label {
  color: #666;
  margin-right: 10px;
}

.stat .value {
  font-weight: 600;
  color: var(--primary-color);
}

.queue-item {
  background: var(--card-background);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.position-badge {
  background: var(--background-color);
  color: #666;
  padding: 10px;
  border-radius: 6px;
  min-width: 60px;
  text-align: center;
  font-weight: 500;
}

.position-badge.active {
  background: var(--primary-color);
  color: white;
}

.item-details {
  flex: 1;
}

.main-info h3 {
  margin: 0;
  color: var(--text-color);
}

.meta {
  color: #666;
  font-size: 0.9em;
  margin-top: 5px;
}

.meta span {
  margin-right: 15px;
}

.scan-specs {
  margin-top: 10px;
  display: flex;
  gap: 15px;
  color: #666;
  font-size: 0.9em;
}

.progress-info {
  margin-top: 15px;
}

.progress-bar {
  height: 8px;
  background: var(--background-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9em;
  color: #666;
  margin-top: 5px;
  display: block;
}

.private-notice {
  margin-top: 10px;
  padding: 5px 10px;
  background: #fff3e0;
  color: #ef6c00;
  border-radius: 4px;
  font-size: 0.9em;
  display: inline-block;
}

.no-items {
  background: var(--card-background);
  padding: 40px;
  text-align: center;
  border-radius: 8px;
  color: #666;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.no-items p {
  margin: 0;
  font-size: 1.1em;
}

.cancel-button {
  margin-top: 15px;
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
}

.cancel-button:hover {
  background-color: #c82333;
}
</style> 