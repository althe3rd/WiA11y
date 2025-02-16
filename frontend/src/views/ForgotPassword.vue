<template>
  <div class="forgot-password-container">
    <div class="forgot-password-form">
      <h2>Reset Password</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required
          >
        </div>
        <div v-if="error" class="error">
          {{ error }}
        </div>
        <div v-if="success" class="success">
          {{ success }}
        </div>
        <button type="submit">Send Reset Instructions</button>
        <div class="login-link">
          Remember your password? <router-link to="/login">Login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import api from '../api/axios';

export default {
  name: 'ForgotPassword',
  setup() {
    const email = ref('');
    const error = ref('');
    const success = ref('');

    const handleSubmit = async () => {
      try {
        error.value = '';
        success.value = '';
        const response = await api.post('/api/users/forgot-password', {
          email: email.value
        });
        success.value = response.data.message;
        email.value = '';
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to process request';
      }
    };

    return {
      email,
      error,
      success,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.forgot-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.forgot-password-form {
  background: var(--card-background);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

/* ... rest of the styles similar to Login.vue ... */
</style> 