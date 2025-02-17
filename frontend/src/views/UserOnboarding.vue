<template>
  <div class="onboarding-container">
    <div v-if="pendingRequest" class="pending-request-message">
      <h2>Request Under Review</h2>
      <p>Your team request is currently being reviewed. You will receive an email once it has been processed.</p>
    </div>

    <div v-else class="onboarding-card">
      <h1>Welcome to WiA11y!</h1>
      <p class="subtitle">Let's get you set up with a team</p>

      <!-- Step 1: Choose action -->
      <div v-if="currentStep === 'choose_action'" class="step-content">
        <h2>Would you like to:</h2>
        <div class="action-buttons">
          <button 
            class="button-primary"
            @click="currentStep = 'create_team'"
          >
            Create a New Team
          </button>
          <button 
            class="button-secondary"
            @click="loadTeams"
          >
            Join an Existing Team
          </button>
        </div>
      </div>

      <!-- Step 2a: Create Team Form -->
      <div v-if="currentStep === 'create_team'" class="step-content">
        <h2>Create a New Team</h2>
        <form @submit.prevent="submitTeamCreation">
          <div class="form-group">
            <label for="teamName">Team Name</label>
            <input 
              id="teamName"
              v-model="teamName"
              type="text"
              required
              placeholder="Enter team name"
            >
          </div>
          <div class="form-group">
            <label for="teamDescription">Team Description</label>
            <textarea
              id="teamDescription"
              v-model="teamDescription"
              required
              placeholder="Describe your team's purpose"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="button-secondary" @click="currentStep = 'choose_action'">
              Back
            </button>
            <button type="submit" class="button-primary">
              Submit Request
            </button>
          </div>
        </form>
      </div>

      <!-- Step 2b: Join Team Selection -->
      <div v-if="currentStep === 'join_team'" class="step-content">
        <h2>Select a Team to Join</h2>
        <div v-if="loading" class="loading">Loading teams...</div>
        <div v-else-if="teams.length === 0" class="no-teams">
          <p>No teams are currently available.</p>
          <button class="button-primary" @click="currentStep = 'create_team'">
            Create a Team Instead
          </button>
        </div>
        <div v-else class="teams-list">
          <div 
            v-for="team in teams" 
            :key="team._id"
            class="team-item"
            :class="{ selected: selectedTeam === team._id }"
            @click="selectedTeam = team._id"
          >
            <h3>{{ team.name }}</h3>
            <p>{{ team.description }}</p>
          </div>
          <div class="form-actions">
            <button type="button" class="button-secondary" @click="currentStep = 'choose_action'">
              Back
            </button>
            <button 
              class="button-primary" 
              :disabled="!selectedTeam"
              @click="submitTeamJoinRequest"
            >
              Request to Join
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../api/axios'

export default {
  name: 'UserOnboarding',
  setup() {
    const router = useRouter()
    const store = useStore()
    const currentStep = ref('choose_action')
    const teams = ref([])
    const loading = ref(false)
    const error = ref(null)
    const teamName = ref('')
    const teamDescription = ref('')
    const selectedTeam = ref(null)
    const pendingRequest = ref(false)

    const checkPendingRequest = async () => {
      try {
        const response = await api.get('/api/teams/request/status');
        pendingRequest.value = response.data.hasPendingRequest;
      } catch (err) {
        console.error('Failed to check request status:', err);
      }
    };

    const loadTeams = async () => {
      try {
        loading.value = true
        error.value = null
        const response = await api.get('/api/teams/available')
        teams.value = response.data
        currentStep.value = 'join_team'
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to load teams'
      } finally {
        loading.value = false
      }
    }

    const submitTeamCreation = async () => {
      try {
        loading.value = true
        error.value = null
        await api.post('/api/teams/request', {
          name: teamName.value,
          description: teamDescription.value
        })
        pendingRequest.value = true
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to submit team creation request'
      } finally {
        loading.value = false
      }
    }

    const submitTeamJoinRequest = async () => {
      try {
        loading.value = true
        error.value = null
        await api.post(`/api/teams/${selectedTeam.value}/join-request`)
        pendingRequest.value = true
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to submit join request'
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      checkPendingRequest();
    });

    return {
      currentStep,
      teams,
      loading,
      error,
      teamName,
      teamDescription,
      selectedTeam,
      pendingRequest,
      loadTeams,
      submitTeamCreation,
      submitTeamJoinRequest
    }
  }
}
</script>

<style scoped>
.onboarding-container {
  min-height: 100vh;
  padding: 20px;
  background-color: var(--background-color);
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.onboarding-card, .pending-request-message {
  background: var(--card-background);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.pending-request-message {
  text-align: center;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 30px;
}

.step-content {
  margin-top: 30px;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.teams-list {
  margin-top: 20px;
}

.team-item {
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.team-item:hover {
  border-color: var(--primary-color);
  background-color: var(--hover-background);
}

.team-item.selected {
  border-color: var(--primary-color);
  background-color: rgba(56, 143, 236, 0.1);
}

.team-item h3 {
  margin: 0 0 10px 0;
}

.team-item p {
  margin: 0;
  color: var(--text-muted);
}

.error-message {
  color: #dc3545;
  margin-top: 20px;
  padding: 10px;
  background-color: rgba(220, 53, 69, 0.1);
  border-radius: 4px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
}

.no-teams {
  text-align: center;
  padding: 20px;
}
</style> 