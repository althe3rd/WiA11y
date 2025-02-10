<template>
  <div class="reset-password-container">
    <div class="reset-password-form">
      <h2>Reset Password</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="password">New Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required
          >
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            required
          >
        </div>
        <div v-if="error" class="error">
          {{ error }}
        </div>
        <div v-if="success" class="success">
          {{ success }}
        </div>
        <button type="submit">Reset Password</button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api/axios';

export default {
  name: 'ResetPassword',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const password = ref('');
    const confirmPassword = ref('');
    const error = ref('');
    const success = ref('');

    const handleSubmit = async () => {
      try {
        if (password.value !== confirmPassword.value) {
          error.value = 'Passwords do not match';
          return;
        }

        error.value = '';
        success.value = '';
        
        const response = await api.post('/api/users/reset-password', {
          token: route.query.token,
          newPassword: password.value
        });
        
        success.value = response.data.message;
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to reset password';
      }
    };

    return {
      password,
      confirmPassword,
      error,
      success,
      handleSubmit
    };
  }
};
</script>

<style scoped>
/* Similar styles to ForgotPassword.vue */
</style> 