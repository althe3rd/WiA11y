export default {
  state: {
    user: null,
    token: localStorage.getItem('token') // Initialize from localStorage
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setToken(state, token) {
      state.token = token;
      if (token) {
        localStorage.setItem('token', token); // Save token
      } else {
        localStorage.removeItem('token'); // Remove on logout
      }
    }
  },
  actions: {
    async login({ commit }, credentials) {
      // Your login logic...
      const response = await axios.post('/api/auth/login', credentials);
      const { token, user } = response.data;
      commit('setToken', token);
      commit('setUser', user);
    },
    async logout({ commit }) {
      commit('setToken', null);
      commit('setUser', null);
    },
    // Add an action to check auth status on app start
    async checkAuth({ commit, state }) {
      if (!state.token) return;
      
      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${state.token}` }
        });
        commit('setUser', response.data);
      } catch (error) {
        // If token is invalid, clear it
        commit('setToken', null);
        commit('setUser', null);
      }
    }
  }
}; 