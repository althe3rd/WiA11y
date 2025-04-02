<template>
  <div class="all-scans">
    <div class="page-header">
      <div class="header-content">
        <h1>All Scanned Sites</h1>
        
      </div>
    </div>
    <CrawlHistory ref="crawlHistory" :limit="0" />
  </div>
</template>

<script>
import CrawlHistory from '../components/CrawlHistory.vue'

export default {
  name: 'AllScans',
  components: {
    CrawlHistory
  },
  methods: {
    exportToCsv() {
      // Use the CrawlHistory component's exportToCsv method if it exists
      if (this.$refs.crawlHistory && this.$refs.crawlHistory.exportToCsv) {
        this.$refs.crawlHistory.exportToCsv();
      }
    }
  }
}
</script>

<style scoped>
.all-scans {
  padding: 40px;
  padding-top: 60px;
  max-width: var(--container-width);
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  font-size: 2rem;
  color: var(--text-color);
  margin: 0;
}

.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: var(--secondary-button-bg, #6c757d);
  color: var(--secondary-button-text, #ffffff);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.export-button:hover {
  background-color: var(--secondary-button-hover-bg, #5a6268);
}
</style> 