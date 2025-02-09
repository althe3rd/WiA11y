<template>
  <div class="crawl-form">
    <h2>New Accessibility Scan</h2>
    <form @submit.prevent="submitCrawl">
      <div class="form-group">
        <label for="url">URL to Scan</label>
        <input 
          type="text" 
          id="url" 
          v-model="formData.url" 
          required
          placeholder="example.com"
        >
      </div>

      <div class="form-group">
        <label for="team">Team</label>
        <select id="team" v-model="formData.team" required>
          <option value="">Select a team</option>
          <option v-for="team in teams" :key="team._id" :value="team._id">
            {{ team.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="depthLimit">Scan Depth</label>
        <select id="depthLimit" v-model="formData.depthLimit" required>
          <option value="1">Homepage Only (Level 1)</option>
          <option value="2">Shallow (2 Levels)</option>
          <option value="3">Medium (3 Levels)</option>
          <option value="4">Deep (4 Levels)</option>
          <option value="5">Very Deep (5 Levels)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="pageLimit">Maximum Pages</label>
        <input 
          type="number" 
          id="pageLimit" 
          v-model="formData.pageLimit" 
          required
          min="1"
          max="1000"
        >
      </div>

      <div class="form-group">
        <label for="crawlRate">Crawl Speed</label>
        <select id="crawlRate" v-model="formData.crawlRate" required>
          <option value="10">Slow (10 pages/min)</option>
          <option value="30">Medium (30 pages/min)</option>
          <option value="60">Fast (60 pages/min)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="wcagVersion">WCAG Version</label>
        <select id="wcagVersion" v-model="formData.wcagVersion" required>
          <option value="2.0">WCAG 2.0</option>
          <option value="2.1">WCAG 2.1</option>
          <option value="2.2">WCAG 2.2</option>
        </select>
      </div>

      <div class="form-group">
        <label for="wcagLevel">Conformance Level</label>
        <select id="wcagLevel" v-model="formData.wcagLevel" required>
          <option value="A">Level A</option>
          <option value="AA">Level AA</option>
          <option value="AAA">Level AAA</option>
        </select>
      </div>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Starting Scan...' : 'Start Scan' }}
      </button>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'CrawlForm',
  setup() {
    const store = useStore();
    const teams = ref([]);
    const isSubmitting = ref(false);
    const formData = ref({
      url: '',
      team: '',
      depthLimit: '2',
      pageLimit: 100,
      crawlRate: '30',
      wcagVersion: '2.1',
      wcagLevel: 'AA'
    });

    const fetchTeams = async () => {
      try {
        await store.dispatch('fetchTeams');
        teams.value = store.state.teams;
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      }
    };

    const submitCrawl = async () => {
      try {
        isSubmitting.value = true;
        // Add protocol if missing
        let url = formData.value.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        const domain = new URL(url).hostname;
        
        const crawlData = {
          url,
          domain,
          team: formData.value.team,
          depthLimit: parseInt(formData.value.depthLimit),
          pageLimit: parseInt(formData.value.pageLimit),
          crawlRate: parseInt(formData.value.crawlRate),
          wcagVersion: formData.value.wcagVersion,
          wcagLevel: formData.value.wcagLevel
        };
        
        console.log('Submitting crawl with data:', crawlData); // Debug log
        
        await store.dispatch('crawls/createCrawl', crawlData);

        // Reset form
        formData.value = {
          url: '',
          team: '',
          depthLimit: '2',
          pageLimit: 100,
          crawlRate: '30',
          wcagVersion: '2.1',
          wcagLevel: 'AA'
        };
      } catch (error) {
        console.error('Failed to create crawl:', error);
        alert(error.message || error.error || 'Failed to create crawl');
      } finally {
        isSubmitting.value = false;
      }
    };

    onMounted(fetchTeams);

    return {
      formData,
      teams,
      isSubmitting,
      submitCrawl
    };
  }
};
</script>

<style scoped>
.crawl-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 