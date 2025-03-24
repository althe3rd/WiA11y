<template>
  <div class="team-management">
    <div class="page-header">
      <h1>Team Management</h1>
      <button 
        v-if="isNetworkAdmin"
        @click="showCreateTeamModal = true" 
        class="button-primary"
      >
        Create Team
      </button>
    </div>

    <!-- Team Requests Section -->
    <TeamRequests class="requests-section" />

    <!-- Existing Teams Section -->
    <div class="teams-section">
      <h2>Teams</h2>
      <div v-if="loading" class="loading">
        Loading teams...
      </div>
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      <div v-else class="teams-grid">
        <div v-for="team in teams" :key="team._id" class="team-card">
          <div class="team-header">
            <h3>{{ team.name }}</h3>
            <div class="team-actions">
              <button 
                @click="editTeam(team)"
                class="button-secondary"
              >
                Edit
              </button>
              <button 
                @click="manageMembers(team)"
                class="button-secondary"
              >
                Manage Members
              </button>
            </div>
          </div>
          <p class="team-description">{{ team.description }}</p>
          <div class="team-stats">
            <div class="stat">
              <span class="label">Members:</span>
              <span class="value">{{ team.members?.length || 0 }}</span>
            </div>
            <div class="stat">
              <span class="label">Admins:</span>
              <span class="value">{{ team.teamAdmins?.length || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <TeamModal
      v-if="showCreateTeamModal || editingTeam"
      :team="editingTeam"
      @close="closeTeamModal"
      @save="saveTeam"
    />
    
    <MemberModal
      v-if="showMemberModal"
      :team="selectedTeam"
      @close="showMemberModal = false"
      @save="updateTeamMembers"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import api from '../api/axios'
import TeamModal from '../components/TeamModal.vue'
import MemberModal from '../components/MemberModal.vue'
import TeamRequests from '../components/TeamRequests.vue'

export default {
  name: 'TeamManagement',
  components: {
    TeamModal,
    MemberModal,
    TeamRequests
  },
  setup() {
    const store = useStore()
    const route = useRoute()
    const teams = ref([])
    const showCreateTeamModal = ref(false)
    const showMemberModal = ref(false)
    const editingTeam = ref(null)
    const selectedTeam = ref(null)
    const loading = ref(true)
    const error = ref(null)

    const isNetworkAdmin = computed(() => store.getters.isNetworkAdmin)

    const fetchTeams = async () => {
      try {
        loading.value = true
        error.value = null
        const endpoint = store.getters.isNetworkAdmin ? '/api/teams' : '/api/teams/managed'
        const response = await api.get(endpoint)
        console.log('Teams data:', response.data)
        teams.value = response.data.map(team => ({
          ...team,
          members: Array.isArray(team.members) ? team.members : [],
          teamAdmins: Array.isArray(team.teamAdmins) ? team.teamAdmins : []
        }))
      } catch (err) {
        error.value = err.error || 'Failed to load teams'
        console.error('Error fetching teams:', err)
      } finally {
        loading.value = false
      }
    }

    // Watch for route changes to refresh data
    watch(() => route.path, () => {
      fetchTeams()
    })

    // Refresh teams when store user data changes
    watch(() => store.state.user, () => {
      if (store.state.user) {
        fetchTeams()
      }
    }, { deep: true })

    const editTeam = (team) => {
      editingTeam.value = team
      showCreateTeamModal.value = true
    }

    const manageMembers = (team) => {
      // Create a deep copy of the team to avoid reference issues
      selectedTeam.value = JSON.parse(JSON.stringify(team));
      showMemberModal.value = true;
    };

    const closeTeamModal = () => {
      showCreateTeamModal.value = false
      editingTeam.value = null
    }

    const saveTeam = async (teamData) => {
      try {
        if (editingTeam.value) {
          console.log('Updating team with data:', teamData);
          await store.dispatch('updateTeam', { 
            id: editingTeam.value._id, 
            ...teamData 
          });
        } else {
          await store.dispatch('createTeam', teamData);
        }
        await fetchTeams();
        closeTeamModal();
      } catch (err) {
        console.error('Error saving team:', err);
        const errorMessage = err.response?.data?.error || 
                           err.message || 
                           'Failed to save team';
        alert(errorMessage);
      }
    };

    const updateTeamMembers = async (updates) => {
      try {
        if (!selectedTeam.value?._id) {
          throw new Error('No team selected');
        }

        // Ensure all arrays are initialized
        const teamUpdates = {
          teamId: selectedTeam.value._id,
          addAdmins: updates.addAdmins || [],
          removeAdmins: updates.removeAdmins || [],
          addMembers: updates.addMembers || [],
          removeMembers: updates.removeMembers || []
        };

        console.log('Updating team members:', teamUpdates);
        
        await store.dispatch('updateTeamMembers', teamUpdates);
        
        // Refresh the teams data
        await fetchTeams();
        
        // Refresh user data to update roles
        const userResponse = await api.get('/api/auth/me');
        store.commit('setUser', userResponse.data);
        
        // Close modal and clear selection
        showMemberModal.value = false;
        selectedTeam.value = null;
      } catch (error) {
        console.error('Error updating team members:', error);
        alert(error.response?.data?.error || error.message || 'Failed to update team members');
      }
    };

    onMounted(fetchTeams)

    return {
      teams,
      showCreateTeamModal,
      showMemberModal,
      editingTeam,
      selectedTeam,
      loading,
      error,
      isNetworkAdmin,
      editTeam,
      manageMembers,
      closeTeamModal,
      saveTeam,
      updateTeamMembers
    }
  }
}
</script>

<style scoped>
.team-management {
  padding: 40px;
  max-width: var(--container-width);
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.requests-section {
  margin-bottom: 40px;
}

.teams-section {
  background: var(--card-background);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.team-card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.team-header h3 {
  margin: 0;
  color: var(--text-color);
}

.team-actions {
  display: flex;
  gap: 10px;
}

.team-description {
  color: var(--text-muted);
  margin-bottom: 20px;
}

.team-stats {
  display: flex;
  gap: 20px;
}

.stat {
  background: var(--background-color);
  padding: 8px 12px;
  border-radius: 4px;
}

.stat .label {
  color: var(--text-muted);
  margin-right: 8px;
}

.stat .value {
  font-weight: 600;
  color: var(--primary-color);
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.error {
  color: #dc3545;
}

.button-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.button-secondary {
  background-color: var(--background-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style> 