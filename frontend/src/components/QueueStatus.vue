<template>
  <div class="queue-status" :class="{ 'simplified': mode === 'simplified' }">
    <h3 class="status-title" v-if="mode === 'detailed'">Crawler Status</h3>
    
    <div class="status-card" v-if="mode === 'detailed'">
      <div class="status-metrics">
        <div class="metric">
          <span class="metric-label">Active Crawls:</span>
          <span class="metric-value">{{ queueStatus.activeCrawls }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Queued Crawls:</span>
          <span class="metric-value">{{ queueStatus.queuedCount }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Max Parallel Crawlers:</span>
          <span class="metric-value">{{ queueStatus.maxCrawlers }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Available Slots:</span>
          <span class="metric-value">{{ queueStatus.availableSlots }}</span>
        </div>
      </div>
      
      <div class="crawlers-visual">
        <div 
          v-for="i in queueStatus.maxCrawlers" 
          :key="i" 
          :class="['crawler-slot', i <= queueStatus.activeCrawls ? 'active' : 'available']"
          :title="i <= queueStatus.activeCrawls ? 'Active Crawler' : 'Available Slot'"
        >
          <span class="slot-indicator"></span>
        </div>
      </div>
      
      <div class="refresh-section">
        <span class="last-updated">Last updated: {{ lastUpdatedFormatted }}</span>
        <button @click="fetchQueueStatus" class="refresh-button">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    
    <!-- Simplified view for header -->
    <router-link v-if="mode === 'simplified'" to="/queue" class="simplified-status">
      <div class="simplified-metric">
        <span class="simplified-label">Active Crawls:</span>
        <div class="simplified-value-container">
          <span class="simplified-value" :class="{ 'has-active': queueStatus.activeCrawls > 0 }">
            {{ queueStatus.activeCrawls }}
          </span>
          <span v-if="queueStatus.activeCrawls > 0" class="status-dot active-dot" title="Active crawls running"></span>
        </div>
      </div>
      <div v-if="queueStatus.queuedCount > 0" class="simplified-metric">
        <span class="simplified-label">Queued:</span>
        <div class="simplified-value-container">
          <span class="simplified-value">{{ queueStatus.queuedCount }}</span>
          <span class="status-dot queue-dot" title="Crawls in queue"></span>
        </div>
      </div>
    </router-link>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import api from '../api/axios'

export default {
  name: 'QueueStatus',
  props: {
    mode: {
      type: String,
      default: 'detailed',
      validator: (value) => ['detailed', 'simplified'].includes(value)
    }
  },
  setup() {
    const queueStatus = ref({
      activeCrawls: 0,
      queuedCount: 0,
      maxCrawlers: 0,
      availableSlots: 0
    })
    const lastUpdated = ref(new Date())
    const pollingInterval = ref(null)
    
    const lastUpdatedFormatted = computed(() => {
      const date = new Date(lastUpdated.value)
      return date.toLocaleTimeString()
    })
    
    const fetchQueueStatus = async () => {
      try {
        console.log('Fetching queue status...');
        const { data } = await api.get('/api/queue/status');
        console.log('Queue status received:', data);
        
        if (data) {
          // Convert to the expected format
          queueStatus.value = {
            activeCrawls: data.activeCrawls || 0,
            queuedCount: data.queuedCount || 0,
            maxCrawlers: data.maxCrawlers || 0,
            availableSlots: data.availableSlots || 0
          };
          
          console.log('Queue status updated:', queueStatus.value);
          
          // If we have an unusual state (like active crawls showing in Last 10 Scans but not in status),
          // we'll fetch the active crawls directly from the crawls API
          if (queueStatus.value.activeCrawls === 0) {
            try {
              const crawlsResponse = await api.get('/api/crawls', { 
                params: { status: 'in_progress' }
              });
              
              if (crawlsResponse.data && Array.isArray(crawlsResponse.data) && crawlsResponse.data.length > 0) {
                console.log('Found active crawls from direct API check:', crawlsResponse.data);
                queueStatus.value.activeCrawls = crawlsResponse.data.length;
                queueStatus.value.availableSlots = Math.max(0, queueStatus.value.maxCrawlers - queueStatus.value.activeCrawls);
                console.log('Updated active crawls count:', queueStatus.value.activeCrawls);
              }
            } catch (error) {
              console.error('Failed to fetch active crawls directly:', error);
            }
          }
        }
        
        lastUpdated.value = new Date();
      } catch (error) {
        console.error('Failed to fetch queue status:', error);
      }
    }
    
    onMounted(() => {
      fetchQueueStatus()
      // Poll every 10 seconds
      pollingInterval.value = setInterval(fetchQueueStatus, 10000)
    })
    
    onUnmounted(() => {
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value)
      }
    })
    
    return {
      queueStatus,
      lastUpdatedFormatted,
      fetchQueueStatus
    }
  }
}
</script>

<style scoped>
.queue-status {
  margin-bottom: 1.5rem;
}

.status-title {
  margin-bottom: 0.75rem;
  font-size: 1.2rem;
  color: var(--text-color);
}

.status-card {
  background: var(--card-background);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem;
}

.status-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.metric-value {
  font-size: 1.2rem;
  font-weight: 600;
}

.crawlers-visual {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.crawler-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--background-color);
}

.crawler-slot.active {
  background-color: rgba(56, 143, 236, 0.2);
}

.crawler-slot.available {
  background-color: rgba(0, 0, 0, 0.05);
}

.slot-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.active .slot-indicator {
  background-color: var(--primary-color);
  box-shadow: 0 0 8px var(--primary-color);
}

.available .slot-indicator {
  background-color: #ccc;
}

.refresh-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.last-updated {
  color: var(--text-muted);
}

.refresh-button {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.refresh-button:hover {
  text-decoration: underline;
}

/* Simplified mode for header */
.queue-status.simplified {
  margin-bottom: 0;
}

.simplified-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.75rem;
  background: var(--background-color);
  border-radius: 6px;
  text-decoration: none;
  color: var(--text-color);
  transition: background-color 0.2s ease;
}

.simplified-status:hover {
  background-color: var(--hover-background);
}

.simplified-metric {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.simplified-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.simplified-value-container {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.simplified-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
}

.simplified-value.has-active {
  color: var(--primary-color);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.active-dot {
  background-color: var(--primary-color);
  box-shadow: 0 0 5px var(--primary-color);
}

.queue-dot {
  background-color: #f0ad4e;
  box-shadow: 0 0 5px #f0ad4e;
}
</style> 