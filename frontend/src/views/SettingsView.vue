<template>
  <div class="settings-view">
    <h1>Network Settings</h1>
    
    <div class="settings-container">
      <div class="settings-section">
        <h2>Brand Settings</h2>
        
        <div class="setting-group">
          <h3>Application Title</h3>
          <div class="title-input">
            <input 
              type="text" 
              v-model="settings.title"
              placeholder="Enter application title"
              maxlength="50"
            />
          </div>
        </div>

        <div class="setting-group">
          <h3>Logo</h3>
          <div class="logo-options">
            <label class="default-logo-toggle">
              <input 
                type="checkbox" 
                v-model="settings.useDefaultLogo"
              />
              Use Default Logo
            </label>
          </div>
          <div v-if="!settings.useDefaultLogo">
            <div class="logo-preview" v-if="currentLogo">
              <img :src="logoUrl" alt="Current logo" />
              <button @click="removeLogo" class="remove-logo-btn">
                Remove Logo
              </button>
            </div>
            <div class="logo-upload">
              <input 
                type="file" 
                ref="logoInput"
                @change="handleLogoUpload" 
                accept="image/*"
                class="file-input"
              />
              <button @click="$refs.logoInput.click()" class="upload-btn">
                {{ currentLogo ? 'Change Logo' : 'Upload Logo' }}
              </button>
            </div>
          </div>
          <div v-else class="default-logo-preview">
            <LogoDefault />
          </div>
        </div>

        <div class="setting-group">
          <h3>Colors</h3>
          <div class="color-settings">
            <div class="color-picker">
              <label>Primary Color</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="settings.primaryColor"
                  @change="handleColorChange"
                />
                <input 
                  type="text" 
                  v-model="settings.primaryColor"
                  @change="handleColorChange"
                  placeholder="#000000"
                />
              </div>
            </div>
            
            <div class="color-picker">
              <label>Secondary Color</label>
              <div class="color-input-group">
                <input 
                  type="color" 
                  v-model="settings.secondaryColor"
                  @change="handleColorChange"
                  placeholder="#000000"
                />
                <input 
                  type="text" 
                  v-model="settings.secondaryColor"
                  @change="handleColorChange"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
          <button @click="revertColors" class="revert-btn">
            Revert Colors to Defaults
          </button>
        </div>

        <div class="setting-group">
          <h3>Email Configuration</h3>
          <div class="email-settings">
            <div class="email-config">
              <div class="config-item">
                <label>SMTP Host:</label>
                <span>{{ emailConfig.host || '—' }}</span>
              </div>
              <div class="config-item">
                <label>SMTP Port:</label>
                <span>{{ emailConfig.port || '—' }}</span>
              </div>
              <div class="config-item">
                <label>From Address:</label>
                <span>{{ emailConfig.from || '—' }}</span>
              </div>
            </div>
            
            <div class="test-email">
              <h4>Test Email Configuration</h4>
              <div class="form-group">
                <label for="testEmail">Test Email Address</label>
                <input 
                  type="email" 
                  id="testEmail" 
                  v-model="testEmailAddress"
                  placeholder="Enter email address for testing"
                />
              </div>
              <button 
                @click="sendTestEmail" 
                class="test-btn"
                :disabled="isTestingEmail || !testEmailAddress"
              >
                {{ isTestingEmail ? 'Sending...' : 'Send Test Email' }}
              </button>
              <div v-if="emailTestResult" :class="['test-result', emailTestResult.status]">
                {{ emailTestResult.message }}
              </div>
            </div>
          </div>
        </div>

        <div class="setting-group">
          <h3>Performance Configuration</h3>
          <div class="performance-settings">
            <div class="form-group">
              <label for="maxCrawlers">Maximum Parallel Crawlers</label>
              <div class="crawler-config">
                <input
                  type="number" 
                  id="maxCrawlers"
                  v-model.number="settings.maxCrawlers"
                  min="1"
                  max="10"
                  step="1"
                />
                <span class="input-description">
                  Number of simultaneous crawls that can run (1-10)
                </span>
              </div>
              <div class="help-text">
                Higher values allow more crawls to run in parallel, but may impact system performance.
                <br>Changes only affect new crawls added to the queue.
              </div>
            </div>
          </div>
        </div>

        <div class="setting-group" v-if="isTeamAdmin || isNetworkAdmin">
          <h3>Email Notifications</h3>
          <div class="email-notifications">
            <div class="notification-settings">
              <div class="form-group">
                <label class="toggle-label">
                  <input 
                    type="checkbox" 
                    v-model="emailPreferences.enabled"
                    @change="saveEmailPreferences"
                  />
                  Enable Accessibility Summary Reports
                </label>
              </div>
              
              <div class="form-group" v-if="emailPreferences.enabled">
                <label for="frequency">Report Frequency</label>
                <select 
                  id="frequency" 
                  v-model="emailPreferences.frequency"
                  @change="saveEmailPreferences"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p class="help-text">
                  {{ getFrequencyDescription }}
                </p>
                <button 
                  class="send-now-button" 
                  @click="sendReportNow"
                  :disabled="isSendingReport"
                >
                  {{ isSendingReport ? 'Sending...' : 'Send Report Now' }}
                </button>
                <p v-if="reportSendResult" :class="['send-result', reportSendResult.type]">
                  {{ reportSendResult.message }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="setting-actions">
          <button 
            @click="saveSettings" 
            class="save-btn"
            :disabled="!hasChanges || isLoading"
          >
            {{ isLoading ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import LogoDefault from '../components/Logo-default.vue'
import api from '../api/axios'
import notify from '../utils/notify'

export default {
  name: 'SettingsView',
  components: {
    'logo-default': LogoDefault
  },
  setup() {
    const store = useStore()
    const logoInput = ref(null)
    const settings = ref({
      primaryColor: store.state.settings.primaryColor,
      secondaryColor: store.state.settings.secondaryColor,
      title: store.state.settings.title,
      useDefaultLogo: store.state.settings.useDefaultLogo,
      maxCrawlers: store.state.settings.maxCrawlers
    })
    
    const emailConfig = ref({
      host: null,
      port: null,
      from: null
    })
    
    const testEmailAddress = ref('')
    const isTestingEmail = ref(false)
    const emailTestResult = ref(null)
    
    const emailPreferences = ref({
      enabled: false,
      frequency: 'weekly'
    });
    const isSendingReport = ref(false);
    const reportSendResult = ref(null);
    
    // Default colors
    const defaultColors = {
      primaryColor: '#388fec',
      secondaryColor: '#FF006E'
    }
    
    const currentLogo = computed(() => store.state.settings.logo)
    const isLoading = computed(() => store.state.settings.isLoading)
    
    const logoUrl = computed(() => {
      if (!currentLogo.value) return null
      if (currentLogo.value.startsWith('http')) {
        return currentLogo.value
      }
      return `${process.env.VUE_APP_API_URL}${currentLogo.value}`
    })
    
    const hasChanges = computed(() => {
      return settings.value.primaryColor !== store.state.settings.primaryColor ||
             settings.value.secondaryColor !== store.state.settings.secondaryColor ||
             settings.value.title !== store.state.settings.title ||
             settings.value.useDefaultLogo !== store.state.settings.useDefaultLogo ||
             settings.value.maxCrawlers !== store.state.settings.maxCrawlers
    })

    const handleLogoUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('logo', file)

      try {
        await store.dispatch('settings/uploadLogo', formData)
      } catch (error) {
        alert('Failed to upload logo. Please try again.')
      }
    }

    const handleColorChange = () => {
      // Validate color format
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(settings.value.primaryColor)) {
        settings.value.primaryColor = store.state.settings.primaryColor
      }
      if (!colorRegex.test(settings.value.secondaryColor)) {
        settings.value.secondaryColor = store.state.settings.secondaryColor
      }
    }

    const revertColors = () => {
      settings.value.primaryColor = defaultColors.primaryColor
      settings.value.secondaryColor = defaultColors.secondaryColor
    }

    const removeLogo = async () => {
      try {
        const confirmed = await notify.confirm('Are you sure you want to remove the logo?', {
          type: 'warning',
          confirmText: 'Yes, Remove Logo',
          cancelText: 'No, Cancel'
        });
        
        if (!confirmed) {
          return;
        }
        
        await store.dispatch('settings/removeLogo');
      } catch (error) {
        alert('Failed to remove logo. Please try again.');
      }
    };

    const saveSettings = async () => {
      try {
        const updatedSettings = await store.dispatch('settings/updateSettings', settings.value)
        // Update the local settings ref to match the server response
        settings.value = {
          primaryColor: updatedSettings.primaryColor,
          secondaryColor: updatedSettings.secondaryColor,
          title: updatedSettings.title,
          useDefaultLogo: updatedSettings.useDefaultLogo,
          maxCrawlers: updatedSettings.maxCrawlers
        }
        alert('Settings saved successfully')
      } catch (error) {
        alert('Failed to save settings. Please try again.')
      }
    }

    const fetchEmailConfig = async () => {
      try {
        console.log('Fetching email configuration...')
        const { data } = await api.get('/api/settings/email-config')
        console.log('Email configuration received:', data)
        emailConfig.value = data
      } catch (error) {
        console.error('Failed to fetch email config:', error)
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
      }
    }
    
    const sendTestEmail = async () => {
      try {
        isTestingEmail.value = true
        emailTestResult.value = null
        
        await api.post('/api/settings/test-email', {
          email: testEmailAddress.value
        })
        
        emailTestResult.value = {
          status: 'success',
          message: 'Test email sent successfully! Please check your inbox.'
        }
      } catch (error) {
        emailTestResult.value = {
          status: 'error',
          message: error.response?.data?.error || 'Failed to send test email. Please try again.'
        }
      } finally {
        isTestingEmail.value = false
      }
    }

    const getFrequencyDescription = computed(() => {
      switch(emailPreferences.value.frequency) {
        case 'daily':
          return 'You will receive a summary report every day at 8:00 AM.';
        case 'weekly':
          return 'You will receive a summary report every Monday at 8:00 AM.';
        case 'monthly':
          return 'You will receive a summary report on the 1st of each month at 8:00 AM.';
        default:
          return '';
      }
    });

    const fetchEmailPreferences = async () => {
      try {
        const { data } = await api.get('/api/settings/email-preferences');
        emailPreferences.value = {
          enabled: data.enabled,
          frequency: data.frequency
        };
      } catch (error) {
        console.error('Failed to fetch email preferences:', error);
      }
    };

    const saveEmailPreferences = async () => {
      try {
        await api.post('/api/settings/email-preferences', emailPreferences.value);
        alert('Email preferences saved successfully');
      } catch (error) {
        console.error('Failed to save email preferences:', error);
        alert('Failed to save email preferences');
      }
    };

    const sendReportNow = async () => {
      try {
        isSendingReport.value = true;
        reportSendResult.value = null;
        
        await api.post('/api/settings/send-report-now');
        
        reportSendResult.value = {
          type: 'success',
          message: 'Report sent successfully!'
        };
      } catch (error) {
        console.error('Failed to send report:', error);
        reportSendResult.value = {
          type: 'error',
          message: error.response?.data?.error || 'Failed to send report'
        };
      } finally {
        isSendingReport.value = false;
        // Clear success message after 5 seconds
        if (reportSendResult.value?.type === 'success') {
          setTimeout(() => {
            reportSendResult.value = null;
          }, 5000);
        }
      }
    };

    onMounted(async () => {
      await store.dispatch('settings/fetchSettings')
      settings.value = {
        primaryColor: store.state.settings.primaryColor,
        secondaryColor: store.state.settings.secondaryColor,
        title: store.state.settings.title,
        useDefaultLogo: store.state.settings.useDefaultLogo,
        maxCrawlers: store.state.settings.maxCrawlers
      }
      await fetchEmailConfig()
      if (store.getters.isTeamAdmin || store.getters.isNetworkAdmin) {
        await fetchEmailPreferences();
      }
    })

    return {
      settings,
      currentLogo,
      logoUrl,
      logoInput,
      isLoading,
      hasChanges,
      handleLogoUpload,
      handleColorChange,
      revertColors,
      removeLogo,
      saveSettings,
      emailConfig,
      testEmailAddress,
      isTestingEmail,
      emailTestResult,
      sendTestEmail,
      emailPreferences,
      getFrequencyDescription,
      saveEmailPreferences,
      isTeamAdmin: computed(() => store.getters.isTeamAdmin),
      isNetworkAdmin: computed(() => store.getters.isNetworkAdmin),
      isSendingReport,
      reportSendResult,
      sendReportNow
    }
  }
}
</script>

<style scoped>
.settings-view {
  padding: 40px;
  max-width: 900px;
  margin: 0 auto;
}

.settings-container {
  background: var(--card-background);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 30px;
}

.settings-section {
  margin-bottom: 40px;
}

.settings-section h2 {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.setting-group {
  margin-bottom: 30px;
}

.setting-group h3 {
  margin-bottom: 15px;
  color: var(--text-color);
}

.logo-preview {
  margin-bottom: 15px;
  padding: 20px;
  background: var(--background-color);
  border-radius: 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.logo-preview img {
  max-width: 200px;
  max-height: 100px;
  object-fit: contain;
}

.file-input {
  display: none;
}

.upload-btn {
  background-color: var(--primary-color);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.upload-btn:hover {
  opacity: 0.9;
}

.color-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-picker label {
  font-weight: 500;
  color: var(--text-color);
}

.color-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.color-input-group input[type="color"] {
  width: 50px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.color-input-group input[type="text"] {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: monospace;
}

.setting-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.save-btn {
  background-color: var(--primary-color);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn:not(:disabled):hover {
  opacity: 0.9;
}

.title-input {
  max-width: 400px;
  margin-bottom: 20px;
}

.title-input input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 16px;
}

.revert-btn {
  margin-top: 15px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color);
}

.revert-btn:hover {
  background-color: var(--background-color-hover);
  border-color: var(--border-color-hover);
}

.remove-logo-btn {
  background-color: var(--background-color);
  color: #dc3545;
  border: 1px solid #dc3545;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.remove-logo-btn:hover {
  background-color: #dc3545;
  color: white;
}

.logo-options {
  margin-bottom: 1rem;
}

.default-logo-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.default-logo-toggle input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.default-logo-preview {
  padding: 1rem;
  background: var(--border-color);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.email-settings {
  background: var(--background-color);
  padding: 20px;
  border-radius: 8px;
}

.email-config {
  margin-bottom: 30px;
}

.config-item {
  display: flex;
  margin-bottom: 10px;
  padding: 8px;
  background: var(--card-background);
  border-radius: 4px;
}

.config-item label {
  font-weight: 500;
  min-width: 120px;
  margin-bottom: 0;
}

.test-email {
  background: var(--card-background);
  padding: 20px;
  border-radius: 8px;
}

.test-email h4 {
  margin-bottom: 15px;
  color: var(--text-color);
}

.test-btn {
  background-color: var(--primary-color);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-btn:not(:disabled):hover {
  opacity: 0.9;
}

.test-result {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9em;
}

.test-result.success {
  background-color: var(--success-background);
  color: #28a745;
}

.test-result.error {
  background-color: var(--error-background);
  color: #dc3545;
}

.email-notifications {
  background: var(--background-color);
  padding: 20px;
  border-radius: 8px;
}

.notification-settings {
  background: var(--card-background);
  padding: 20px;
  border-radius: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.help-text {
  margin-top: 10px;
  font-size: 0.85em;
  color: var(--text-muted);
  line-height: 1.5;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid var(--primary-color);
}

.send-now-button {
  margin-top: 15px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.send-now-button:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.send-now-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-result {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.send-result.success {
  background-color: var(--success-background);
  color: #28a745;
}

.send-result.error {
  background-color: var(--error-background);
  color: #dc3545;
}

.performance-settings {
  background: var(--background-color);
  padding: 20px;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 20px;
}

.crawler-config {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crawler-config input {
  width: 50px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.input-description {
  font-size: 0.9em;
  color: var(--text-muted);
}
</style> 