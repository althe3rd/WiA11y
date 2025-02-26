<template>
  <div class="crawl-progress" :class="{ compact }">
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
    <div class="progress-info" v-if="!compact">
      <span>{{ Math.floor(progress) }}% Complete</span>
      <span v-if="currentUrl">Currently scanning: {{ currentUrl }}</span>
    </div>
    <div class="compact-info" v-else>
      {{ Math.floor(progress) }}%
    </div>
  </div>
</template>

<script>
export default {
  name: 'CrawlProgress',
  props: {
    crawlId: {
      type: String,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      progress: 0,
      currentUrl: '',
      pollInterval: null
    }
  },
  methods: {
    async fetchProgress() {
      try {
        const response = await this.$store.dispatch('fetchCrawlProgress', this.crawlId);
        
        // Set progress to 100 if status is completed
        if (response.status === 'completed') {
          this.progress = 100;
          this.stopPolling();
          this.$emit('complete');
        } else if (response.status === 'failed' || response.status === 'cancelled') {
          this.stopPolling();
          this.$emit('complete');
        } else {
          this.progress = response.progress;
          this.currentUrl = response.currentUrl;
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        this.stopPolling();
      }
    },
    startPolling() {
      this.pollInterval = setInterval(this.fetchProgress, 2000); // Poll every 2 seconds
    },
    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
    }
  },
  mounted() {
    this.startPolling();
  },
  beforeUnmount() {
    this.stopPolling();
  }
}
</script>

<style scoped>
.crawl-progress {
  margin: 20px 0;
}

.crawl-progress.compact {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #eee;
  border-radius: 10px;
  overflow: hidden;
}

.crawl-progress.compact .progress-bar {
  height: 12px;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-info {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
  color: #666;
}

.compact-info {
  font-size: 0.9em;
  color: #666;
  min-width: 40px;
}
</style> 