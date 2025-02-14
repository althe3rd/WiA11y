<template>
  <div class="settings-view">
    <h1>Network Settings</h1>
    
    <div class="settings-container">
      <div class="settings-section">
        <h2>Brand Settings</h2>
        
        <div class="setting-group">
          <h3>Logo</h3>
          <div class="logo-preview" v-if="currentLogo">
            <img :src="currentLogo" alt="Current logo" />
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
        </div>

        <div class="setting-actions">
          <button 
            @click="saveSettings" 
            class="save-btn"
            :disabled="!hasChanges"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'

export default {
  name: 'SettingsView',
  setup() {
    const store = useStore()
    const logoInput = ref(null)
    const currentLogo = ref(null)
    const originalSettings = ref(null)
    const settings = ref({
      primaryColor: '#7055A4',
      secondaryColor: '#0579A9'
    })
    
    // Load current settings
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`${process.env.VUE_APP_API_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        settings.value = { ...response.data }
        originalSettings.value = { ...response.data }
        if (response.data.logo) {
          currentLogo.value = response.data.logo
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    const hasChanges = computed(() => {
      if (!originalSettings.value) return false
      return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
    })

    const handleLogoUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('logo', file)

      try {
        const token = localStorage.getItem('token')
        const response = await axios.post(
          `${process.env.VUE_APP_API_URL}/api/settings/logo`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        currentLogo.value = response.data.logo
        settings.value.logo = response.data.logo
      } catch (error) {
        console.error('Failed to upload logo:', error)
        alert('Failed to upload logo. Please try again.')
      }
    }

    const handleColorChange = () => {
      // Validate color format
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(settings.value.primaryColor)) {
        settings.value.primaryColor = originalSettings.value.primaryColor
      }
      if (!colorRegex.test(settings.value.secondaryColor)) {
        settings.value.secondaryColor = originalSettings.value.secondaryColor
      }
    }

    const saveSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        await axios.post(
          `${process.env.VUE_APP_API_URL}/api/settings`,
          settings.value,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
        originalSettings.value = { ...settings.value }
        // Update global CSS variables
        document.documentElement.style.setProperty('--primary-color', settings.value.primaryColor)
        document.documentElement.style.setProperty('--secondary-color', settings.value.secondaryColor)
        alert('Settings saved successfully')
      } catch (error) {
        console.error('Failed to save settings:', error)
        alert('Failed to save settings. Please try again.')
      }
    }

    // Load settings on component mount
    loadSettings()

    return {
      settings,
      currentLogo,
      logoInput,
      hasChanges,
      handleLogoUpload,
      handleColorChange,
      saveSettings
    }
  }
}
</script>

<style scoped>
.settings-view {
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
}

.settings-container {
  background: white;
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
  color: #2c3e50;
}

.logo-preview {
  margin-bottom: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 4px;
  text-align: center;
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
  color: #2c3e50;
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
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.color-input-group input[type="text"] {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
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
</style> 