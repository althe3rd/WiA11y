<template>
  <div class="crawl-form">
    <form @submit.prevent="submitCrawl">
      <div class="form-group">
        <label for="domain">Domain</label>
        <input 
          v-model="domain" 
          type="text" 
          id="domain" 
          placeholder="example.com"
          required
        >
      </div>
      <div class="form-group crawl-speed">
        <label>Crawl Speed:</label>
        <div class="radio-group">
          <label>
            <input 
              type="radio" 
              v-model="crawlSpeed" 
              value="slow"
            > Slow (10 req/min)
          </label>
          <label>
            <input 
              type="radio" 
              v-model="crawlSpeed" 
              value="medium"
            > Medium (30 req/min)
          </label>
          <label>
            <input 
              type="radio" 
              v-model="crawlSpeed" 
              value="fast"
            > Fast (60 req/min)
          </label>
        </div>
      </div>
      <button type="submit">Start Crawl</button>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'CrawlForm',
  data() {
    return {
      domain: '',
      crawlSpeed: 'medium'
    }
  },
  computed: {
    crawlRate() {
      const rates = {
        slow: 10,
        medium: 30,
        fast: 60
      };
      return rates[this.crawlSpeed];
    }
  },
  methods: {
    async submitCrawl() {
      try {
        const response = await axios.post('http://localhost:3000/api/crawls', {
          domain: this.domain,
          crawlRate: this.crawlRate
        });
        
        console.log('Crawl created:', response.data);
        this.$store.dispatch('crawls/createCrawl', {
          domain: this.domain,
          crawlRate: this.crawlRate
        });
        this.domain = '';
      } catch (error) {
        console.error('Failed to create crawl:', error);
        // TODO: Add error handling UI
      }
    }
  }
}
</script>

<style scoped>
.crawl-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

.radio-group {
  display: flex;
  gap: 20px;
  margin-top: 5px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.radio-group input[type="radio"] {
  width: auto;
  cursor: pointer;
}
</style> 