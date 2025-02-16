import axios from 'axios'

// Load initial state from localStorage if available
const loadInitialState = () => {
  const savedSettings = localStorage.getItem('appSettings')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const savedDarkMode = localStorage.getItem('darkMode')
  
  console.log('Initial dark mode state:', {
    prefersDark,
    savedDarkMode,
    currentState: savedDarkMode !== null ? savedDarkMode === 'true' : prefersDark
  })
  
  // Determine initial dark mode state
  const darkMode = savedDarkMode !== null 
    ? savedDarkMode === 'true'
    : prefersDark
    
  // Save initial preference if not already saved
  if (savedDarkMode === null) {
    localStorage.setItem('darkMode', darkMode.toString())
  }
  
  let state = {
    primaryColor: '#388fec',
    secondaryColor: '#FF006E',
    title: 'WiA11y',
    logo: null,
    useDefaultLogo: true,
    darkMode,
    isLoading: false,
    error: null
  }
  
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      state = {
        ...state,
        ...parsed,
        darkMode // Ensure darkMode isn't overwritten by savedSettings
      }
    } catch (e) {
      console.error('Failed to parse saved settings:', e)
    }
  }
  
  // Immediately apply the dark mode state
  updateCSSVariables({ ...state, darkMode })
  
  return state
}

const state = loadInitialState()

const getters = {
  getPrimaryColor: state => state.primaryColor,
  getSecondaryColor: state => state.secondaryColor,
  getLogo: state => state.logo,
  getTitle: state => state.title
}

const actions = {
  async fetchSettings({ commit, state }) {
    try {
      commit('SET_LOADING', true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.VUE_APP_API_URL}/api/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      // Preserve the current dark mode state
      const settingsWithDarkMode = {
        ...response.data,
        darkMode: state.darkMode
      }
      
      commit('SET_SETTINGS', settingsWithDarkMode)
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(response.data))
      // Update CSS variables with preserved dark mode
      updateCSSVariables(settingsWithDarkMode)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      commit('SET_ERROR', error.message)
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async updateSettings({ commit }, settings) {
    try {
      commit('SET_LOADING', true)
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${process.env.VUE_APP_API_URL}/api/settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      commit('SET_SETTINGS', response.data)
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(response.data))
      // Update CSS variables
      updateCSSVariables(response.data)
      return response.data
    } catch (error) {
      console.error('Failed to update settings:', error)
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async uploadLogo({ commit }, formData) {
    try {
      commit('SET_LOADING', true)
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
      commit('SET_LOGO', response.data.logo)
      // Update localStorage with new logo
      const currentSettings = JSON.parse(localStorage.getItem('appSettings') || '{}')
      currentSettings.logo = response.data.logo
      localStorage.setItem('appSettings', JSON.stringify(currentSettings))
      return response.data
    } catch (error) {
      console.error('Failed to upload logo:', error)
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },

  async removeLogo({ commit }) {
    try {
      commit('SET_LOADING', true)
      const token = localStorage.getItem('token')
      const response = await axios.delete(
        `${process.env.VUE_APP_API_URL}/api/settings/logo`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      commit('SET_LOGO', null)
      // Update localStorage
      const currentSettings = JSON.parse(localStorage.getItem('appSettings') || '{}')
      currentSettings.logo = null
      localStorage.setItem('appSettings', JSON.stringify(currentSettings))
      return response.data
    } catch (error) {
      console.error('Failed to remove logo:', error)
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },

  toggleDarkMode({ commit, state }) {
    const newDarkMode = !state.darkMode
    console.log('Toggling dark mode:', { 
      current: state.darkMode, 
      new: newDarkMode 
    })
    
    // First update the state
    commit('SET_DARK_MODE', newDarkMode)
    
    // Then save to localStorage
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    // Finally update CSS variables with the complete state
    updateCSSVariables({ ...state, darkMode: newDarkMode })
  }
}

const mutations = {
  SET_SETTINGS(state, settings) {
    state.primaryColor = settings.primaryColor
    state.secondaryColor = settings.secondaryColor
    state.title = settings.title
    state.useDefaultLogo = settings.useDefaultLogo
    if (settings.logo) {
      state.logo = settings.logo
    }
    // Preserve dark mode state
    if (typeof settings.darkMode === 'boolean') {
      state.darkMode = settings.darkMode
    }
    // Save to localStorage
    localStorage.setItem('appSettings', JSON.stringify({
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      title: settings.title,
      logo: settings.logo,
      useDefaultLogo: settings.useDefaultLogo
    }))
  },
  SET_LOGO(state, logo) {
    state.logo = logo
  },
  SET_LOADING(state, isLoading) {
    state.isLoading = isLoading
  },
  SET_ERROR(state, error) {
    state.error = error
  },
  SET_DARK_MODE(state, isDark) {
    console.log('Setting dark mode:', { isDark })
    state.darkMode = isDark
  }
}

// Helper function to update CSS variables
function updateCSSVariables(settings) {
  const root = document.documentElement
  const isDark = settings.darkMode
  
  console.log('Updating CSS variables:', { isDark })
  
  // Base colors
  root.style.setProperty('--primary-color', settings.primaryColor)
  root.style.setProperty('--secondary-color', settings.secondaryColor)
  
  // Add hover state color
  const primaryHover = adjustColor(settings.primaryColor, -20)
  root.style.setProperty('--primary-hover', primaryHover)
  
  if (isDark) {
    // Dark mode colors
    root.style.setProperty('--text-color', '#e1e1e1')
    root.style.setProperty('--text-muted', '#a0a0a0')
    root.style.setProperty('--background-color', '#1a1a1a')
    root.style.setProperty('--card-background', '#2d2d2d')
    root.style.setProperty('--nav-background', '#242424')
    root.style.setProperty('--border-color', '#404040')
    root.style.setProperty('--hover-background', '#363636')
    root.style.setProperty('--input-background', '#333333')
    root.style.setProperty('--input-border', '#505050')
    root.style.setProperty('--dropdown-background', '#333333')
    root.style.setProperty('--dropdown-hover', '#404040')
    root.style.setProperty('--chart-grid', '#404040')
    root.style.setProperty('--success-background', 'rgba(40, 167, 69, 0.2)')
    root.style.setProperty('--warning-background', 'rgba(255, 193, 7, 0.2)')
    root.style.setProperty('--error-background', 'rgba(220, 53, 69, 0.2)')
  } else {
    // Light mode colors
    root.style.setProperty('--text-color', 'var(--text-color)')
    root.style.setProperty('--text-muted', '#666666')
    root.style.setProperty('--background-color', '#f5f7fa')
    root.style.setProperty('--card-background', '#ffffff')
    root.style.setProperty('--nav-background', '#ffffff')
    root.style.setProperty('--border-color', '#e1e4e8')
    root.style.setProperty('--hover-background', '#f0f0f0')
    root.style.setProperty('--input-background', '#ffffff')
    root.style.setProperty('--input-border', '#ced4da')
    root.style.setProperty('--dropdown-background', '#ffffff')
    root.style.setProperty('--dropdown-hover', 'var(--background-color)')
    root.style.setProperty('--chart-grid', '#e1e4e8')
    root.style.setProperty('--success-background', 'rgba(40, 167, 69, 0.1)')
    root.style.setProperty('--warning-background', 'rgba(255, 193, 7, 0.1)')
    root.style.setProperty('--error-background', 'rgba(220, 53, 69, 0.1)')
  }
  
  // Update data theme attribute
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

// Helper function to darken/lighten colors
function adjustColor(color, amount) {
  const clamp = (num) => Math.min(Math.max(num, 0), 255)
  
  // Remove the hash and convert to RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Adjust each component
  const adjustR = clamp(r + amount)
  const adjustG = clamp(g + amount)
  const adjustB = clamp(b + amount)
  
  // Convert back to hex
  return '#' + [adjustR, adjustG, adjustB]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
} 