<template>
  <div class="scheduled-crawls-view">
    <h1>Scheduled Scans</h1>
    <p class="description">
      Manage your scheduled recurring scans. These scans will run automatically at the specified intervals.
    </p>
    
    <ScheduledCrawls />
  </div>
</template>

<script>
import ScheduledCrawls from '../components/ScheduledCrawls.vue';

export default {
  name: 'ScheduledCrawlsView',
  components: {
    ScheduledCrawls
  }
};
</script>

<style scoped>
.scheduled-crawls-view {
  padding: 20px;
}

h1 {
  margin-bottom: 10px;
  color: var(--primary-color);
}

.description {
  margin-bottom: 20px;
  color: var(--text-muted);
}
</style> 