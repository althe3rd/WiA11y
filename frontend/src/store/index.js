import { createStore } from 'vuex';
import api from '../api/axios';

export default createStore({
  state: {
    user: null,
    token: localStorage.getItem('token') || null,
    teams: [],
    currentTeam: null
  },
  modules: {
    crawls: {
      namespaced: true,
      state: {
        crawls: []
      },
      actions: {
        async createCrawl({ commit }, crawlData) {
          try {
            console.log('Vuex createCrawl action called with:', crawlData);
            const token = localStorage.getItem('token');
            console.log('Using token:', token);
            const { data } = await api.post('/api/crawls', crawlData, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log('Crawl created successfully:', data);
            return data;
          } catch (error) {
            console.error('Error in Vuex createCrawl:', error);
            throw error.response?.data || error;
          }
        },
        async cancelCrawl({ commit }, crawlId) {
          try {
            const token = localStorage.getItem('token');
            const { data } = await api.post(
              `/api/crawls/${crawlId}/cancel`,
              {},
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            return data;
          } catch (error) {
            throw error.response?.data || error;
          }
        }
      }
    }
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setToken(state, token) {
      state.token = token;
      if (token) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      }
    },
    setTeams(state, teams) {
      state.teams = teams;
    },
    setCurrentTeam(state, team) {
      state.currentTeam = team;
    }
  },
  actions: {
    async login({ commit }, credentials) {
      try {
        const response = await api.post('/api/users/login', credentials);
        commit('setUser', response.data.user);
        commit('setToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    async logout({ commit }) {
      commit('setUser', null);
      commit('setToken', null);
      localStorage.removeItem('user');
      commit('setTeams', []);
      commit('setCurrentTeam', null);
    },
    async fetchTeams({ commit }) {
      try {
        const token = localStorage.getItem('token');
        const { data } = await api.get('/api/teams', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Fetched teams:', data);
        commit('setTeams', data);
      } catch (error) {
        console.error('Error fetching teams:', error);
        throw error;
      }
    },
    async searchUsers({ state }, query) {
      try {
        const { data } = await api.get(`/api/users/search?q=${query}`);
        return data;
      } catch (error) {
        throw error.response.data;
      }
    },
    async updateTeamMembers({ commit }, { teamId, addAdmins, removeAdmins, addMembers, removeMembers }) {
      try {
        const token = localStorage.getItem('token');
        const { data } = await api.patch(`/api/teams/${teamId}/members`, {
          addAdmins,
          removeAdmins,
          addMembers,
          removeMembers
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return data;
      } catch (error) {
        console.error('Failed to update team members:', error);
        throw error.response?.data || error;
      }
    },
    async register({ commit }, userData) {
      try {
        await api.post('/api/users/register', userData);
      } catch (error) {
        throw error.response.data;
      }
    },
    async createTeam({ commit }, teamData) {
      try {
        const token = localStorage.getItem('token');
        const { data } = await api.post('/api/teams', teamData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return data;
      } catch (error) {
        console.error('Failed to create team:', error);
        throw error.response?.data || error;
      }
    },
    async updateTeam({ commit }, { id, ...teamData }) {
      try {
        const token = localStorage.getItem('token');
        const { data } = await api.patch(`/api/teams/${id}`, teamData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return data;
      } catch (error) {
        console.error('Failed to update team:', error);
        throw error.response?.data || error;
      }
    }
  },
  getters: {
    isAuthenticated: state => !!state.token,
    isNetworkAdmin: state => state.user?.role === 'network_admin',
    isTeamAdmin: state => ['network_admin', 'team_admin'].includes(state.user?.role),
    isAdmin: state => state.user?.role === 'admin',
    currentUser: state => state.user
  }
}); 