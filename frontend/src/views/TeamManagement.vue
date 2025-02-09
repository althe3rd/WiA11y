<template>
  <div class="team-management">
    <div class="header">
      <h2>Team Management</h2>
      <button @click="showCreateTeamModal = true" class="create-btn">Create Team</button>
    </div>

    <div v-if="loading" class="loading">
      Loading teams...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="teams-container">
      <div v-if="teams.length === 0" class="no-teams">
        No teams found. Create a team to get started.
      </div>
      
      <div v-else class="teams-list">
        <div v-for="team in teams" :key="team._id" class="team-card">
          <div class="team-header">
            <h3>{{ team.name }}</h3>
            <span class="member-count">
              {{ team.members.length }} members, {{ team.teamAdmins.length }} admins
            </span>
          </div>
          <p class="description">{{ team.description }}</p>
          
          <div class="members-section">
            <div class="admins-list">
              <h4>Team Admins</h4>
              <ul>
                <li v-for="admin in team.teamAdmins" :key="admin._id">
                  {{ admin.name }}
                  <span class="email">({{ admin.email }})</span>
                </li>
              </ul>
            </div>
            
            <div class="members-list">
              <h4>Team Members</h4>
              <ul>
                <li v-for="member in team.members" :key="member._id">
                  {{ member.name }}
                  <span class="email">({{ member.email }})</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div class="domains-section">
            <h4>Monitored Domains</h4>
            <ul class="domains-list">
              <li v-for="domain in team.domains" :key="domain.domain">
                {{ domain.domain }}
                <span class="domain-note" v-if="domain.notes">{{ domain.notes }}</span>
              </li>
            </ul>
          </div>

          <div class="actions">
            <button @click="editTeam(team)" class="edit-btn">Edit Team</button>
            <button @click="manageMembers(team)" class="members-btn">Manage Members</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Team Modal -->
    <TeamModal 
      v-if="showCreateTeamModal || editingTeam"
      :team="editingTeam"
      @close="closeTeamModal"
      @save="saveTeam"
    />

    <!-- Manage Members Modal -->
    <MemberModal
      v-if="showMemberModal"
      :team="selectedTeam"
      @close="showMemberModal = false"
      @save="updateTeamMembers"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import TeamModal from '../components/TeamModal.vue';
import MemberModal from '../components/MemberModal.vue';
import axios from 'axios';

export default {
  name: 'TeamManagement',
  components: {
    TeamModal,
    MemberModal
  },
  setup() {
    const store = useStore();
    const teams = ref([]);
    const showCreateTeamModal = ref(false);
    const showMemberModal = ref(false);
    const editingTeam = ref(null);
    const selectedTeam = ref(null);
    const loading = ref(true);
    const error = ref(null);

    const fetchTeams = async () => {
      try {
        loading.value = true;
        error.value = null;
        const token = localStorage.getItem('token');
        const endpoint = store.getters.isNetworkAdmin ? '/api/teams' : '/api/teams/managed';
        const response = await axios.get(`http://localhost:3000${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Teams data:', response.data);
        teams.value = response.data;
      } catch (err) {
        error.value = err.error || 'Failed to load teams';
        console.error('Error fetching teams:', err);
      } finally {
        loading.value = false;
      }
    };

    const editTeam = (team) => {
      editingTeam.value = team;
    };

    const manageMembers = (team) => {
      selectedTeam.value = team;
      showMemberModal.value = true;
    };

    const closeTeamModal = () => {
      showCreateTeamModal.value = false;
      editingTeam.value = null;
    };

    const saveTeam = async (teamData) => {
      if (editingTeam.value) {
        await store.dispatch('updateTeam', { id: editingTeam.value._id, ...teamData });
      } else {
        await store.dispatch('createTeam', teamData);
      }
      await fetchTeams();
      closeTeamModal();
    };

    const updateTeamMembers = async (memberUpdates) => {
      await store.dispatch('updateTeamMembers', {
        teamId: selectedTeam.value._id,
        ...memberUpdates
      });
      await fetchTeams();
      showMemberModal.value = false;
    };

    onMounted(fetchTeams);

    return {
      teams,
      showCreateTeamModal,
      showMemberModal,
      editingTeam,
      selectedTeam,
      loading,
      error,
      editTeam,
      manageMembers,
      closeTeamModal,
      saveTeam,
      updateTeamMembers
    };
  }
};
</script>

<style scoped>
.team-management {
  padding: 40px;
  padding-top: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.create-btn {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading, .error, .no-teams {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  margin: 20px 0;
}

.error {
  color: #f44336;
  background: #ffebee;
}

.teams-container {
  padding: 20px;
}

.teams-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.team-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.member-count {
  color: #666;
  font-size: 0.9em;
}

.description {
  color: #666;
  margin-bottom: 15px;
}

.members-section {
  margin: 15px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.admins-list, .members-list {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
}

.admins-list h4, .members-list h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.admins-list ul, .members-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admins-list li, .members-list li {
  padding: 5px 0;
  border-bottom: 1px solid #e0e0e0;
}

.email {
  color: #666;
  font-size: 0.9em;
  margin-left: 5px;
}

.domains-section {
  margin: 15px 0;
}

.domains-list {
  list-style: none;
  padding: 0;
}

.domains-list li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.domain-note {
  font-size: 0.8em;
  color: #666;
  margin-left: 10px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-btn, .members-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-btn {
  background-color: #2196F3;
  color: white;
}

.members-btn {
  background-color: #FF9800;
  color: white;
}
</style> 