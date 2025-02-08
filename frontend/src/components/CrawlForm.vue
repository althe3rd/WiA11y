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
      <div class="form-group">
        <label>Crawl Depth:</label>
        <div class="depth-selector" :class="{ 'unselected': !depthLimit }">
          <label v-for="depth in [...Array(5)].map((_, i) => i + 1)" :key="depth">
            <input 
              type="radio" 
              v-model="depthLimit" 
              :value="String(depth)"
            > {{ getDepthLabel(depth) }}
          </label>
          <label>
            <input 
              type="radio" 
              v-model="depthLimit" 
              value="custom"
            > Custom
          </label>
        </div>
        <div v-if="depthLimit === 'custom'" class="custom-depth">
          <input 
            type="number" 
            v-model.number="customDepthValue"
            min="1"
            max="20"
            required
          >
          <span class="help-text">(1-20 levels)</span>
        </div>
      </div>
      <div class="form-group">
        <label>Page Limit:</label>
        <div class="page-limit-selector" :class="{ 'unselected': !pageLimitType }">
          <label>
            <input 
              type="radio" 
              v-model="pageLimitType" 
              value="default"
            > Default (100 pages)
          </label>
          <label>
            <input 
              type="radio" 
              v-model="pageLimitType" 
              value="custom"
            > Custom
          </label>
        </div>
        <div v-if="pageLimitType === 'custom'" class="custom-page-limit">
          <input 
            type="number" 
            v-model.number="customPageLimit"
            min="1"
            max="1000"
            required
          >
          <span class="help-text">(1-1000 pages)</span>
        </div>
      </div>
      <div class="form-section">
        <h3>WCAG Specification</h3>
        <div class="wcag-options">
          <div class="option-group">
            <label>Version:</label>
            <div class="radio-group">
              <label>
                <input 
                  type="radio" 
                  v-model="wcagVersion" 
                  value="2.1"
                > 2.1
              </label>
              <label>
                <input 
                  type="radio" 
                  v-model="wcagVersion" 
                  value="2.2"
                > 2.2
              </label>
            </div>
          </div>
          <div class="option-group">
            <label>Conformance Level:</label>
            <div class="radio-group">
              <label>
                <input 
                  type="radio" 
                  v-model="wcagLevel" 
                  value="A"
                > A
              </label>
              <label>
                <input 
                  type="radio" 
                  v-model="wcagLevel" 
                  value="AA"
                > AA
              </label>
              <label>
                <input 
                  type="radio" 
                  v-model="wcagLevel" 
                  value="AAA"
                > AAA
              </label>
            </div>
          </div>
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
      crawlSpeed: 'medium',
      depthLimit: null,
      customDepthValue: 6,
      pageLimitType: null,
      customPageLimit: 5,
      wcagVersion: '2.1',
      wcagLevel: 'AA',
      presetPageLimit: '5'
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
    },
    effectiveDepthLimit() {
      const depth = this.depthLimit === 'custom' ? this.customDepthValue : parseInt(this.depthLimit, 10);
      console.log('Depth selection:', this.depthLimit);
      console.log('Effective depth:', depth);
      return depth;
    },
    effectivePageLimit() {
      const limit = this.pageLimitType === 'custom' ? parseInt(this.customPageLimit, 10) : 100;
      console.log('Page limit type:', this.pageLimitType);
      console.log('Custom page limit:', this.customPageLimit);
      console.log('Effective page limit:', limit);
      return limit;
    },
    wcagOptions() {
      return {
        version: this.wcagVersion,
        level: this.wcagLevel
      }
    }
  },
  methods: {
    async submitCrawl() {
      try {
        console.log('Form state before submission:', {
          depthLimit: this.depthLimit,
          customDepthValue: this.customDepthValue,
          pageLimitType: this.pageLimitType,
          customPageLimit: this.customPageLimit,
          wcagVersion: this.wcagVersion,
          wcagLevel: this.wcagLevel
        });

        // Validate depth selection
        if (!this.depthLimit) {
          console.error('Please select a depth limit');
          return;
        }
        // Validate page limit selection
        if (!this.pageLimitType) {
          console.error('Please select a page limit type');
          return;
        }

        // Validate custom depth
        if (this.depthLimit === 'custom' && (!this.customDepthValue || this.customDepthValue < 1)) {
          console.error('Invalid custom depth');
          return;
        }
        // Validate custom page limit
        if (this.pageLimitType === 'custom' && (!this.customPageLimit || this.customPageLimit < 1)) {
          console.error('Invalid custom page limit');
          return;
        }

        const payload = {
          domain: this.domain,
          crawlRate: this.crawlRate,
          depthLimit: this.effectiveDepthLimit,
          pageLimit: this.effectivePageLimit,
          wcagVersion: this.wcagVersion,
          wcagLevel: this.wcagLevel
        };
        
        // Log the final computed values
        console.log('Raw form values:', {
          depthLimit: this.depthLimit,
          effectiveDepthLimit: this.effectiveDepthLimit,
          pageLimitType: this.pageLimitType,
          effectivePageLimit: this.effectivePageLimit
        });
        console.log('Submitting crawl with:', payload);

        const response = await axios.post('http://localhost:3000/api/crawls', payload);
        console.log('Crawl created:', response.data);
        this.resetForm();
      } catch (error) {
        console.error('Failed to create crawl:', error);
      }
    },
    resetForm() {
      this.domain = '';
      this.crawlSpeed = 'medium';
      this.depthLimit = null;
      this.pageLimitType = null;
      this.customPageLimit = 5;
      this.customDepthValue = 6;
    },
    getDepthLabel(depth) {
      const labels = {
        1: 'Homepage Only (Level 1)',
        2: 'Shallow (2 Levels)',
        3: 'Medium (3 Levels)',
        4: 'Deep (4 Levels)',
        5: 'Very Deep (5 Levels)'
      };
      return labels[depth] || `${depth} Levels`;
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

.depth-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 5px;
}

.depth-selector label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.depth-selector input[type="radio"] {
  width: auto;
  cursor: pointer;
}

.custom-depth {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-depth input {
  width: 80px;
  padding: 4px 8px;
}

.help-text {
  color: #666;
  font-size: 0.9em;
}

.page-limit-selector {
  display: flex;
  gap: 20px;
  margin-top: 5px;
}

.page-limit-selector label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.custom-page-limit {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-page-limit input {
  width: 80px;
  padding: 4px 8px;
}

.unselected {
  border: 1px solid #ffcccb;
  padding: 10px;
  border-radius: 4px;
}

.unselected:focus-within {
  border-color: #4CAF50;
}

.wcag-options {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.option-group {
  flex: 1;
}

.option-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.radio-group {
  display: flex;
  gap: 15px;
}

.radio-group label {
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style> 