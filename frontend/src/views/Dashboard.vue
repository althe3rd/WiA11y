<template>
  <div class="dashboard">
    <h1>Welcome Al!</h1>
    <p>This is the dashboard for the web accessibility scanner.</p>
    <CrawlHistory />
  </div>
</template>

<script>

import CrawlHistory from '../components/CrawlHistory.vue'

export default {
  name: 'Dashboard',
  components: {
    CrawlHistory
  }
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}
</style> 