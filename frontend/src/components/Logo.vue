<template>
  <div class="logo">
    <logo-default v-if="!logo && useDefaultLogo" />
    <template v-else>
      <img v-if="logo" :src="logoUrl" alt="Application Logo" />
      <h1 v-else class="text-logo">{{ title }}</h1>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import LogoDefault from './Logo-default.vue'

export default {
  name: 'Logo',
  components: {
    'logo-default': LogoDefault
  },
  setup() {
    const store = useStore()
    const logo = computed(() => store.state.settings.logo)
    const title = computed(() => store.state.settings.title)
    const useDefaultLogo = computed(() => store.state.settings.useDefaultLogo)
    
    // Compute the full logo URL
    const logoUrl = computed(() => {
      if (!logo.value) return null
      // If the logo URL is already absolute (starts with http), use it as is
      if (logo.value.startsWith('http')) {
        return logo.value
      }
      // Otherwise, prepend the API URL
      return `${process.env.VUE_APP_API_URL}${logo.value}`
    })
    
    return {
      logo,
      logoUrl,
      title,
      useDefaultLogo
    }
  }
}
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
}

.logo img {
  height: 32px;
  object-fit: contain;
}

.text-logo {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style> 