import axios from 'axios'

// Load initial state from localStorage if available
const loadInitialState = () => {
  const savedSettings = localStorage.getItem('appSettings')
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      updateCSSVariables(parsed)
      return {
        ...parsed,
        isLoading: false,
        error: null
      }
    } catch (e) {
      console.error('Failed to parse saved settings:', e)
    }
  }
  return {
    primaryColor: '#388fec',
    secondaryColor: '#FF006E',
    title: 'WiA11y',
    logo: null,
    useDefaultLogo: true,
    isLoading: false,
    error: null
  }
}

const state = loadInitialState()

const getters = {
  getPrimaryColor: state => state.primaryColor,
  getSecondaryColor: state => state.secondaryColor,
  getLogo: state => state.logo,
  getTitle: state => state.title
}

const actions = {
  async fetchSettings({ commit }) {
    try {
      commit('SET_LOADING', true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.VUE_APP_API_URL}/api/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      commit('SET_SETTINGS', response.data)
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(response.data))
      // Update CSS variables
      updateCSSVariables(response.data)
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
  }
}

// Helper function to update CSS variables
function updateCSSVariables(settings) {
  document.documentElement.style.setProperty('--primary-color', settings.primaryColor)
  document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor)
  // Add hover state color (slightly darker)
  const primaryHover = adjustColor(settings.primaryColor, -20)
  document.documentElement.style.setProperty('--primary-hover', primaryHover)
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