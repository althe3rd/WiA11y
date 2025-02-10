<template>
  <div class="scan-results">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="crawl">
      <CrawlProgress 
        v-if="crawl.status === 'in_progress'"
        :crawlId="$route.params.id" 
      />
      <ScanDetails :crawl="crawl" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import ScanDetails from '../components/ScanDetails.vue'
import CrawlProgress from '../components/CrawlProgress.vue'

export default {
  name: 'ScanResults',
  components: {
    ScanDetails,
    CrawlProgress
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const crawl = ref(null)
    const loading = ref(true)
    const error = ref(null)

    const fetchCrawl = async () => {
      try {
        loading.value = true
        const token = localStorage.getItem('token')
        const { data } = await axios.get(`${process.env.VUE_APP_API_URL}/api/crawls/${route.params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        console.log('Received crawl data:', data);
        crawl.value = data
      } catch (err) {
        console.error('Error fetching crawl:', err)
        error.value = err.response?.data?.error || 'Failed to load scan results'
        if (err.response?.status === 404) {
          router.push('/dashboard')
        }
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchCrawl)

    return {
      crawl,
      loading,
      error
    }
  }
}
</script>

<style scoped>
.scan-results {
  padding: 40px;
  padding-top: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  font-size: 1.2em;
}

.error {
  color: #f44336;
}
</style> 