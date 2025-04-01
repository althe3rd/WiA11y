<template>
  <div class="crawl-history">
    <div class="sort-controls">
      <label for="sortBy">Sort by:</label>
      <select id="sortBy" v-model="sortBy" class="sort-select">
        <option value="date">Date (Latest First)</option>
        <option value="domain">Domain Name (A-Z)</option>
        <option value="score">Score (Highest First)</option>
      </select>
    </div>
    
    <div class="crawl-list">
      <div v-for="(domainData, domain) in groupedCrawls" :key="domain" class="domain-group">
        <div 
          class="domain-header" 
          :class="{ 'expanded': expandedDomains.includes(domain) }"
          @click="toggleDomain(domain)"
        >
          <div class="domain-header-content">
            <div class="domain-info">
            <h3>{{ domain }}</h3>
            <span v-if="domainMetadata[domain]?.isArchived" class="archived-badge">Archived</span>
          </div>
          <button class="edit-metadata-btn" @click.stop="editDomainMetadata(domain)" title="Edit domain settings">
            <font-awesome-icon icon="edit" />
            <span class="edit-label">Edit</span>
          </button>
          </div>
          <div class="domain-summary">
            <span class="latest-score">
              Latest: {{ getLatestScore(domainData) }}%
            </span>
            <span class="trend-summary" :class="getDomainOverallTrendClass(domainData)">
              {{ getDomainOverallTrendSummary(domainData) }}
            </span>
            <div v-if="getInProgressScan(domainData)" class="progress-bar-container">
              <div class="progress-bar" :style="{ transform: `translateX(${getInProgressScan(domainData).progress}%)` }">
              </div>
            </div>
            <span class="expand-toggle">
              {{ expandedDomains.includes(domain) ? '▼' : '▶' }}
            </span>
          </div>
        </div>
        <div v-if="expandedDomains.includes(domain)" class="domain-details">
          <div v-for="(crawls, wcagSpec) in domainData" :key="wcagSpec" class="wcag-group">
            <h4 class="wcag-header">{{ wcagSpec }}</h4>
            <AccessibilityTrendGraph :crawls="crawls" />
            <div v-for="(crawl, index) in crawls" :key="crawl._id" class="crawl-item">
              <div class="crawl-header">
                <div class="crawl-title">
                  <div class="crawl-timestamp">
                    <font-awesome-icon icon="fa-calendar" class="timestamp-icon" />
                    {{ formatDate(crawl.createdAt) }}
                  </div>
                  <span :class="['status', crawl.status]">{{ formatStatus(crawl) }}</span>
                </div>
                <div class="crawl-stats">
                  <div class="score-container">
                    <RadialProgress 
                      :percentage="calculateScore(crawl)" 
                      size="medium"
                      :class="getScoreClass(calculateScore(crawl))"
                    />
                  </div>
                  <span 
                    v-if="index < crawls.length - 1" 
                    :class="['score-trend', getScoreTrendClass(calculateScore(crawl), calculateScore(crawls[index + 1]))]"
                  >
                    {{ getScoreDifference(calculateScore(crawl), calculateScore(crawls[index + 1])) }}
                  </span>
                  <button class="view-details-btn" @click="viewDetails(crawl)">
                    <font-awesome-icon icon="fa-chart-line" class="details-icon" />
                    View Details
                  </button>
                  <button class="run-again-btn" @click="runAgain(crawl)" title="Run this scan again with the same settings">
                    <font-awesome-icon icon="fa-redo-alt" class="run-again-icon" />
                    Run Again
                  </button>
                  <div v-if="crawl.status === 'queued'" class="queue-position">
                    Queue Position: {{ crawl.queuePosition }}
                  </div>
                  <LoadingSpinner 
                    v-if="['in_progress', 'queued'].includes(crawl.status)"
                    :text="crawl.status === 'queued' ? 'Queued...' : 'Scanning...'"
                    class="crawl-spinner"
                  />
                  <div class="crawl-actions">
                    <button 
                      v-if="crawl.status === 'in_progress'" 
                      @click="cancelCrawl(crawl._id)"
                      class="cancel-button"
                    >
                      Cancel
                    </button>
                    <button 
                      v-if="['completed', 'cancelled', 'pending', 'failed'].includes(crawl.status)"
                      @click="removeCrawl(crawl._id)"
                      class="remove-button"
                      title="Remove scan"
                    >
                      <font-awesome-icon icon="fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="crawl-details">
                <p class="created-by" v-if="crawl.createdBy">
                  Created by: {{ crawl.createdBy.name }} - {{ crawl.createdBy.email }}
                </p>
                <p class="team-info" v-if="crawl.team">
                  Team: {{ typeof crawl.team === 'object' ? crawl.team.name : getTeamName(crawl.team) }}
                </p>
                <p>Speed: {{ getCrawlSpeed(crawl.crawlRate) }}</p>
                <p>Depth Limit: {{ getDepthLabel(crawl.depthLimit) }}</p>
                <p>WCAG Specification: {{ getWcagSpec(crawl) }}</p>
                <p>Pages Scanned: {{ crawl.pagesScanned }}</p>
                <p>Violations Found: {{ crawl.violationsFound }}</p>
                <div class="violations-bar">
                  <div 
                    v-if="crawl.violationsByImpact.critical > 0"
                    class="violation-segment critical"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.critical, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.critical }}
                  </div>
                  <div 
                    v-if="crawl.violationsByImpact.serious > 0"
                    class="violation-segment serious"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.serious, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.serious }}
                  </div>
                  <div 
                    v-if="crawl.violationsByImpact.moderate > 0"
                    class="violation-segment moderate"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.moderate, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.moderate }}
                  </div>
                  <div 
                    v-if="crawl.violationsByImpact.minor > 0"
                    class="violation-segment minor"
                    :style="{ width: getViolationPercentage(crawl.violationsByImpact.minor, getTotalViolations(crawl.violationsByImpact)) + '%' }"
                  >
                    {{ crawl.violationsByImpact.minor }}
                  </div>
                </div>
                <div class="violations-legend">
                  <div class="legend-item">
                    <span class="legend-color critical"></span>
                    <span>Critical</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color serious"></span>
                    <span>Serious</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color moderate"></span>
                    <span>Moderate</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color minor"></span>
                    <span>Minor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="domainMetadata[domain]?.notes" class="domain-notes">
          {{ domainMetadata[domain].notes }}
        </div>
      </div>
    </div>
  </div>

  <!-- Domain Metadata Modal -->
  <div v-if="showMetadataModal" class="modal-overlay" @click.self="showMetadataModal = false">
    <div class="modal-content">
      <h3>Edit Domain Settings</h3>
      <form @submit.prevent="saveDomainMetadata">
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea 
            id="notes" 
            v-model="editingMetadata.notes" 
            rows="3"
            placeholder="Add notes about this domain..."
          ></textarea>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="editingMetadata.isArchived"
            >
            Mark as Archived
          </label>
          <p class="help-text">Archived domains will not be included in team statistics</p>
        </div>
        <div class="modal-actions">
          <button type="button" @click="showMetadataModal = false" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import AccessibilityTrendGraph from './AccessibilityTrendGraph.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import { useRouter } from 'vue-router';
import CrawlProgress from './CrawlProgress.vue';
import RadialProgress from './RadialProgress.vue';
import api from '../api/axios';
import { calculateScore } from '../utils/scoreCalculator';
import store from '../store';

export default {
  name: 'CrawlHistory',
  props: {
    selectedTeam: {
      type: String,
      default: ''
    },
    selectedDateRange: {
      type: String,
      default: 'all'
    },
    limit: {
      type: Number,
      default: 10
    }
  },
  components: {
    AccessibilityTrendGraph,
    LoadingSpinner,
    CrawlProgress,
    RadialProgress
  },
  setup(props, { emit }) {
    const router = useRouter();
    const crawls = ref([]);
    const pollInterval = ref(null);
    const expandedDomains = ref([]);
    const domainMetadata = ref({});
    const showMetadataModal = ref(false);
    const editingMetadata = ref({
      domain: '',
      notes: '',
      isArchived: false
    });
    const sortBy = ref('date');

    const getLatestScore = (domainData) => {
      // Find the most recent crawl across all WCAG specifications
      const allCrawls = Object.values(domainData).flat();
      const latestCrawl = allCrawls.reduce((latest, current) => {
        return !latest || new Date(current.createdAt) > new Date(latest.createdAt) 
          ? current 
          : latest;
      }, null);
      return latestCrawl ? calculateScore(latestCrawl) : 'N/A';
    };

    const fetchCrawls = async () => {
      try {
        console.log('Fetching crawls...');
        const response = await api.get('/api/crawls', {
          // Add a timestamp to prevent caching
          params: { _t: new Date().getTime() }
        });
        
        console.log('Crawls data received:', response?.data);
        
        if (response?.data && Array.isArray(response.data)) {
          // Update the crawls value with the new data
          crawls.value = response.data;
          console.log('Crawls array updated with', crawls.value.length, 'items');
          
          // Check if we have any in-progress crawls that we need to keep polling for
          const hasInProgressCrawls = crawls.value.some(crawl => crawl.status === 'in_progress');
          console.log('Has in-progress crawls:', hasInProgressCrawls);
          
          // Emit an event with the crawls data
          try {
            emit('crawls-loaded', crawls.value);
            console.log('Emitted crawls-loaded event');
          } catch (error) {
            console.error('Error emitting crawls-loaded event:', error);
          }
        } else {
          console.error('Unexpected crawls data format:', response?.data);
          // If we get an invalid response, try again in 1s
          setTimeout(fetchCrawls, 1000);
        }
      } catch (error) {
        console.error('Failed to fetch crawls:', error);
        if (error.response) {
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
        } else if (error.request) {
          console.error('No response received, request:', error.request);
        } else {
          console.error('Error setting up request:', error.message);
        }
        
        // Try again in 3s if there was an error
        setTimeout(fetchCrawls, 3000);
      }
    };
    
    // Start polling for crawls
    onMounted(() => {
      console.log('CrawlHistory component mounted - starting initial fetch');
      fetchCrawls();
      
      // Set up polling interval
      console.log('Setting up polling interval for crawl updates');
      pollInterval.value = setInterval(() => {
        console.log('Polling for crawl updates');
        fetchCrawls();
      }, 5000);
    });
    
    // Clean up polling on unmount
    onUnmounted(() => {
      console.log('CrawlHistory component unmounting - clearing poll interval');
      if (pollInterval.value) {
        clearInterval(pollInterval.value);
        pollInterval.value = null;
      }
    });

    // Add computed property for groupedCrawls
    const groupedCrawls = computed(() => {
      console.log('Computing groupedCrawls with', crawls.value.length, 'crawls');
      
      // Check if crawls array is empty or undefined
      if (!crawls.value || crawls.value.length === 0) {
        console.log('No crawls data available');
        return {};
      }
      
      // Filter by team if selected (including child teams)
      let filteredCrawls = [...crawls.value];
      
      if (props.selectedTeam) {
        // Get all teams from the store
        const allTeams = store.state.teams || [];
        // Get selected team object
        const selectedTeamObj = allTeams.find(t => t._id === props.selectedTeam);
        
        if (selectedTeamObj) {
          // Build a list of team IDs to include (the selected team and all its sub-teams)
          const teamIdsToInclude = [props.selectedTeam];
          
          // Find all child teams recursively
          const findChildTeams = (parentId) => {
            const childTeams = allTeams.filter(t => t.parentTeam && t.parentTeam._id === parentId);
            
            childTeams.forEach(childTeam => {
              teamIdsToInclude.push(childTeam._id);
              findChildTeams(childTeam._id); // Recursively find nested children
            });
          };
          
          // Start recursive search for child teams
          findChildTeams(props.selectedTeam);
          
          // Filter crawls to only include those from the selected team or its children
          filteredCrawls = filteredCrawls.filter(crawl => {
            const teamId = crawl.team?._id || crawl.team;
            return teamIdsToInclude.includes(teamId);
          });
          
          console.log('Filtered by team hierarchy:', props.selectedTeam, 'including sub-teams:', teamIdsToInclude, 'remaining:', filteredCrawls.length);
        } else {
          // Fallback to original filtering if selected team not found
          filteredCrawls = filteredCrawls.filter(crawl => {
            const teamId = crawl.team?._id || crawl.team;
            return teamId === props.selectedTeam;
          });
          console.log('Filtered by team ID only:', props.selectedTeam, 'remaining:', filteredCrawls.length);
        }
      }
      
      // Filter by date range
      if (props.selectedDateRange !== 'all') {
        const now = new Date();
        let startDate;
        
        switch(props.selectedDateRange) {
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
        }
        
        filteredCrawls = filteredCrawls.filter(crawl => {
          return new Date(crawl.createdAt) >= startDate;
        });
        console.log('Filtered by date range:', props.selectedDateRange, 'remaining:', filteredCrawls.length);
      }
      
      // Apply limit if provided
      if (props.limit > 0) {
        // Sort by date first to ensure we get the most recent
        filteredCrawls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        filteredCrawls = filteredCrawls.slice(0, props.limit);
        console.log('Applied limit:', props.limit, 'remaining:', filteredCrawls.length);
      }
      
      // Group by domain and WCAG spec
      const grouped = {};
      
      for (const crawl of filteredCrawls) {
        // Skip if domain is missing
        if (!crawl.domain) {
          console.warn('Crawl is missing domain:', crawl._id);
          continue;
        }
        
        // Normalize domain
        const domain = crawl.domain.replace(/^www\./i, '');
        
        // Create domain entry if it doesn't exist
        if (!grouped[domain]) {
          grouped[domain] = {};
        }
        
        // Get WCAG specification
        const wcagSpec = `WCAG ${crawl.wcagVersion} Level ${crawl.wcagLevel}`;
        
        // Create WCAG spec entry if it doesn't exist
        if (!grouped[domain][wcagSpec]) {
          grouped[domain][wcagSpec] = [];
        }
        
        // Add crawl to the group
        grouped[domain][wcagSpec].push(crawl);
      }
      
      // Sort crawls by date within each WCAG spec
      for (const domain of Object.keys(grouped)) {
        for (const wcagSpec of Object.keys(grouped[domain])) {
          grouped[domain][wcagSpec].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
      }
      
      // Sort domains based on selected sort option
      let sortedEntries = Object.entries(grouped);
      
      switch (sortBy.value) {
        case 'domain':
          sortedEntries.sort(([a], [b]) => a.localeCompare(b));
          break;
        case 'score':
          sortedEntries.sort(([,a], [,b]) => {
            const scoreA = getLatestScore(a);
            const scoreB = getLatestScore(b);
            return scoreB - scoreA;
          });
          break;
        case 'date':
        default:
          sortedEntries.sort(([,a], [,b]) => {
            const latestA = Math.max(...Object.values(a).flat().map(c => new Date(c.createdAt)));
            const latestB = Math.max(...Object.values(b).flat().map(c => new Date(c.createdAt)));
            return latestB - latestA;
          });
      }
      
      console.log('Final groupedCrawls has', sortedEntries.length, 'domains');
      return Object.fromEntries(sortedEntries);
    });

    const viewDetails = (crawl) => {
      router.push(`/scans/${crawl._id}`);
    };
    
    const getTeamName = (teamId) => {
      // Get all teams from the store
      const allTeams = store.state.teams || [];
      // Find the team with the matching ID
      const team = allTeams.find(t => t._id === teamId);
      return team ? team.name : 'Unknown Team';
    };
    
    const fetchDomainMetadata = async () => {
      if (!props.selectedTeam) return;
      try {
        const response = await api.get(`/api/teams/${props.selectedTeam}/domains/metadata`);
        domainMetadata.value = response.data.reduce((acc, meta) => {
          acc[meta.domain] = meta;
          return acc;
        }, {});
      } catch (error) {
        console.error('Failed to fetch domain metadata:', error);
      }
    };

    const editDomainMetadata = (domain) => {
      editingMetadata.value = {
        domain,
        notes: domainMetadata.value[domain]?.notes || '',
        isArchived: domainMetadata.value[domain]?.isArchived || false
      };
      showMetadataModal.value = true;
    };

    const saveDomainMetadata = async () => {
      try {
        const domain = editingMetadata.value.domain;
        const domainData = groupedCrawls.value[domain];
        if (!domainData) {
          throw new Error(`No crawl data found for domain: ${domain}`);
        }

        // Flatten all crawls for this domain
        const domainCrawls = Object.values(domainData).flat();
        if (!domainCrawls.length) {
          throw new Error('No crawl data found for domain');
        }

        // Get team ID from the first crawl
        const teamId = domainCrawls[0]?.team?._id || domainCrawls[0]?.team;
        if (!teamId) {
          throw new Error('No team ID found for domain');
        }

        console.log('Saving metadata for domain:', {
          domain,
          teamId,
          metadata: {
            notes: editingMetadata.value.notes,
            isArchived: editingMetadata.value.isArchived
          }
        });

        const response = await api.patch(
          `/api/teams/${teamId}/domains/${domain}/metadata`,
          {
            notes: editingMetadata.value.notes,
            isArchived: editingMetadata.value.isArchived
          }
        );

        // Update the local metadata state
        domainMetadata.value[domain] = response.data;
        showMetadataModal.value = false;
        
        // Refresh the crawls and metadata
        await fetchCrawls();
        await fetchDomainMetadata();
      } catch (error) {
        console.error('Error saving domain metadata:', error);
        const errorMessage = error.response?.data?.error || 'Failed to save domain settings. Please try again.';
        alert(errorMessage);
      }
    };

    // Watch for team changes to reload metadata
    watch(() => props.selectedTeam, (newTeam) => {
      if (newTeam) {
        fetchDomainMetadata();
      } else {
        domainMetadata.value = {};
      }
    });

    const runAgain = async (crawl) => {
      try {
        // Create a new crawl with the same settings
        const crawlData = {
          url: crawl.url,
          domain: crawl.domain,
          team: crawl.team._id || crawl.team,
          depthLimit: crawl.depthLimit,
          pageLimit: crawl.pageLimit,
          crawlRate: crawl.crawlRate,
          wcagVersion: crawl.wcagVersion,
          wcagLevel: crawl.wcagLevel
        };
        
        console.log('Running scan again with settings:', crawlData);
        
        const result = await api.post('/api/crawls', crawlData);
        
        if (result?.data) {
          // Show success notification
          alert('Scan added to queue successfully');
          // Refresh the crawl list to show the new queued scan
          fetchCrawls();
        }
      } catch (error) {
        console.error('Failed to run scan again:', error);
        alert(error.response?.data?.error || 'Failed to run scan again');
      }
    };

    return {
      crawls,
      pollInterval,
      expandedDomains,
      viewDetails,
      runAgain,
      domainMetadata,
      showMetadataModal,
      editingMetadata,
      editDomainMetadata,
      saveDomainMetadata,
      groupedCrawls,
      fetchCrawls,
      calculateScore,
      sortBy,
      getLatestScore,
      getTeamName
    };
  },
  methods: {
    normalizeDomain(domain) {
      return domain.replace(/^www\./i, '');
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(date);
    },
    getWcagSpec(crawl) {
      return `WCAG ${crawl.wcagVersion} Level ${crawl.wcagLevel}`;
    },
    getCrawlSpeed(rate) {
      if (rate <= 10) return 'Slow';
      if (rate <= 30) return 'Medium';
      return 'Fast';
    },
    getDepthLabel(depth) {
      const labels = {
        1: 'Homepage Only (Level 1)',
        2: 'Shallow (2 Levels)',
        3: 'Medium (3 Levels)',
        4: 'Deep (4 Levels)',
        5: 'Very Deep (5 Levels)'
      };
      return labels[depth] || `${depth} Levels`;
    },
    async removeCrawl(crawlId) {
      try {
        if (!confirm('Are you sure you want to delete this crawl?')) {
          return;
        }
        const token = localStorage.getItem('token');
        await axios.delete(`${process.env.VUE_APP_API_URL}/api/crawls/${crawlId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Remove from local state
        this.crawls = this.crawls.filter(c => c._id !== crawlId);
      } catch (error) {
        console.error('Failed to remove crawl:', error);
        alert(error.response?.data?.error || 'Failed to remove crawl');
      }
    },
    async cancelCrawl(crawlId) {
      try {
        if (!confirm('Are you sure you want to cancel this crawl?')) {
          return;
        }
        const token = localStorage.getItem('token');
        const response = await axios.post(`${process.env.VUE_APP_API_URL}/api/crawls/${crawlId}/cancel`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Update local state
        const index = this.crawls.findIndex(c => c._id === crawlId);
        if (index !== -1) {
          this.crawls[index] = response.data;
        }
      } catch (error) {
        console.error('Failed to cancel crawl:', error);
        alert(error.response?.data?.error || 'Failed to cancel crawl');
      }
    },
    getScoreDifference(currentScore, previousScore) {
      if (currentScore === '—' || previousScore === '—') return '';
      const diff = (currentScore - previousScore).toFixed(1);
      return diff > 0 ? `+${diff}%` : `${diff}%`;
    },
    getScoreTrendClass(currentScore, previousScore) {
      if (currentScore === '—' || previousScore === '—' || currentScore === previousScore) return 'neutral';
      return currentScore > previousScore ? 'improved' : 'declined';
    },
    getDomainOverallTrendClass(domainData) {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'neutral';
      
      const first = this.calculateScore(allCrawls[0]);
      const last = this.calculateScore(allCrawls[allCrawls.length - 1]);
      
      if (first === '—' || last === '—' || first === last) return 'neutral';
      return last > first ? 'improved' : 'declined';
    },
    getDomainOverallTrendSummary(domainData) {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'No trend data';
      
      const first = this.calculateScore(allCrawls[0]);
      const last = this.calculateScore(allCrawls[allCrawls.length - 1]);
      
      if (first === '—' || last === '—') return 'No trend data';
      
      const diff = (last - first).toFixed(1);
      const totalScans = allCrawls.length;
      if (diff > 0) {
        return `Improved by ${diff}% over ${totalScans} scans`;
      } else if (diff < 0) {
        return `Declined by ${Math.abs(diff)}% over ${totalScans} scans`;
      }
      return 'No change in score';
    },
    toggleDomain(domain) {
      const index = this.expandedDomains.indexOf(domain);
      if (index === -1) {
        this.expandedDomains.push(domain);
      } else {
        this.expandedDomains.splice(index, 1);
      }
    },
    getScoreClass(score) {
      if (score === '—') return 'score-pending';
      if (score >= 90) return 'score-excellent';
      if (score >= 70) return 'score-good';
      if (score >= 50) return 'score-fair';
      return 'score-poor';
    },
    formatStatus(crawl) {
      const statusMap = {
        completed: 'Completed',
        in_progress: 'In Progress',
        failed: 'Failed',
        cancelled: 'Cancelled',
        pending: 'Pending',
        queued: `Queued (#${crawl.queuePosition})`
      };
      return statusMap[crawl.status] || crawl.status;
    },
    displayDomain(crawl) {
      return this.normalizeDomain(crawl.domain);
    },
    getInProgressScan(domainData) {
      const allCrawls = Object.values(domainData).flat();
      const inProgressCrawl = allCrawls.find(crawl => crawl.status === 'in_progress');
      
      if (!inProgressCrawl) return null;
      
      // Calculate progress based on pages scanned vs page limit
      const progress = Math.min(
        ((inProgressCrawl.pagesScanned || 0) / (inProgressCrawl.pageLimit || 100)) * 100,
        100
      );
      
      return {
        ...inProgressCrawl,
        progress: progress - 100 // Offset for transform
      };
    },
    getViolationPercentage(violationCount, totalViolations) {
      // If there are no violations, return 0
      if (totalViolations === 0) return 0;
      // Calculate the percentage based on the total violations
      // This ensures all segments together will total 100%
      return (violationCount / totalViolations) * 100;
    },
    getTotalViolations(violationsByImpact) {
      return violationsByImpact.critical + 
             violationsByImpact.serious + 
             violationsByImpact.moderate + 
             violationsByImpact.minor;
    },
    calculateAverageScore(crawls) {
      const activeCrawls = crawls.filter(crawl => !this.domainMetadata[crawl.domain]?.isArchived);
      if (activeCrawls.length === 0) return null;
      
      const totalScore = activeCrawls.reduce((sum, crawl) => sum + (crawl.accessibilityScore || 0), 0);
      return Math.round(totalScore / activeCrawls.length);
    }
  },
  created() {
    console.log('CrawlHistory component created - starting initial fetch');
    this.fetchCrawls();
    
    // Set up polling interval
    console.log('Setting up polling interval for crawl updates');
    this.pollInterval = setInterval(() => {
      console.log('Polling for crawl updates');
      this.fetchCrawls();
    }, 5000);
  },
  beforeUnmount() {
    console.log('CrawlHistory component unmounting - clearing poll interval');
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  },
  unmounted() {
    console.log('CrawlHistory component unmounted');
  },
  beforeDestroy() {
    console.log('CrawlHistory component destroying - clearing poll interval (legacy)');
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
</script>

<style scoped>
.crawl-history {
  /* Keep existing styles */
}

.sort-controls {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 400px;
}

.sort-controls label {
  width: 100px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--card-background);
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  
}

.sort-select:hover {
  border-color: var(--primary-color);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(56, 143, 236, 0.1);
}

.crawl-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crawl-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-background);
}

.crawl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.crawl-stats {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.score-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-container :deep(.radial-progress) {
  margin-right: 10px;
}

.score-trend {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.score-trend.improved {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.score-trend.declined {
  background-color: #ffebee;
  color: #c62828;
}

.score-trend.neutral {
  background-color: #f5f5f5;
  color: #666;
}

.status {
  padding: 5px 10px;
  border-radius: 40px;
  font-size: 0.9em;
  line-height: 1;
}

.status.completed {
  background-color: #a3d266;
  color: white;
}

.status.in_progress {
  background-color: #67b5f5;
  color: white;
}

.status.cancelled {
  background-color: #9e9e9e;
  color: white;
}

.status.failed {
  background-color: #f46e64;
  color: white;
}

.status.pending {
  background-color: #ff9800;
  color: white;
}

.status.queued {
  background-color: #ff9800;
  color: white;
}

.crawl-details p {
  margin: 8px 0;
  color: #666;
}

.crawl-details p strong {
  color: var(--text-color);
}

.violation-counts {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.violation {
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  min-width: 80px;
}

.violation small {
  display: block;
  font-size: 0.8em;
  margin-top: 5px;
}

.critical {
  background-color: #ffebee;
  color: #c62828;
}

.serious {
  background-color: #fff3e0;
  color: #ef6c00;
}

.moderate {
  background-color: #fff8e1;
  color: #f9a825;
}

.minor {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.crawl-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.cancel-button,
.remove-button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.cancel-button {
  background-color: #ff9800;
  color: white;
}

.remove-button {
  background: none;
  border: none;
  color: #dc3545;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-button:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

.cancel-button:hover,
.remove-button:hover {
  opacity: 0.9;
}

.domain-group {
  
}

.domain-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.domain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.5em;
  color: var(--text-color);
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.domain-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0;
}

.domain-header.expanded {
  background: var(--card-background);
  border-color: var(--border-color);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.domain-header.expanded + .domain-details {
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  margin-top: 0;
  border-color: var(--background-color);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.domain-header:hover {
  background-color: var(--background-color);
}

.domain-header.expanded:hover {
  background-color: var(--card-background);
}

.crawl-timestamp {
  color: var(--text-muted);
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.timestamp-icon {
  color: var(--text-muted);
  font-size: 0.9em;
}

.crawl-item {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-background);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.crawl-item:last-child {
  margin-bottom: 0;
}

.domain-summary {
  font-size: 0.6em;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.latest-score {
  font-weight: bold;
  color: #4CAF50;
  margin-right: 15px;
}

.trend-summary {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: normal;
}

.trend-summary.improved {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.trend-summary.declined {
  background-color: #ffebee;
  color: #c62828;
}

.trend-summary.neutral {
  background-color: #f5f5f5;
  color: #666;
}

.expand-toggle {
  margin-left: 15px;
  font-size: 0.8em;
  color: #666;
}

.domain-details {
  animation: slideDown 0.3s ease-out;

}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wcag-group {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--card-background);
  border-radius: 8px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  
  border: 1px solid var(--border-color);
}

.wcag-header {
  font-size: 1.2em;
  color: var(--text-color);
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.wcag-group:last-child {
  margin-bottom: 0;
}

.crawl-spinner {
  margin-left: 10px;
}

/* Make the spinner smaller in the crawl list */
.crawl-spinner :deep(.spinner) {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.crawl-spinner :deep(.spinner-text) {
  font-size: 0.8em;
}

.score-pending {
  background-color: var(--background-color);
  color: var(--text-color);
}

.score-excellent {
  background-color: #4CAF50;
  color: white;
}

.score-good {
  background-color: #8BC34A;
  color: white;
}

.score-fair {
  background-color: #FFC107;
  color: black;
}

.score-poor {
  background-color: #F44336;
  color: white;
}

.crawl-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-details-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  border: 1px solid var(--primary-color);
  color: var(--text-color);
  font-size: 0.9em;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.details-icon {
  font-size: 0.9em;
}

.queue-position {
  font-size: 0.9em;
  color: #666;
  margin-left: 10px;
}

.progress-bar-container {
  width: 100px;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  border: 1px solid #ededed;
}

.progress-bar {
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #a07ae8 0%, #1eafed 100%);
  
  position: absolute;
  left: 0;
  transform: translateX(-100%);
  transition: transform 0.5s ease-out;
}

/* Updated violation styles */
.violations-bar {
  height: 24px;
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  margin: 10px 0;
  background-color: var(--background-color);
}

.violation-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.violation-segment:hover {
  filter: brightness(1.1);
}

.violations-legend {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* Violation colors */
.violation-segment.critical,
.legend-color.critical {
  background-color: #dc3545;
}

.violation-segment.serious,
.legend-color.serious {
  background-color: #fd7e14;
}

.violation-segment.moderate,
.legend-color.moderate {
  background-color: #ffc107;
}

.violation-segment.minor,
.legend-color.minor {
  background-color: #198754;
}

/* Clean up scan instance styles */
.crawl-item {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.2s ease;
}

.crawl-item:last-child {
  margin-bottom: 0;
}

.crawl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.crawl-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crawl-timestamp {
  color: var(--text-muted);
  font-size: 0.9em;
}

.crawl-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.crawl-details {
  color: var(--text-color);
}

.crawl-details p {
  margin: 8px 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.created-by {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-bottom: 8px;
}

.team-info {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-bottom: 8px;
}

.domain-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.archived-badge {
  background-color: var(--text-muted);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.domain-notes {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-bottom: 15px;
  font-style: italic;
}

.edit-metadata-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.edit-metadata-btn:hover {
  color: var(--primary-color);
  background: var(--hover-background);
}

.edit-label {
  font-size: 0.9em;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.help-text {
  color: var(--text-muted);
  font-size: 0.85em;
  margin-top: 4px;
  margin-left: 24px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-background);
  padding: 30px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-background);
  color: var(--text-color);
}

.cancel-btn, .save-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.cancel-btn {
  background: var(--background-color);
  color: var(--text-color);
}

.save-btn {
  background: var(--primary-color);
  color: white;
}

.run-again-btn {
  display: flex;
  align-items: center;
  background-color: var(--secondary-button-bg);
  color: var(--secondary-button-text);
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  margin-left: 8px;
}

.run-again-btn:hover {
  background-color: var(--secondary-button-hover-bg);
  transform: translateY(-1px);
}

.run-again-btn:active {
  transform: translateY(0);
}

.run-again-icon {
  margin-right: 5px;
}
</style> 