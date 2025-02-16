<template>
  <div class="team-list">
    <div class="header">
      <h2>Teams</h2>
      <button @click="showCreateTeamModal = true" class="create-btn">Create Team</button>
    </div>

    <div class="teams-grid">
      <div v-for="team in teams" :key="team._id" class="team-card">
        <div class="team-header">
          <h3>{{ team.name }}</h3>
          <span class="member-count">
            {{ team.members.length + team.teamAdmins.length }} members
          </span>
        </div>
        <p class="description">{{ team.description }}</p>
        
        <div class="team-stats">
          <div class="stat">
            <span class="label">Created by</span>
            <span class="value">{{ team.createdBy?.name }}</span>
          </div>
          <div class="stat">
            <span class="label">Admins</span>
            <span class="value">{{ team.teamAdmins.length }}</span>
          </div>
          <div class="stat">
            <span class="label">Members</span>
            <span class="value">{{ team.members.length }}</span>
          </div>
        </div>

        <div class="actions">
          <button @click="viewTeamDetails(team)" class="view-btn">View Details</button>
          <button @click="manageTeam(team)" class="manage-btn">Manage Team</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'TeamList',
  setup() {
    const store = useStore();
    const router = useRouter();
    const teams = ref([]);
    const showCreateTeamModal = ref(false);

    const fetchTeams = async () => {
      try {
        await store.dispatch('fetchTeams');
        teams.value = store.state.teams;
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      }
    };

    const viewTeamDetails = (team) => {
      console.log('View team details:', team);
      // TODO: Implement team details view
    };

    const manageTeam = (team) => {
      router.push(`/team-management/${team._id}`);
    };

    onMounted(fetchTeams);

    return {
      teams,
      showCreateTeamModal,
      viewTeamDetails,
      manageTeam
    };
  }
};
</script>

<style scoped>
.team-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.create-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.team-card {
  background: var(--card-background);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.member-count {
  font-size: 0.9em;
  color: #666;
}

.description {
  color: #666;
  margin-bottom: 15px;
}

.team-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.stat {
  text-align: center;
}

.label {
  display: block;
  font-size: 0.8em;
  color: #666;
}

.value {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 10px;
}

.view-btn, .manage-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.view-btn {
  background-color: #2196F3;
  color: white;
}

.manage-btn {
  background-color: #FF9800;
  color: white;
}
</style> 