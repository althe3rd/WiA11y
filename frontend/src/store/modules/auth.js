async login({ commit }, credentials) {
  try {
    const response = await axios.post('/api/users/login', credentials);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Fetch user's team information
    const teamResponse = await axios.get('/api/teams/managed', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Add team information to user object
    const userWithTeam = {
      ...user,
      team: teamResponse.data[0] // Assuming the first team is the primary team
    };
    
    commit('SET_USER', userWithTeam);
    commit('SET_TOKEN', token);
    
    return true;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}, 

SET_USER(state, user) {
  state.user = user;
  // Also update localStorage with the latest user data including team info
  localStorage.setItem('user', JSON.stringify(user));
}, 