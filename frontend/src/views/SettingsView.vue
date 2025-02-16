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
      useDefaultLogo: store.state.settings.useDefaultLogo
    })
    
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
             settings.value.useDefaultLogo !== store.state.settings.useDefaultLogo
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
        if (!confirm('Are you sure you want to remove the logo?')) {
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
          useDefaultLogo: updatedSettings.useDefaultLogo
        }
        alert('Settings saved successfully')
      } catch (error) {
        alert('Failed to save settings. Please try again.')
      }
    }

    onMounted(async () => {
      await store.dispatch('settings/fetchSettings')
      settings.value = {
        primaryColor: store.state.settings.primaryColor,
        secondaryColor: store.state.settings.secondaryColor,
        title: store.state.settings.title,
        useDefaultLogo: store.state.settings.useDefaultLogo
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
}

.revert-btn:hover {
  background-color: #e9ecef;
  border-color: #ced4da;
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
</style> 