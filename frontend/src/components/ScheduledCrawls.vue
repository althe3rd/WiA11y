<template>
  <div class="scheduled-crawls">
    <h2>Scheduled Scans</h2>
    
    <div v-if="loading" class="loading">
      <font-awesome-icon icon="fa-circle-notch" class="fa-spin" /> 
      Loading scheduled scans...
    </div>
    
    <div v-else-if="scheduledCrawls.length === 0" class="no-crawls">
      <p>No scheduled scans found. You can schedule a scan when starting a new scan.</p>
    </div>
    
    <div v-else class="crawls-table">
      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Team</th>
            <th>Frequency</th>
            <th>Next Run</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="crawl in scheduledCrawls" :key="crawl._id">
            <td>{{ crawl.domain }}</td>
            <td>{{ crawl.team.name }}</td>
            <td>{{ formatFrequency(crawl.scheduleFrequency) }}</td>
            <td>{{ formatDate(crawl.nextScheduledRun) }}</td>
            <td class="actions">
              <button 
                class="action-button" 
                @click="unscheduleCrawl(crawl)"
                :disabled="updatingCrawlId === crawl._id"
              >
                <span v-if="updatingCrawlId !== crawl._id">
                  <font-awesome-icon icon="fa-calendar-xmark" />
                  Remove Schedule
                </span>
                <span v-else>
                  <font-awesome-icon icon="fa-circle-notch" class="fa-spin" />
                  Removing...
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../api/axios';
import notify from '../utils/notify';

export default {
  name: 'ScheduledCrawls',
  setup() {
    const scheduledCrawls = ref([]);
    const loading = ref(true);
    const updatingCrawlId = ref(null);

    const fetchScheduledCrawls = async () => {
      try {
        loading.value = true;
        const response = await api.get('/api/crawls/scheduled');
        scheduledCrawls.value = response.data;
      } catch (error) {
        console.error('Error fetching scheduled crawls:', error);
        notify.error('Failed to load scheduled scans');
      } finally {
        loading.value = false;
      }
    };

    const unscheduleCrawl = async (crawl) => {
      try {
        updatingCrawlId.value = crawl._id;
        
        await api.patch(`/api/crawls/${crawl._id}/schedule`, {
          isScheduled: false
        });
        
        // Remove from list
        scheduledCrawls.value = scheduledCrawls.value.filter(c => c._id !== crawl._id);
        
        notify.success(`Scheduled scan for ${crawl.domain} has been removed`);
      } catch (error) {
        console.error('Error unscheduling crawl:', error);
        notify.error('Failed to remove scheduled scan');
      } finally {
        updatingCrawlId.value = null;
      }
    };

    const formatFrequency = (frequency) => {
      switch (frequency) {
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'monthly': return 'Monthly';
        default: return frequency;
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'Not scheduled';
      
      const date = new Date(dateString);
      return date.toLocaleString(undefined, { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    onMounted(fetchScheduledCrawls);

    return {
      scheduledCrawls,
      loading,
      updatingCrawlId,
      unscheduleCrawl,
      formatFrequency,
      formatDate
    };
  }
};
</script>

<style scoped>
.scheduled-crawls {
  padding: 20px;
  background: var(--card-background);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-color);
  font-size: 1.5rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-style: italic;
}

.no-crawls {
  color: var(--text-muted);
  font-style: italic;
  padding: 10px 0;
}

.crawls-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background-color: var(--background-color);
  font-weight: 600;
  color: var(--text-color);
}

tr:hover {
  background-color: var(--background-color);
}

.actions {
  display: flex;
  gap: 10px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: var(--danger-color, #dc3545);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.action-button:hover:not(:disabled) {
  background-color: var(--danger-hover-color, #c82333);
}

.action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style> 