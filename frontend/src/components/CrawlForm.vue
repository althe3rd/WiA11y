<template>
  <div class="crawl-form">
    
    <form @submit.prevent="submitCrawl" class="crawl-form-wrapper">
      <div class="crawl-main-row">
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
        <TeamSelector 
          id="team" 
          v-model="formData.team" 
          :required="true"
          :showAllOption="false"
          :selectClass="{ 'error': !formData.team && formData.url }"
        />
        <small class="helper-text error" v-if="!formData.team && formData.url">
          Please select a team to start the scan
        </small>
      </div>

      <div class="button-group">
        <button 
          @click="startCrawl" 
          :disabled="isSubmitting || !isValidUrl" 
          :class="['submit-button', { 'success': showSuccess }]"
        >
          <span v-if="!isSubmitting && !showSuccess" class="button-content">
            <font-awesome-icon icon="fa-magnifying-glass-chart" />
            Start Scan
          </span>
          <span v-else-if="showSuccess" class="button-content success">
            <font-awesome-icon icon="fa-check" />
            Scan added to Queue
          </span>
          <span v-else class="button-content">
            <font-awesome-icon icon="fa-circle-notch" class="fa-spin" />
            Starting...
          </span>
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
      </div>

      <div class="advanced-toggle">
        <button 
          type="button" 
          class="options-toggle-btn" 
          @click="showAdvanced = !showAdvanced"
          :class="{ 'active': showAdvanced }"
          :title="showAdvanced ? 'Hide scan options' : 'Show scan options'"
        >
          <font-awesome-icon icon="fa-sliders-h" />
          <span class="options-text">{{ showAdvanced ? 'Hide Options' : 'Scan Options' }}</span>
        </button>
      </div>

      <div class="advanced-options" v-if="showAdvanced">
        <div class="form-group">
          <label for="title">Scan Title (Optional)</label>
          <input 
            type="text" 
            id="title" 
            v-model="formData.title" 
            placeholder="Enter a descriptive title for this scan"
          >
          <small class="helper-text">
            This helps identify the scan when viewing results
          </small>
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
        
        <div class="schedule-section">
          <h3 class="section-title">Schedule Recurring Scans</h3>
          
          <div class="form-group schedule-toggle">
            <div class="checkbox-wrapper">
              <input 
                type="checkbox" 
                id="enableSchedule" 
                v-model="formData.isScheduled"
              />
              <label for="enableSchedule">Enable automatic recurring scans</label>
            </div>
          </div>
          
          <div class="form-group" v-if="formData.isScheduled">
            <label for="scheduleFrequency">Scan Frequency</label>
            <select id="scheduleFrequency" v-model="formData.scheduleFrequency">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p class="schedule-helper-text">
              This scan will automatically run on a {{ formData.scheduleFrequency }} basis
            </p>
          </div>
        </div>
      </div>

      

      
    </form>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import api from '../api/axios';  // Use the configured instance
import TeamSelector from './TeamSelector.vue';
import notify from '../utils/notify';

export default {
  name: 'CrawlForm',
  components: {
    TeamSelector
  },
  setup() {
    const store = useStore();
    const teams = ref([]);
    const isSubmitting = ref(false);
    const showAdvanced = ref(false);
    const currentUser = computed(() => store.state.user);
    const currentCrawlId = ref(null);
    const showSuccess = ref(false);
    
    // Add computed property for URL validation
    const isValidUrl = computed(() => {
      if (!formData.value.url) return false;
      if (!formData.value.team) return false;  // Require team selection
      try {
        // Add protocol if missing for URL validation
        let urlToTest = formData.value.url;
        if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
          urlToTest = 'https://' + urlToTest;
        }
        const url = new URL(urlToTest);
        // Allow domain with optional path
        return url.hostname.includes('.'); // Basic check that it's at least a valid domain
      } catch (e) {
        return false;
      }
    });

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
      title: '',
      depthLimit: '2',
      pageLimit: 100,
      crawlRate: '30',
      wcagVersion: '2.1',
      wcagLevel: 'AA',
      isScheduled: false,
      scheduleFrequency: 'weekly'
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
        
        const urlObj = new URL(url);
        // Extract domain and path
        const domain = urlObj.hostname;
        const startPath = urlObj.pathname !== '/' ? urlObj.pathname : '';
        
        const crawlData = {
          url,
          domain,
          startPath,
          title: formData.value.title || null,
          team: formData.value.team,
          depthLimit: parseInt(formData.value.depthLimit),
          pageLimit: parseInt(formData.value.pageLimit),
          crawlRate: parseInt(formData.value.crawlRate),
          wcagVersion: formData.value.wcagVersion,
          wcagLevel: formData.value.wcagLevel,
          isScheduled: formData.value.isScheduled,
          scheduleFrequency: formData.value.isScheduled ? formData.value.scheduleFrequency : null
        };
        
        console.log('Submitting crawl with data:', crawlData); // Debug log
        
        const result = await store.dispatch('crawls/createCrawl', crawlData);
        currentCrawlId.value = result._id;

        // Reset form
        formData.value = {
          url: '',
          team: '',
          title: '',
          depthLimit: '2',
          pageLimit: 100,
          crawlRate: '30',
          wcagVersion: '2.1',
          wcagLevel: 'AA',
          isScheduled: false,
          scheduleFrequency: 'weekly'
        };
      } catch (error) {
        console.error('Failed to create crawl:', error);
        notify.error(error.message || error.error || 'Failed to create crawl');
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
          title: '',
          depthLimit: '2',
          pageLimit: 100,
          crawlRate: '30',
          wcagVersion: '2.1',
          wcagLevel: 'AA',
          isScheduled: false,
          scheduleFrequency: 'weekly'
        };
      } catch (error) {
        console.error('Failed to cancel crawl:', error);
        notify.error(error.response?.data?.error || error.message || 'Failed to cancel crawl');
      }
    };

    const startCrawl = async () => {
      if (!formData.value.url) return;
      
      isSubmitting.value = true;
      
      try {
        await submitCrawl();
        
        // Show success state
        showSuccess.value = true;
        
        // Add notification for crawl start
        notify.success('New scan started successfully! Added to the queue.');
        
        // Reset form
        formData.value = {
          url: '',
          team: '',
          title: '',
          depthLimit: '2',
          pageLimit: 100,
          crawlRate: '30',
          wcagVersion: '2.1',
          wcagLevel: 'AA',
          isScheduled: false,
          scheduleFrequency: 'weekly'
        };
        
        // Reset button after delay
        setTimeout(() => {
          showSuccess.value = false;
          isSubmitting.value = false;
        }, 2000);
        
      } catch (error) {
        console.error('Error starting crawl:', error);
        isSubmitting.value = false;
      }
    };

    onMounted(fetchTeams);

    return {
      formData,
      availableTeams,
      isSubmitting,
      showAdvanced,
      submitCrawl,
      cancelCrawl,
      showSuccess,
      startCrawl,
      isValidUrl
    };
  }
};
</script>

<style scoped>
.crawl-form {
  padding: 20px;
  background: var(--card-background);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 74px;
  z-index:10;
}

.crawl-form-wrapper .crawl-main-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 20px;
  align-items: center;
}

.crawl-form-wrapper .crawl-main-row .button-group {
  align-self: flex-end;
}



.advanced-toggle {
  margin: 0 0;
  display: flex;
  justify-content: flex-start;
}

.options-toggle-btn {
  display: flex;
  align-items: center;
  
  width: auto;
  gap: 8px;
  padding: 6px 12px;
  background-color: transparent;
  border-radius: 6px;
  color: var(--primary-color);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

button.options-toggle-btn:hover:not(:disabled) {
  background-color: #f5f5f5;

  color: #333;
}

.options-toggle-btn.active {
  background-color: var(--background-color);
  border-color: var(--primary-color);
  color: #333;
}

.options-toggle-btn i {
  font-size: 1rem;
}

.options-text {
  font-weight: 500;
}

.advanced-options {
  margin-top: 1rem;
  padding: 1.5rem;
  background-color: var(--background-color);
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.submit-button {
  align-items: center;
  appearance: none;
  background-image: radial-gradient(100% 100% at 100% 0, var(--secondary-color) 0, var(--primary-color) 100%);
  border: 0;
  border-radius: 6px;
  box-shadow: rgba(45, 35, 66, .4) 0 2px 4px,rgba(45, 35, 66, .3) 0 7px 13px -3px,rgba(58, 65, 111, .5) 0 -3px 0 inset;
  box-sizing: border-box;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font-family: "JetBrains Mono",monospace;
  height: 42px;
  justify-content: center;
  line-height: 1;
  list-style: none;
  overflow: hidden;
  padding-left: 16px;
  padding-right: 16px;
  position: relative;
  text-align: left;
  text-decoration: none;
  transition: box-shadow .15s,transform .15s;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  white-space: nowrap;
  will-change: box-shadow,transform;
  font-size: 18px;
  transform: translateY(-2px);
}

.submit-button:focus {
  box-shadow: rgba(0,0,0,0.3) 0 0 0 1.5px inset, rgba(45, 35, 66, .4) 0 2px 4px, rgba(45, 35, 66, .3) 0 7px 13px -3px, rgba(0,0,0,0.3) 0 -3px 0 inset;
}

.submit-button:hover {
  box-shadow: rgba(45, 35, 66, .4) 0 4px 8px, rgba(45, 35, 66, .3) 0 7px 13px -3px, rgba(0,0,0,0.3) 0 -3px 0 inset;
  transform: translateY(-4px);
}

.submit-button:active {
  box-shadow: rgba(0,0,0,0.3) 0 3px 7px inset;
  transform: translateY(-3px);
}


.submit-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
}

.submit-button:disabled {
  opacity: 0.9;
  cursor: not-allowed;
}

.submit-button:not(:disabled):hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}

.submit-button.success {
  background-color: #4CAF50;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.button-content.success {
  animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}

/* Optional: Add a subtle pulse animation to the loading spinner */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.fa-circle-notch {
  animation: pulse 1s infinite;
}

.form-group {
  margin-bottom: 4px;
}

form {
 
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
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

.helper-text {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  color: #666;
}

.error {
  border-color: var(--secondary-color) !important;
}

.helper-text.error {
  color: var(--secondary-color);
}

.schedule-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 16px;
  margin-bottom: 15px;
  color: var(--text-color);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-wrapper input[type="checkbox"] {
  width: auto;
  margin-right: 5px;
}

.schedule-helper-text {
  margin-top: 5px;
  font-size: 0.85em;
  color: var(--text-muted, #666);
  font-style: italic;
}

.schedule-toggle {
  margin-bottom: 15px;
}
</style> 