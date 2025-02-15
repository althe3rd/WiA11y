<template>
  <div class="register-container">
    <div class="register-form">
      <h2>Register</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Name</label>
          <input 
            type="text" 
            id="name" 
            v-model="name" 
            required
          >
        </div>
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
        <button type="submit">Register</button>
        <div class="login-link">
          Already have an account? <router-link to="/login">Login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Register',
  setup() {
    const store = useStore();
    const router = useRouter();
    const name = ref('');
    const email = ref('');
    const password = ref('');
    const error = ref('');

    const handleRegister = async () => {
      try {
        await store.dispatch('register', {
          name: name.value,
          email: email.value,
          password: password.value
        });
        router.push('/login');
      } catch (err) {
        error.value = err.error || 'Registration failed';
      }
    };

    return {
      name,
      email,
      password,
      error,
      handleRegister
    };
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
}

.register-form {
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
  margin-bottom: 1rem;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--primary-hover);
}

.error {
  color: #f44336;
  margin-bottom: 1rem;
}

.login-link {
  text-align: center;
  font-size: 0.9em;
}

.login-link a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s;
}

.login-link a:hover {
  color: var(--primary-hover);
}
</style> 