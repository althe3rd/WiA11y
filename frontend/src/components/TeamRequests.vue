<template>
  <div class="team-requests">
    <h2>Pending Team Requests</h2>
    
    <div v-if="loading" class="loading">
      Loading requests...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <!-- Creation Requests -->
      <div v-if="creationRequests.length > 0" class="requests-section">
        <h3>Team Creation Requests</h3>
        <div class="requests-grid">
          <div v-for="request in creationRequests" :key="request._id" class="request-card">
            <div class="request-header">
              <h4>{{ request.teamName || 'Unnamed Team' }}</h4>
              <span class="date">{{ formatDate(request.createdAt) }}</span>
            </div>
            <p class="requester">
              From: {{ request.requester?.name || 'Unknown User' }}
              <span class="email">({{ request.requester?.email || 'No email' }})</span>
            </p>
            <p class="description">{{ request.description || 'No description' }}</p>
            <div class="review-section">
              <div class="notes-field">
                <label for="notes">Review Notes:</label>
                <textarea 
                  :id="'notes-' + request._id"
                  v-model="request.reviewNotes"
                  placeholder="Add notes about your decision..."
                ></textarea>
              </div>
              <div class="actions">
                <button 
                  @click="reviewRequest(request._id, 'approved', request.reviewNotes)"
                  class="approve-btn"
                >
                  Approve
                </button>
                <button 
                  @click="reviewRequest(request._id, 'rejected', request.reviewNotes)"
                  class="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Join Requests -->
      <div v-if="joinRequests.length > 0" class="requests-section">
        <h3>Team Join Requests</h3>
        <div class="requests-grid">
          <div v-for="request in joinRequests" :key="request._id" class="request-card">
            <div class="request-header">
              <h4>{{ request.team?.name || 'Unknown Team' }}</h4>
              <span class="date">{{ formatDate(request.createdAt) }}</span>
            </div>
            <p class="requester">
              From: {{ request.requester?.name || 'Unknown User' }}
              <span class="email">({{ request.requester?.email || 'No email' }})</span>
            </p>
            <p v-if="request.message" class="message">
              Message: {{ request.message }}
            </p>
            <div class="review-section">
              <div class="notes-field">
                <label for="notes">Review Notes:</label>
                <textarea 
                  :id="'notes-' + request._id"
                  v-model="request.reviewNotes"
                  placeholder="Add notes about your decision..."
                ></textarea>
              </div>
              <div class="actions">
                <button 
                  @click="reviewRequest(request._id, 'approved', request.reviewNotes)"
                  class="approve-btn"
                >
                  Approve
                </button>
                <button 
                  @click="reviewRequest(request._id, 'rejected', request.reviewNotes)"
                  class="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="creationRequests.length === 0 && joinRequests.length === 0" class="no-requests">
        No pending requests at this time.
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import api from '../api/axios'

export default {
  name: 'TeamRequests',
  
  setup() {
    const store = useStore()
    const requests = ref([])
    const loading = ref(true)
    const error = ref(null)

    const creationRequests = computed(() => 
      requests.value.filter(req => req.type === 'create')
    )

    const joinRequests = computed(() => 
      requests.value.filter(req => req.type === 'join')
    )

    const fetchRequests = async () => {
      try {
        loading.value = true
        error.value = null
        const endpoint = store.getters.isNetworkAdmin 
          ? '/api/teams/requests/pending'
          : '/api/teams/requests/pending/admin'
        const response = await api.get(endpoint)
        requests.value = response.data.map(req => ({
          ...req,
          reviewNotes: ''
        }))
      } catch (err) {
        console.error('Error fetching requests:', err)
        error.value = err.response?.data?.error || 'Failed to load requests'
      } finally {
        loading.value = false
      }
    }

    const reviewRequest = async (requestId, status, notes) => {
      try {
        await api.post(`/api/teams/requests/${requestId}/review`, {
          status,
          notes
        })
        // After successful review, refresh user data and teams
        if (status === 'approved') {
          const response = await api.get('/api/auth/me')
          store.commit('setUser', response.data)
          await store.dispatch('fetchTeams')
        }
        await fetchRequests()
      } catch (err) {
        console.error('Error reviewing request:', err)
        alert(err.response?.data?.error || 'Failed to review request')
      }
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    onMounted(fetchRequests)

    return {
      requests,
      loading,
      error,
      creationRequests,
      joinRequests,
      reviewRequest,
      formatDate
    }
  }
}
</script>

<style scoped>
.team-requests {
  background: var(--card-background);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.requests-section {
  margin-bottom: 30px;
}

.requests-section h3 {
  margin-bottom: 20px;
  color: var(--text-color);
}

.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.request-card {
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.request-header h4 {
  margin: 0;
  color: var(--text-color);
}

.date {
  color: var(--text-muted);
  font-size: 0.9em;
}

.requester {
  margin: 10px 0;
  color: var(--text-color);
}

.email {
  color: var(--text-muted);
  margin-left: 5px;
}

.description, .message {
  color: var(--text-muted);
  margin: 10px 0;
  line-height: 1.4;
}

.review-section {
  margin-top: 20px;
}

.notes-field {
  margin-bottom: 15px;
}

.notes-field label {
  display: block;
  margin-bottom: 5px;
  color: var(--text-color);
}

.notes-field textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-background);
  color: var(--text-color);
  resize: vertical;
}

.actions {
  display: flex;
  gap: 10px;
}

.approve-btn, .reject-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.approve-btn {
  background-color: #28a745;
  color: white;
}

.reject-btn {
  background-color: #dc3545;
  color: white;
}

.loading, .error, .no-requests {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.error {
  color: #dc3545;
}
</style> 