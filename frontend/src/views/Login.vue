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
        <div class="register-link">
          Don't have an account? <router-link to="/register">Register</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import axios from 'axios';

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
        const response = await axios.post('/api/users/login', {
          email: email.value,
          password: password.value
        });
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
  background-color: #f5f5f5;
}

.login-form {
  background: white;
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
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  color: #f44336;
  margin-bottom: 1rem;
}

.register-link {
  text-align: center;
  font-size: 0.9em;
}

.register-link a {
  color: #4CAF50;
  text-decoration: none;
}
</style> 