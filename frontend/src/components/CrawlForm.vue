<template>
  <div class="crawl-form">
    
    <form @submit.prevent="submitCrawl" class="crawl-form-wrapper">
      <div class="form-group basic-options">
        <label for="url">Website to Scan</label>
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
          <option v-if="availableTeams.length > 1" value="">Select a team</option>
          <option v-for="team in availableTeams" :key="team._id" :value="team._id">
            {{ team.name }}
          </option>
        </select>
      </div>

      <div class="advanced-toggle">
        <button type="button" class="button-secondary" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Hide' : 'Show' }} Options
          <span class="toggle-icon">{{ showAdvanced ? '▼' : '▶' }}</span>
        </button>
      </div>

      <div class="advanced-options" v-if="showAdvanced">
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
      </div>

      

      <div class="button-group">
        <button type="submit" :disabled="isSubmitting" class="submit-button">
          <span v-if="!isSubmitting">Start Scan</span>
          <div v-else class="spinner"></div>
        </button>
        <button 
          v-if="isSubmitting" 
          type="button" 
          @click="cancelCrawl" 
          class="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import api from '../api/axios';  // Use the configured instance

export default {
  name: 'CrawlForm',
  setup() {
    const store = useStore();
    const teams = ref([]);
    const isSubmitting = ref(false);
    const showAdvanced = ref(false);
    const currentUser = computed(() => store.state.user);
    const currentCrawlId = ref(null);
    
    // Compute available teams based on user's memberships and role
    const availableTeams = computed(() => {
      console.log('Current user:', currentUser.value); // Debug log
      console.log('All teams:', teams.value); // Debug log
      const userId = currentUser.value?.id || currentUser.value?._id; // Handle both id formats
      const userTeams = teams.value.filter(team => {
        // If user is network_admin or admin, show all teams
        if (['network_admin', 'admin'].includes(currentUser.value?.role)) {
          return true;
        }
        // Otherwise only show teams where user is member or admin
        const isTeamMember = team.members.includes(userId) || 
          team.members.some(member => (member._id || member.id)?.toString() === userId?.toString());
        const isTeamAdmin = team.teamAdmins.includes(userId) ||
          team.teamAdmins.some(admin => (admin._id || admin.id)?.toString() === userId?.toString());

        console.log(`Team ${team.name}:`, { 
          isTeamMember, 
          isTeamAdmin,
          teamMembers: team.members,
          teamAdmins: team.teamAdmins,
          userId: userId?.toString()
        }); // Debug log
        return isTeamMember || isTeamAdmin;
      });
      console.log('Filtered teams:', userTeams); // Debug log
      return userTeams;
    });

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
        
        // Auto-select team if user only has one available team
        if (availableTeams.value.length === 1) {
          formData.value.team = availableTeams.value[0]._id;
        }
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
        
        const result = await store.dispatch('crawls/createCrawl', crawlData);
        currentCrawlId.value = result._id;

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
        currentCrawlId.value = null;
      }
    };

    const cancelCrawl = async () => {
      try {
        if (!currentCrawlId.value) return;
        
        // Cancel the crawl directly
        const token = localStorage.getItem('token');
        await api.post(
          `/api/crawls/${currentCrawlId.value}/cancel`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        // Update UI state
        isSubmitting.value = false;
        currentCrawlId.value = null;
        
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
        console.error('Failed to cancel crawl:', error);
        alert(error.response?.data?.error || error.message || 'Failed to cancel crawl');
      }
    };

    onMounted(fetchTeams);

    return {
      formData,
      availableTeams,
      isSubmitting,
      showAdvanced,
      submitCrawl,
      cancelCrawl
    };
  }
};
</script>

<style scoped>
.crawl-form {
  padding: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.crawl-form-wrapper {
  display: grid;
  grid-template-columns: 2fr 1fr 160px 1fr;
  gap: 20px;
  align-items: center;
}

.basic-options {
  
}

.advanced-toggle {

  text-align: left;
}

.advanced-options {
  grid-column: span 4;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
  background: var(--background-color);
  border-radius: 6px;
  margin: 10px 0;
}

.toggle-icon {
  display: inline-block;
  margin-left: 5px;
  font-size: 0.8em;
}

.submit-button {
 
  position: relative;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.form-group {
  margin-bottom: 20px;
}

form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

button:disabled {
  background-color: var(--primary-color);
  opacity: 0.7;
  cursor: not-allowed;
}

.button-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.submit-button {
  flex: 2;
}

.cancel-button {
  flex: 1;
  background-color: var(--secondary-color);
  color: white;
  border: none;
  height: 48px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.cancel-button:hover {
  opacity: 0.9;
}
</style> 