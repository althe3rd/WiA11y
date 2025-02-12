<template>
  <div class="queue-status" v-if="hasActiveScans">
    <div class="status-indicator">
      <div class="scanning-icon" v-if="activeCrawls > 0">
        <LoadingSpinner size="small" />
      </div>
      <div class="status-text">
        <span v-if="activeCrawls > 0">Scanning in Progress</span>
        <span v-if="queuedCrawls > 0" class="queue-count">
          {{ queuedCrawls }} in Queue
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import api from '../api/axios'  // Use the configured axios instance
import LoadingSpinner from './LoadingSpinner.vue'

export default {
  name: 'QueueStatus',
  components: {
    LoadingSpinner
  },
  setup() {
    const activeCrawls = ref(0)
    const queuedCrawls = ref(0)
    let pollInterval = null

    const fetchQueueStatus = async () => {
      try {
        const response = await api.get('/api/crawls/status')
        activeCrawls.value = response.data.active
        queuedCrawls.value = response.data.queued
      } catch (error) {
        console.error('Failed to fetch queue status:', error)
      }
    }

    onMounted(() => {
      fetchQueueStatus()
      pollInterval = setInterval(fetchQueueStatus, 5000)
    })

    onUnmounted(() => {
      if (pollInterval) clearInterval(pollInterval)
    })

    const hasActiveScans = computed(() => activeCrawls.value > 0 || queuedCrawls.value > 0)

    return {
      activeCrawls,
      queuedCrawls,
      hasActiveScans
    }
  }
}
</script>

<style scoped>
.queue-status {
  display: flex;
  align-items: center;
  margin-right: 20px;
  padding: 8px 12px;
  background: var(--background-color);
  border-radius: 6px;
  font-size: 0.9em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scanning-icon {
  display: flex;
  align-items: center;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.queue-count {
  color: var(--primary-color);
  font-weight: 500;
}

/* Make the spinner smaller */
:deep(.spinner) {
  width: 16px;
  height: 16px;
  border-width: 2px;
}
</style> 