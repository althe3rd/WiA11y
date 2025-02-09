<template>
  <div class="dashboard">
    <h1>Web Accessibility Scanner</h1>
    <CrawlForm />
    <CrawlHistory />
  </div>
</template>

<script>
import CrawlForm from '../components/CrawlForm.vue'
import CrawlHistory from '../components/CrawlHistory.vue'

export default {
  name: 'Dashboard',
  components: {
    CrawlForm,
    CrawlHistory
  }
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}
</style> 