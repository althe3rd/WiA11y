<template>
  <div class="all-scans">
    <div class="page-header">
      <h1>All Scanned Sites</h1>
    </div>
    <CrawlHistory :limit="0" />
  </div>
</template>

<script>
import CrawlHistory from '../components/CrawlHistory.vue'

export default {
  name: 'AllScans',
  components: {
    CrawlHistory
  }
}
</script>

<style scoped>
.all-scans {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
}
</style> 