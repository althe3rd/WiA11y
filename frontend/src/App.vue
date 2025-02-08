<template>
  <div id="app">
    <h1>Web Accessibility Scanner</h1>
    <CrawlForm />
    <CrawlHistory />
  </div>
</template>

<script>
import CrawlForm from './components/CrawlForm.vue'
import CrawlHistory from './components/CrawlHistory.vue'

export default {
  name: 'App',
  components: {
    CrawlForm,
    CrawlHistory
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}
</style> 