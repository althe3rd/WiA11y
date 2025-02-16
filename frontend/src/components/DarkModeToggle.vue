<template>
  <button 
    class="dark-mode-toggle" 
    @click="toggleDarkMode"
    :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <font-awesome-icon :icon="isDarkMode ? 'fa-sun' : 'fa-moon'" />
  </button>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'DarkModeToggle',
  setup() {
    const store = useStore()
    const isDarkMode = computed(() => {
      const darkMode = store.state.settings.darkMode
      console.log('Dark mode state in toggle:', darkMode)
      return darkMode
    })

    const toggleDarkMode = () => {
      console.log('Toggle clicked, current state:', isDarkMode.value)
      store.dispatch('settings/toggleDarkMode')
    }

    onMounted(() => {
      console.log('DarkModeToggle mounted, initial state:', isDarkMode.value)
    })

    return {
      isDarkMode,
      toggleDarkMode
    }
  }
}
</script>

<style scoped>
.dark-mode-toggle {
  background: none;
  border: none;
  color: var(--text-color);
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark-mode-toggle:hover {
  background-color: var(--background-color);
}
</style> 