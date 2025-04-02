<template>
  <div class="dark-mode-container">
    <button 
      @click="toggleTheme" 
      class="dark-mode-toggle" 
      :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
      aria-label="Toggle dark mode"
    >
      <font-awesome-icon v-if="isDarkMode" icon="fa-sun" />
      <font-awesome-icon v-else icon="fa-moon" />
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'DarkModeToggle',
  setup() {
    const store = useStore()
    
    // Get the current dark mode state from the store
    const isDarkMode = computed(() => store.state.settings.darkMode)
    
    // Toggle the theme
    const toggleTheme = () => {
      store.dispatch('settings/toggleDarkMode')
    }
    
    return {
      isDarkMode,
      toggleTheme
    }
  }
}
</script>

<style scoped>
.dark-mode-container {
  display: flex;
  align-items: center;
}

.dark-mode-toggle {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
}

.dark-mode-toggle:hover {
  background-color: var(--hover-background);
  transform: rotate(15deg);
}

/* Animation styles for the icons */
.dark-mode-toggle :deep(svg) {
  transition: transform 0.5s ease;
}

.dark-mode-toggle:hover :deep(svg) {
  transform: rotate(30deg);
}

@media (max-width: 768px) {
  .dark-mode-toggle {
    font-size: 1rem;
    width: 32px;
    height: 32px;
    padding: 6px;
  }
}
</style> 