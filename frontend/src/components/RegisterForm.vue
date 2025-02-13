<template>
  <div class="register-form">
    <form @submit.prevent="handleSubmit">
      <!-- ... other form fields ... -->
      
      <div v-if="isFirstUser" class="admin-notice">
        <p class="notice-text">
          You will be registered as a network administrator since this is the first user account.
        </p>
      </div>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Registering...' : 'Register' }}
      </button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isSubmitting: false,
      isFirstUser: false
    }
  },
  async created() {
    // Check if this will be the first user
    try {
      const response = await this.$axios.get('/api/users/count');
      this.isFirstUser = response.data.count === 0;
    } catch (error) {
      console.error('Error checking user count:', error);
    }
  },
  // ... rest of the component ...
}
</script>

<style scoped>
.admin-notice {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 4px;
  border: 1px solid #90caf9;
}

.notice-text {
  color: #1976d2;
  margin: 0;
  font-size: 0.9rem;
}
</style> 