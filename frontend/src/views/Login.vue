<template>
  <div class="login-container">
    <div class="login-form">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required
          >
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required
          >
        </div>
        <div v-if="error" class="error">
          {{ error }}
        </div>
        <button type="submit">Login</button>
        <div class="links">
          <div class="register-link">
            Don't have an account? <router-link to="/register">Register</router-link>
          </div>
          <div class="forgot-password-link">
            <router-link to="/forgot-password">Forgot Password?</router-link>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import api from '../api/axios';

export default {
  name: 'Login',
  setup() {
    const store = useStore();
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const error = ref('');

    const handleLogin = async () => {
      try {
        error.value = null;
        await store.dispatch('login', {
          email: email.value,
          password: password.value
        });
        router.push('/dashboard');
      } catch (err) {
        error.value = err.response?.data?.error || 'Login failed';
      }
    };

    return {
      email,
      password,
      error,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
}

.login-form {
  background: var(--card-background);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
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

.error {
  color: #f44336;
  margin-bottom: 1rem;
}

.links {
  margin-top: 1rem;
  text-align: center;
}

.register-link {
  text-align: center;
  font-size: 0.9em;
}

.register-link a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s;
}

.register-link a:hover {
  color: var(--primary-hover);
}

.forgot-password-link {
  margin-top: 0.5rem;
  font-size: 0.9em;
}

.forgot-password-link a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-password-link a:hover {
  color: var(--primary-hover);
}
</style> 