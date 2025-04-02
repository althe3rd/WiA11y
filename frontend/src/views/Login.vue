<template>
  <div class="login-container">
    <div class="theme-toggle-container">
      <DarkModeToggle />
    </div>
    <div class="login-form">
      <Logo />
      <h2>Login</h2>
      <div v-if="error" class="error">{{ error }}</div>
      <form @submit.prevent="login">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      <div class="links">
        <div class="register-link">
          <router-link to="/register">Don't have an account? Register</router-link>
        </div>
        <div class="forgot-password-link">
          <router-link to="/forgot-password">Forgot your password?</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import Logo from '@/components/Logo.vue'
import DarkModeToggle from '@/components/DarkModeToggle.vue'

export default {
  name: 'Login',
  components: {
    Logo,
    DarkModeToggle
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    const login = async () => {
      try {
        loading.value = true
        await store.dispatch('login', {
          email: email.value,
          password: password.value
        })
        router.push('/dashboard')
      } catch (err) {
        error.value = err.response?.data?.error || 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      email,
      password,
      login,
      error,
      loading
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
  position: relative;
}

.theme-toggle-container {
  position: absolute;
  top: 20px;
  right: 20px;
}

.login-form {
  background: var(--card-background);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.login-form h2 {
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-color);
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
  background-color: var(--input-background);
  color: var(--text-color);
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--primary-hover);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  color: #f44336;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
}

.links {
  margin-top: 1.5rem;
  text-align: center;
}

.register-link, .forgot-password-link {
  margin-top: 0.5rem;
  font-size: 0.9em;
}

.register-link a, .forgot-password-link a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s;
}

.register-link a:hover, .forgot-password-link a:hover {
  color: var(--primary-hover);
}

@media (max-width: 768px) {
  .login-form {
    max-width: 90%;
    padding: 1.5rem;
  }
}
</style> 