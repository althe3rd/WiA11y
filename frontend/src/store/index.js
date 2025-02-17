import { createStore } from 'vuex';
import api from '../api/axios';
import axios from 'axios';
import settings from './modules/settings'

export default createStore({
  state: {
    user: null,
    token: localStorage.getItem('token'),
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
    },
    settings
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setToken(state, token) {
      state.token = token;
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
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
    async initializeAuth({ commit, dispatch }) {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('Initializing auth state:', {
          hasToken: !!token,
          hasStoredUser: !!storedUser
        });

        if (token) {
          commit('setToken', token);
          
          // First restore stored user to prevent flash
          if (storedUser) {
            commit('setUser', JSON.parse(storedUser));
          }

          // Then verify with server
          try {
            const response = await api.get('/api/auth/me');
            console.log('Session restored successfully:', response.data);
            commit('setUser', response.data);
          } catch (error) {
            console.error('Failed to restore session:', error);
            // Clear invalid session
            commit('setToken', null);
            commit('setUser', null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    },
    async login({ commit, dispatch }, credentials) {
      try {
        console.log('Attempting login...');
        const response = await api.post('/api/users/login', credentials);
        const { token, user } = response.data;
        
        console.log('Login successful, storing session...');
        
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update store
        commit('setToken', token);
        commit('setUser', user);
        
        // Fetch additional data
        console.log('Fetching user teams...');
        await dispatch('fetchTeams');
        
        return response.data;
      } catch (error) {
        console.error('Login failed:', error);
        // Clear any partial session data
        commit('setToken', null);
        commit('setUser', null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw error;
      }
    },
    async logout({ commit }) {
      commit('setUser', null);
      commit('setToken', null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      commit('setTeams', []);
    },
    async fetchTeams({ commit }) {
      try {
        const { data } = await api.get('/api/teams');
        commit('setTeams', data);
        return data;
      } catch (error) {
        console.error('Failed to fetch teams:', error);
        throw error;
      }
    },
    async fetchUsers({ commit }) {
      try {
        const { data } = await api.get('/api/users/all');
        return data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
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
    async updateTeamMembers({ commit }, { teamId, ...updates }) {
      try {
        if (!teamId) {
          throw new Error('Team ID is required');
        }
        
        const { data } = await api.patch(`/api/teams/${teamId}/members`, {
          addAdmins: updates.addAdmins || [],
          removeAdmins: updates.removeAdmins || [],
          addMembers: updates.addMembers || [],
          removeMembers: updates.removeMembers || []
        });
        
        return data;
      } catch (error) {
        console.error('Failed to update team members:', error);
        throw error.response?.data?.error || error.message || 'Failed to update team members';
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
    },
    async fetchCrawlProgress({ commit }, crawlId) {
      try {
        const { data } = await api.get(`/api/crawls/${crawlId}/progress`);
        return data;
      } catch (error) {
        console.error('Error fetching crawl progress:', error);
        throw error;
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