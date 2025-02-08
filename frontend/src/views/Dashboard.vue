<template>
  <div class="dashboard">
    <h1>Web Accessibility Crawler</h1>
    <CrawlForm />
    <CrawlList />
  </div>
</template>

<script>
import CrawlForm from '../components/CrawlForm.vue'
import CrawlList from '../components/CrawlList.vue'

export default {
  name: 'Dashboard',
  components: {
    CrawlForm,
    CrawlList
  }
}
</script> 