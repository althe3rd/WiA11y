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

    <div class="queue-actions" v-if="isNetworkAdmin">
      <button @click="clearStuckCrawls" class="clear-stuck-button" :disabled="isClearing">
        {{ isClearing ? 'Cleaning...' : 'Clear Stuck Crawls' }}
      </button>
      <button @click="resetActiveCrawls" class="reset-button" :disabled="isResetting">
        {{ isResetting ? 'Resetting...' : 'Reset Active Crawls' }}
      </button>
      <div class="button-tip">Force reset: <input type="checkbox" v-model="forceReset" /> (Caution: Will mark all in-progress crawls as failed)</div>
      <div v-if="clearResult" class="clear-result">
        <div class="clear-summary">
          <div class="clear-item">
            <span class="clear-label">Stuck Crawls:</span>
            <span class="clear-value">{{ clearResult.stuckCrawls }}</span>
          </div>
          <div class="clear-item">
            <span class="clear-label">Stuck Queue Items:</span>
            <span class="clear-value">{{ clearResult.stuckQueueItems }}</span>
          </div>
          <div class="clear-item">
            <span class="clear-label">Processing Items:</span>
            <span class="clear-value">{{ clearResult.processingItems }}</span>
          </div>
        </div>
      </div>
      <div v-if="resetResult" class="reset-result">
        <div class="reset-summary">
          <div class="reset-item">
            <span class="reset-label">Crawls In Progress:</span>
            <span class="reset-value">{{ resetResult.crawlsInProgressBefore }}</span>
          </div>
          <div class="reset-item">
            <span class="reset-label">Active Crawls Before:</span>
            <span class="reset-value">{{ resetResult.activeCrawlsBeforeReset }}</span>
          </div>
          <div class="reset-item">
            <span class="reset-label">Active Crawls After:</span>
            <span class="reset-value">{{ resetResult.activeCrawlsAfterReset }}</span>
          </div>
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
import { ref, onMounted, onUnmounted, computed, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import api from '../api/axios'
import notify from '../utils/notify'

export default {
  name: 'QueueView',
  setup() {
    const store = useStore()
    const queueItems = ref([])
    const activeScans = ref(0)
    const queuedScans = ref(0)
    const loading = ref(true)
    const error = ref(null)
    const pollInterval = ref(null)
    const isClearing = ref(false)
    const clearResult = ref(null)
    const isResetting = ref(false)
    const forceReset = ref(false)
    const resetResult = ref(null)
    
    // Check if user is a network admin
    const isNetworkAdmin = computed(() => {
      return store.getters.isNetworkAdmin
    })

    const fetchQueue = async () => {
      try {
        console.log('Fetching queue data...');
        const response = await api.get('/api/queue');
        console.log('Queue data received:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          queueItems.value = response.data;
          
          // Check for active crawls directly from the queue items
          const processingItems = queueItems.value.filter(item => item.status === 'processing');
          activeScans.value = processingItems.length;
          queuedScans.value = queueItems.value.filter(item => item.status === 'queued').length;
          
          console.log('Queue stats updated:', {
            total: queueItems.value.length,
            active: activeScans.value,
            queued: queuedScans.value,
            processingItems: processingItems.map(item => item.domain || item._id)
          });
          
          // If we have processing items but activeScans is 0, also check the queue status endpoint
          if (processingItems.length === 0 && activeScans.value === 0) {
            try {
              const statusResponse = await api.get('/api/queue/status');
              console.log('Queue status data:', statusResponse.data);
              if (statusResponse.data && statusResponse.data.activeCrawls > 0) {
                activeScans.value = statusResponse.data.activeCrawls;
                console.log('Updated active scans from queue status:', activeScans.value);
              }
            } catch (err) {
              console.error('Failed to get queue status:', err);
            }
          }
        } else {
          console.error('Unexpected queue data format:', response.data);
        }
      } catch (error) {
        console.error('Failed to fetch queue:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
      }
    }

    const cancelScan = async (crawlId) => {
      try {
        const confirmed = await notify.confirm('Are you sure you want to cancel this scan?', {
          type: 'warning',
          confirmText: 'Yes, Cancel Scan',
          cancelText: 'No, Keep in Queue'
        });
        
        if (!confirmed) {
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

    // Clear stuck crawls
    const clearStuckCrawls = async () => {
      try {
        isClearing.value = true
        clearResult.value = null
        
        const { data } = await api.post('/api/queue/clear-stuck')
        clearResult.value = data.details
        
        // Refresh queue items
        await fetchQueue()
      } catch (error) {
        console.error('Error clearing stuck crawls:', error)
        alert('Failed to clear stuck crawls')
      } finally {
        isClearing.value = false
      }
    }

    // Reset active crawls
    const resetActiveCrawls = async () => {
      try {
        isResetting.value = true
        resetResult.value = null
        
        const { data } = await api.post(`/api/queue/reset-active-crawls?force=${forceReset.value}`)
        resetResult.value = data.details
        
        // Refresh queue items
        await fetchQueue()
      } catch (error) {
        console.error('Error resetting active crawls:', error)
        alert('Failed to reset active crawls')
      } finally {
        isResetting.value = false
      }
    }

    onMounted(() => {
      fetchQueue()
      pollInterval.value = setInterval(fetchQueue, 5000)
    })

    onUnmounted(() => {
      if (pollInterval.value) clearInterval(pollInterval.value)
    })

    return {
      queueItems,
      activeScans,
      queuedScans,
      formatCrawlRate,
      cancelScan,
      isNetworkAdmin,
      clearStuckCrawls,
      isClearing,
      clearResult,
      isResetting,
      resetActiveCrawls,
      forceReset,
      resetResult
    }
  }
}
</script>

<style scoped>
.queue-view {
  padding: 40px;
  max-width: var(--container-width);
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

.queue-actions {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 600px;
}

.clear-stuck-button {
  padding: 12px 16px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.clear-stuck-button:hover {
  background-color: #c82333;
}

.clear-stuck-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.reset-button {
  padding: 12px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.reset-button:hover {
  background-color: #0056b3;
}

.reset-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.button-tip {
  font-size: 0.9em;
  color: #666;
}

.clear-result {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 16px;
  margin-top: 10px;
}

.reset-result {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 16px;
  margin-top: 10px;
}

.clear-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.reset-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.clear-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.reset-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.clear-label {
  font-size: 14px;
  color: #6c757d;
}

.reset-label {
  font-size: 14px;
  color: #6c757d;
}

.clear-value {
  font-size: 16px;
  font-weight: 600;
}

.reset-value {
  font-size: 16px;
  font-weight: 600;
}
</style> 