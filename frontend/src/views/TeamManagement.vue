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
      <div v-else class="teams-container">
        <div class="table-controls">
          <div class="search-filter">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search teams..." 
              class="search-input"
            />
          </div>
        </div>
        
        <table class="teams-table">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Description</th>
              <th>Members</th>
              <th>Admins</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="organizedTeams.length === 0">
              <tr>
                <td colspan="5" class="no-teams">No teams found.</td>
              </tr>
            </template>
            <template v-else>
              <team-row 
                v-for="team in organizedTeams" 
                :key="team._id" 
                :team="team" 
                :level="0"
                @edit="editTeam"
                @manage="manageMembers"
                @toggle="toggleTeam"
                :expanded-teams="expandedTeams"
              />
            </template>
          </tbody>
        </table>
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
import TeamRow from '../components/TeamRow.vue'

export default {
  name: 'TeamManagement',
  components: {
    TeamModal,
    MemberModal,
    TeamRequests,
    TeamRow
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
    const searchQuery = ref('')
    const expandedTeams = ref([])

    const isNetworkAdmin = computed(() => store.getters.isNetworkAdmin)
    
    // Organize teams into parent/child hierarchy with unlimited depth
    const organizedTeams = computed(() => {
      if (!teams.value.length) return [];
      
      let filtered = [...teams.value];
      
      // Apply search filter if provided
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(team => 
          team.name.toLowerCase().includes(query) || 
          (team.description && team.description.toLowerCase().includes(query))
        );
        
        // When filtering, return a flat list for better results display
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // Build a nested hierarchy
      // First, get the top-level teams (teams with no parent)
      const topLevelTeams = filtered.filter(team => !team.parentTeam);
      
      // Create a map of teams by ID for easy lookup
      const teamsById = filtered.reduce((acc, team) => {
        acc[team._id] = { ...team, childTeams: [] };
        return acc;
      }, {});
      
      // Build the hierarchy
      filtered.forEach(team => {
        if (team.parentTeam && teamsById[team.parentTeam._id]) {
          teamsById[team.parentTeam._id].childTeams.push(teamsById[team._id]);
        }
      });
      
      // Sort all teams by name
      const sortTeams = (teams) => {
        teams.sort((a, b) => a.name.localeCompare(b.name));
        teams.forEach(team => {
          if (team.childTeams && team.childTeams.length) {
            sortTeams(team.childTeams);
          }
        });
        return teams;
      };
      
      // Return the sorted top-level teams with their nested children
      return sortTeams(topLevelTeams.map(team => teamsById[team._id]));
    });

    const toggleTeam = (teamId) => {
      const index = expandedTeams.value.indexOf(teamId);
      if (index === -1) {
        expandedTeams.value.push(teamId);
      } else {
        expandedTeams.value.splice(index, 1);
      }
    };

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
      updateTeamMembers,
      organizedTeams,
      expandedTeams,
      toggleTeam,
      searchQuery
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

.teams-container {
  margin-top: 20px;
}

.table-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 250px;
}

.teams-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.teams-table th,
.teams-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.teams-table th {
  background-color: var(--background-color);
  font-weight: 600;
  color: var(--text-color);
}

.teams-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.teams-table tbody tr.parent-team {
  background-color: var(--background-color);
}

.teams-table tbody tr.child-team {
  background-color: rgba(56, 143, 236, 0.04);
}

.team-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-right: 8px;
  color: var(--primary-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.expand-btn.expanded {
  transform: rotate(0deg);
}

.child-indent {
  color: var(--primary-color);
  margin-left: 4px;
}

.badge {
  background-color: var(--primary-color);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.edit-btn {
  color: var(--primary-color);
}

.members-btn {
  color: #4CAF50;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.no-teams {
  text-align: center;
  color: var(--text-muted);
  padding: 30px 0;
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

.teams-table tbody tr.child-team {
  background-color: rgba(56, 143, 236, 0.04);
}

.teams-table tbody tr.child-team:nth-child(odd) {
  background-color: rgba(56, 143, 236, 0.06);
}

.teams-table tbody tr.child-team:hover {
  background-color: rgba(56, 143, 236, 0.1);
}
</style> 