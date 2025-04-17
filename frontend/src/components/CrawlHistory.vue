<template>
  <div class="crawl-history">
    <div class="crawl-history-header">
      <h2>Scan History</h2>
      <div class="export-controls">
        <button @click="exportToCsv" class="export-button">
          <i class="fas fa-file-export"></i> Export as CSV
        </button>
      </div>
    </div>
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
              <h3 v-if="getLatestCrawlTitle(domain)" class="domain-title">{{ getLatestCrawlTitle(domain) }}</h3>
              <h3 v-else>{{ domain }}</h3>
              <span v-if="getLatestCrawlTitle(domain)" class="domain-url">{{ domain }}</span>
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
                <p v-if="crawl.title" class="scan-title">
                  <strong>Title:</strong> {{ crawl.title }}
                </p>
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
  <div v-if="showMetadataModal" class="modal-overlay" @click.self="showMetadataModal = false" style="display: none;">
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
          <div class="checkbox-wrapper">
            <input 
              type="checkbox" 
              id="isArchived" 
              v-model="editingMetadata.isArchived"
            />
            <label for="isArchived">Archive Domain</label>
          </div>
          <p class="help-text">Archiving a domain will hide it from the dashboard by default</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="showMetadataModal = false">Cancel</button>
          <button type="submit" class="save-btn">Save Changes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Export CSV Modal -->
  <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
    <div class="modal-content">
      <h3>Export Scan Data</h3>
      <form @submit.prevent="performExport">
        <div class="form-group">
          <label for="exportDateRange">Date Range</label>
          <select id="exportDateRange" v-model="exportOptions.dateRange" class="form-select">
            <option value="all">All Time</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="sixMonths">Last 6 Months</option>
            <option value="year">Last Year</option>
          </select>
        </div>
        <div class="form-group">
          <label for="exportTeam">Team</label>
          <TeamSelector 
            id="exportTeam" 
            v-model="exportOptions.team" 
            :required="false"
            :showAllOption="true"
            allTeamsLabel="All Teams"
          />
        </div>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="showExportModal = false">Cancel</button>
          <button type="submit" class="save-btn">Export CSV</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Edit Crawl Modal -->
  <div v-if="showEditCrawlModal" class="modal-overlay" @click.self="showEditCrawlModal = false" style="display: none;">
    <div class="modal-content">
      <h3>Edit Scan Details</h3>
      <form @submit.prevent="saveEditedCrawl">
        <div class="form-group">
          <label for="crawlTitle">Title</label>
          <input 
            type="text" 
            id="crawlTitle" 
            v-model="editingCrawl.title" 
            placeholder="Enter a descriptive title for this scan"
          >
          <p class="help-text">Adding a title helps identify this scan in listings</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="showEditCrawlModal = false">Cancel</button>
          <button type="submit" class="save-btn">Save Changes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Unified edit modal for domain & scan settings -->
  <div v-if="showUnifiedEditModal" class="modal-overlay" @click.self="closeUnifiedEditModal">
    <div class="modal-content">
      <h3>Edit {{ unifiedEdit.domain }}</h3>
      <form @submit.prevent="saveUnifiedEdit">
        <p class="help-text info">
          This unified editor allows you to manage domain-wide settings and scan titles in one place.
        </p>

        <div class="form-group">
          <label for="notes">Domain Notes</label>
          <textarea 
            id="notes" 
            v-model="unifiedEdit.notes" 
            rows="3"
            placeholder="Add notes about this domain..."
          ></textarea>
        </div>
        
        <div class="form-group">
          <div class="checkbox-wrapper">
            <input 
              type="checkbox" 
              id="isArchived" 
              v-model="unifiedEdit.isArchived"
            />
            <label for="isArchived">Archive Domain</label>
          </div>
          <p class="help-text">Archived domains are hidden from the main view</p>
        </div>

        <!-- Domain Scans Section -->
        <div v-if="unifiedEdit.domainScans && unifiedEdit.domainScans.length > 0" class="domain-scans-section">
          <h4 class="subtitle is-5 mt-4">Scan Title</h4>
          <p class="help-text">Set a common title for all scans in this domain</p>
          
          <div class="form-group">
            <div class="scan-title-input">
              <input 
                type="text" 
                placeholder="Common scan title" 
                v-model="unifiedEdit.commonTitle"
              />
            </div>
            <p class="help-text">This title will be applied to all {{ unifiedEdit.domainScans.length }} scans</p>
          </div>
          
          <div class="scans-list">
            <p class="scans-count">{{ unifiedEdit.domainScans.length }} scans will be updated</p>
            <div class="scans-dates">
              <span v-for="(scan, index) in unifiedEdit.domainScans.slice(0, 3)" :key="scan._id" class="scan-date-chip">
                {{ new Date(scan.createdAt).toLocaleDateString() }}
              </span>
              <span v-if="unifiedEdit.domainScans.length > 3" class="more-scans">
                +{{ unifiedEdit.domainScans.length - 3 }} more
              </span>
            </div>
          </div>
        </div>
        
        <div v-else-if="loading" class="text-center">
          <div class="spinner-container">
            <i class="fas fa-spinner fa-pulse"></i>
          </div>
          <p>Loading scans...</p>
        </div>
        
        <div v-else class="no-scans-message">
          No scans found for this domain.
        </div>

        <div class="modal-actions">
          <button 
            type="button" 
            class="cancel-btn" 
            @click="closeUnifiedEditModal"
            :disabled="loading"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="save-btn"
            :disabled="loading"
          >
            Save Changes
          </button>
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
import TeamSelector from './TeamSelector.vue';
import notify from '../utils/notify';

export default {
  name: 'CrawlHistory',
  props: {
    selectedTeam: {
      type: String,
      default: null
    },
    selectedDateRange: {
      type: String,
      default: 'all'
    },
    limit: {
      type: Number,
      default: 5
    }
  },
  components: {
    AccessibilityTrendGraph,
    LoadingSpinner,
    CrawlProgress,
    RadialProgress,
    TeamSelector
  },
  setup(props, { emit }) {
    const router = useRouter();
    const crawls = ref([]);
    const pollInterval = ref(null);
    const expandedDomains = ref([]);
    const domainMetadata = ref({});
    const editingMetadata = ref({ domain: null, notes: '', isArchived: false });
    const editingCrawl = ref({ _id: null, title: '' });
    const sortBy = ref('date');
    const loading = ref(false);

    // New export modal state
    const showExportModal = ref(false);
    const showEditCrawlModal = ref(false);
    const showMetadataModal = ref(false);
    const showUnifiedEditModal = ref(false);
    const isExporting = ref(false);
    const exportOptions = ref({
      dateRange: 'all',
      team: ''
    });
    
    // Unified edit state
    const unifiedEdit = ref({
      domain: '',
      notes: '',
      isArchived: false,
      crawlId: null,
      title: '',
      commonTitle: '',
      domainScans: []
    });

    // Access teams from store
    const availableTeams = computed(() => {
      return store.state.teams || [];
    });

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
      try {
        // Try to load from localStorage first
        const savedMetadata = localStorage.getItem('domain-metadata');
        if (savedMetadata) {
          try {
            domainMetadata.value = JSON.parse(savedMetadata);
            console.log('Loaded domain metadata from localStorage:', domainMetadata.value);
          } catch (e) {
            console.error('Error parsing stored domain metadata:', e);
          }
        }
        
        // If there's a selected team, try API as well (future-proofing)
        if (props.selectedTeam) {
          try {
            const response = await api.get(`/api/teams/${props.selectedTeam}/domains/metadata`);
            if (response && response.data) {
              const apiMetadata = response.data.reduce((acc, meta) => {
                acc[meta.domain] = meta;
                return acc;
              }, {});
              
              // Merge with existing data from localStorage
              domainMetadata.value = { ...domainMetadata.value, ...apiMetadata };
            }
          } catch (apiError) {
            console.log('API fetch for domain metadata not implemented yet:', apiError);
          }
        }
      } catch (error) {
        console.error('Failed to fetch domain metadata:', error);
      }
    };

    const editDomainMetadata = async (domain) => {
      unifiedEdit.value = {
        domain,
        notes: domainMetadata.value[domain]?.notes || '',
        isArchived: domainMetadata.value[domain]?.isArchived || false,
        crawlId: null,
        title: '',
        commonTitle: '',
        domainScans: []
      };
      
      // Fetch all scans for this domain
      try {
        loading.value = true;
        const response = await api.get(`/api/crawls`, {
          params: { domain }
        });
        
        if (response.data) {
          // Filter crawls for this domain
          const domainCrawls = response.data.filter(crawl => 
            crawl.domain === domain || crawl.domain === `www.${domain}`
          );
          unifiedEdit.value.domainScans = domainCrawls;
        }
      } catch (error) {
        notify.error('Error loading scans for this domain');
        console.error('Failed to fetch scans for domain:', error);
      } finally {
        loading.value = false;
      }
      
      showUnifiedEditModal.value = true;
    };

    const saveDomainMetadata = async () => {
      try {
        console.log('Saving domain metadata for', editingMetadata.value.domain);
        const domain = editingMetadata.value.domain;
        const notes = editingMetadata.value.notes;
        const isArchived = editingMetadata.value.isArchived;
        
        // Update the local state
        if (!domainMetadata.value[domain]) {
          domainMetadata.value[domain] = {};
        }
        
        domainMetadata.value[domain].notes = notes;
        domainMetadata.value[domain].isArchived = isArchived;
        
        // Save to localStorage for persistence between refreshes
        try {
          localStorage.setItem('domain-metadata', JSON.stringify(domainMetadata.value));
          console.log('Saved domain metadata to localStorage');
        } catch (storageError) {
          console.error('Failed to save to localStorage:', storageError);
        }
        
        console.log('Updated domain metadata:', {
          domain,
          notes,
          isArchived
        });
        
        notify.success('Domain settings saved');
        showMetadataModal.value = false;
      } catch (error) {
        console.error('Error saving domain metadata:', error);
        notify.error('Failed to save domain settings');
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
          title: crawl.title,
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
          notify.success('Scan added to queue successfully');
          // Refresh the crawl list to show the new queued scan
          fetchCrawls();
        }
      } catch (error) {
        console.error('Failed to run scan again:', error);
        notify.error(error.response?.data?.error || 'Failed to run scan again');
      }
    };

    const exportToCsv = async () => {
      // Show export options modal instead of immediate export
      showExportModal.value = true;
    };

    const performExport = async () => {
      try {
        // Get the auth token
        const token = localStorage.getItem('token');
        if (!token) {
          notify.error('You must be logged in to export data');
          return;
        }

        // Build URL with query parameters based on export options
        let params = {};
        
        // Add team filter if selected
        if (exportOptions.value.team) {
          params.team = exportOptions.value.team;
        }
        
        // Add date range filter if selected
        if (exportOptions.value.dateRange) {
          params.dateRange = exportOptions.value.dateRange;
        }
        
        // Add token to query params as well - the endpoint expects it here
        const tokenValue = token.replace('Bearer ', '');
        params.token = tokenValue;
        
        // Prepare axios request with proper authorization header
        const config = {
          headers: {
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
            'Content-Type': 'text/csv'
          },
          responseType: 'blob',
          params: params
        };
        
        // Make the API request
        let baseUrl;
        if (process.env.VUE_APP_API_URL) {
          baseUrl = `${process.env.VUE_APP_API_URL}/api/crawls/export/csv`;
        } else {
          baseUrl = '/api/crawls/export/csv';
        }
        
        const response = await axios.get(baseUrl, config);
        
        // Create a blob URL and trigger download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `crawl-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Close the modal after export
        showExportModal.value = false;
        
      } catch (error) {
        console.error('Failed to export CSV:', error);
        notify.error('Failed to export CSV. Please try again.');
      }
    };

    const getWcagSpec = (crawl) => {
      return `WCAG ${crawl.wcagVersion} Level ${crawl.wcagLevel}`;
    };

    const getScoreClass = (score) => {
      if (score === '—') return 'score-pending';
      if (score >= 90) return 'score-excellent';
      if (score >= 70) return 'score-good';
      if (score >= 50) return 'score-fair';
      return 'score-poor';
    };

    const editCrawl = (crawl) => {
      // Set up the unified edit modal with crawl and domain metadata
      const domain = crawl.domain.replace(/^www\./i, '');
      
      unifiedEdit.value = {
        domain: domain,
        notes: domainMetadata.value[domain]?.notes || '',
        isArchived: domainMetadata.value[domain]?.isArchived || false,
        crawlId: crawl._id,
        title: crawl.title || '',
        commonTitle: '',
        domainScans: []
      };
      
      showUnifiedEditModal.value = true;
    };
    
    const saveEditedCrawl = async (crawlId, title) => {
      try {
        if (!crawlId) {
          throw new Error('No crawl ID found');
        }
        
        console.log('Saving crawl title:', { crawlId, title });
        
        const response = await api.patch(
          `/api/crawls/${crawlId}`,
          { title }
        );
        
        // Update the crawl in the local state
        updateCrawlInLocalState(response.data);
        
        notify.success('Scan title updated successfully');
        return true;
      } catch (error) {
        console.error('Error updating crawl:', error);
        const errorMessage = error.response?.data?.error || 'Failed to update scan details. Please try again.';
        notify.error(errorMessage);
        return false;
      }
    };
    
    const updateCrawlInLocalState = (updatedCrawl) => {
      // Find the crawl in our local state and update it
      for (const domain in groupedCrawls.value) {
        for (const wcagSpec in groupedCrawls.value[domain]) {
          const crawlIndex = groupedCrawls.value[domain][wcagSpec].findIndex(c => c._id === updatedCrawl._id);
          if (crawlIndex !== -1) {
            // Update the crawl with the new data
            groupedCrawls.value[domain][wcagSpec][crawlIndex] = {
              ...groupedCrawls.value[domain][wcagSpec][crawlIndex],
              ...updatedCrawl
            };
            return;
          }
        }
      }
    };

    const getDepthLabel = (depth) => {
      const labels = {
        1: 'Homepage Only (Level 1)',
        2: 'Shallow (2 Levels)',
        3: 'Medium (3 Levels)',
        4: 'Deep (4 Levels)',
        5: 'Very Deep (5 Levels)'
      };
      return labels[depth] || `${depth} Levels`;
    };

    const getScoreDifference = (currentScore, previousScore) => {
      if (currentScore === '—' || previousScore === '—') return '';
      const diff = (currentScore - previousScore).toFixed(1);
      return diff > 0 ? `+${diff}%` : `${diff}%`;
    };

    const getScoreTrendClass = (currentScore, previousScore) => {
      if (currentScore === '—' || previousScore === '—' || currentScore === previousScore) return 'neutral';
      return currentScore > previousScore ? 'improved' : 'declined';
    };

    const getDomainOverallTrendClass = (domainData) => {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'neutral';
      
      const first = calculateScore(allCrawls[0]);
      const last = calculateScore(allCrawls[allCrawls.length - 1]);
      
      if (first === '—' || last === '—' || first === last) return 'neutral';
      return last > first ? 'improved' : 'declined';
    };

    const getDomainOverallTrendSummary = (domainData) => {
      const allCrawls = Object.values(domainData).flat()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (allCrawls.length < 2) return 'No trend data';
      
      const first = calculateScore(allCrawls[0]);
      const last = calculateScore(allCrawls[allCrawls.length - 1]);
      
      if (first === '—' || last === '—') return 'No trend data';
      
      const diff = (last - first).toFixed(1);
      const totalScans = allCrawls.length;
      if (diff > 0) {
        return `Improved by ${diff}% over ${totalScans} scans`;
      } else if (diff < 0) {
        return `Declined by ${Math.abs(diff)}% over ${totalScans} scans`;
      }
      return 'No change in score';
    };

    const getCrawlSpeed = (rate) => {
      if (rate <= 10) return 'Slow';
      if (rate <= 30) return 'Medium';
      return 'Fast';
    };

    const getViolationPercentage = (violationCount, totalViolations) => {
      // If there are no violations, return 0
      if (totalViolations === 0) return 0;
      // Calculate the percentage based on the total violations
      // This ensures all segments together will total 100%
      return (violationCount / totalViolations) * 100;
    };

    const getTotalViolations = (violationsByImpact) => {
      return violationsByImpact.critical + 
             violationsByImpact.serious + 
             violationsByImpact.moderate + 
             violationsByImpact.minor;
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(date);
    };

    const toggleDomain = (domain) => {
      const index = expandedDomains.value.indexOf(domain);
      if (index === -1) {
        expandedDomains.value.push(domain);
      } else {
        expandedDomains.value.splice(index, 1);
      }
    };

    const formatStatus = (crawl) => {
      const statusMap = {
        completed: 'Completed',
        in_progress: 'In Progress',
        failed: 'Failed',
        cancelled: 'Cancelled',
        pending: 'Pending',
        queued: `Queued (#${crawl.queuePosition})`
      };
      return statusMap[crawl.status] || crawl.status;
    };

    const getInProgressScan = (domainData) => {
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
    };

    const cancelCrawl = async (crawlId) => {
      try {
        const confirmed = await notify.confirm('Are you sure you want to cancel this crawl?', {
          type: 'warning',
          confirmText: 'Yes, Cancel Scan',
          cancelText: 'No, Keep Running'
        });
        
        if (!confirmed) {
          return;
        }
        
        const response = await api.post(`/api/crawls/${crawlId}/cancel`);
        
        // Update local state by refetching crawls
        fetchCrawls();
        
        notify.success('Crawl cancelled successfully');
      } catch (error) {
        console.error('Failed to cancel crawl:', error);
        notify.error(error.response?.data?.error || 'Failed to cancel crawl');
      }
    };

    const removeCrawl = async (crawlId) => {
      try {
        console.log('Initiating crawl removal for ID:', crawlId);
        
        const confirmed = await notify.confirm('Are you sure you want to delete this crawl?', {
          type: 'danger',
          confirmText: 'Yes, Delete',
          cancelText: 'No, Cancel'
        });
        
        console.log('Confirmation result:', confirmed);
        
        if (!confirmed) {
          console.log('Crawl deletion cancelled by user');
          return;
        }
        
        console.log('Proceeding with crawl deletion');
        await api.delete(`/api/crawls/${crawlId}`);
        
        // Refresh crawls to update UI
        fetchCrawls();
        
        notify.success('Crawl deleted successfully');
        console.log('Crawl deleted successfully');
      } catch (error) {
        console.error('Failed to remove crawl:', error);
        notify.error(error.response?.data?.error || 'Failed to remove crawl');
      }
    };

    const getLatestCrawlTitle = (domain) => {
      if (!groupedCrawls.value[domain]) return null;
      
      // Find the most recent crawl across all WCAG specifications for this domain
      const allCrawls = Object.values(groupedCrawls.value[domain]).flat();
      const latestCrawl = allCrawls.reduce((latest, current) => {
        return !latest || new Date(current.createdAt) > new Date(latest.createdAt) 
          ? current 
          : latest;
      }, null);
      
      return latestCrawl?.title || null;
    };

    const closeUnifiedEditModal = () => {
      showUnifiedEditModal.value = false;
      // Reset the unified edit state
      unifiedEdit.value = {
        domain: '',
        notes: '',
        isArchived: false,
        crawlId: null,
        title: '',
        commonTitle: '',
        domainScans: []
      };
    };
    
    const saveUnifiedEdit = async () => {
      try {
        loading.value = true;
        
        // Save domain metadata
        if (unifiedEdit.value.domain) {
          try {
            // Update local state first
            if (!domainMetadata.value[unifiedEdit.value.domain]) {
              domainMetadata.value[unifiedEdit.value.domain] = {};
            }
            domainMetadata.value[unifiedEdit.value.domain].notes = unifiedEdit.value.notes;
            domainMetadata.value[unifiedEdit.value.domain].isArchived = unifiedEdit.value.isArchived;
            
            // Save to localStorage for persistence between refreshes
            try {
              localStorage.setItem('domain-metadata', JSON.stringify(domainMetadata.value));
              console.log('Saved domain metadata to localStorage');
            } catch (storageError) {
              console.error('Failed to save to localStorage:', storageError);
            }
            
            console.log('Updated domain metadata state:', domainMetadata.value[unifiedEdit.value.domain]);
          } catch (metadataError) {
            console.error('Error updating metadata:', metadataError);
          }

          // Apply the common title to all scans if provided
          if (unifiedEdit.value.commonTitle && unifiedEdit.value.domainScans.length > 0) {
            try {
              console.log(`Updating titles for ${unifiedEdit.value.domainScans.length} scans to: ${unifiedEdit.value.commonTitle}`);
              
              // Use individual updates - most reliable approach
              const updatePromises = unifiedEdit.value.domainScans.map(scan => 
                api.patch(
                  `/api/crawls/${scan._id}`,
                  { title: unifiedEdit.value.commonTitle }
                ).catch(err => {
                  console.error(`Failed to update title for scan ${scan._id}:`, err);
                  return null;
                })
              );
              
              await Promise.allSettled(updatePromises);
              
              // Update crawls in local state regardless of API success
              unifiedEdit.value.domainScans.forEach(scan => {
                const crawlIndex = crawls.value.findIndex(c => c._id === scan._id);
                if (crawlIndex > -1) {
                  crawls.value[crawlIndex].title = unifiedEdit.value.commonTitle;
                }
              });
              
              notify.success(`Updated titles for ${unifiedEdit.value.domainScans.length} scans`);
            } catch (error) {
              console.error('Error updating scan titles:', error);
              notify.error('Some scan titles may not have been updated');
            }
          }
        }

        // Close the modal
        showUnifiedEditModal.value = false;
        loading.value = false;
      } catch (error) {
        notify.error('Failed to save domain settings');
        console.error('Error saving unified edit:', error);
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
      getTeamName,
      exportToCsv,
      getWcagSpec,
      showExportModal,
      exportOptions,
      availableTeams,
      performExport,
      showEditCrawlModal,
      editingCrawl,
      editCrawl,
      saveEditedCrawl,
      getScoreClass,
      getDepthLabel,
      getScoreTrendClass,
      getScoreDifference,
      getDomainOverallTrendClass,
      getDomainOverallTrendSummary,
      getCrawlSpeed,
      getViolationPercentage,
      getTotalViolations,
      formatDate,
      toggleDomain,
      formatStatus,
      getInProgressScan,
      cancelCrawl,
      removeCrawl,
      getLatestCrawlTitle,
      showUnifiedEditModal,
      unifiedEdit,
      closeUnifiedEditModal,
      saveUnifiedEdit,
      loading
    };
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

.crawl-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.export-controls {
  display: flex;
  gap: 10px;
}

.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: var(--secondary-button-bg, #6c757d);
  color: var(--secondary-button-text, #ffffff);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.export-button:hover {
  background-color: var(--secondary-button-hover-bg, #5a6268);
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
  gap: 8px;
}

.edit-button,
.remove-button,
.cancel-button {
  background: none;
  border: none;
  border-radius: 4px;
  width: auto;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-button {
  color: var(--primary-color);
}

.edit-button:hover {
  background-color: rgba(var(--primary-color-rgb, 56, 143, 236), 0.1);
}

.remove-button {
  color: var(--secondary-color, #FF006E);
}

.remove-button:hover {
  background-color: rgba(var(--secondary-color-rgb, 255, 0, 110), 0.1);
}

.cancel-button {
  color: white;
  background-color: var(--secondary-color, #FF006E);
  padding: 4px 10px;
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
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.domain-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domain-url {
  font-size: 12px;
  color: #637381;
  font-weight: normal;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
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

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--heading-color);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color);
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-background);
  color: var(--text-color);
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn {
  padding: 8px 16px;
  background-color: var(--secondary-button-bg);
  color: var(--secondary-button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn {
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover {
  background-color: var(--primary-hover);
}

.cancel-btn:hover {
  background-color: var(--secondary-button-hover-bg);
}

/* Unified modal styles */
.unified-modal {
  max-width: 600px;
}

.section-header {
  margin-bottom: 15px;
}

.section-header h4 {
  font-size: 1.1rem;
  margin: 0 0 5px 0;
  color: var(--heading-color);
  font-weight: 600;
}

.section-description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.section-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 30px 0;
}

/* Enhanced help text */
.help-text.info {
  color: var(--info-color, #0d6efd);
  font-style: italic;
  margin-top: 8px;
}

.scan-edit-item {
  margin-bottom: 15px;
}

.scan-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scan-title-input {
  flex-grow: 1;
}

.scan-title-input input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-background, #fff);
  color: var(--text-color);
}

.scan-date {
  font-size: 0.85em;
  color: var(--text-muted);
  white-space: nowrap;
}

.text-center {
  text-align: center;
  padding: 20px 0;
}

.spinner-container {
  font-size: 24px;
  color: var(--primary-color);
  margin-bottom: 10px;
}

.no-scans-message {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #6c757d;
  text-align: center;
  margin: 15px 0;
}

.domain-scans-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.domain-scans-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
}

.scans-list {
  margin-top: 15px;
  padding: 15px;
  background-color: var(--background-color, #f5f7fa);
  border-radius: 6px;
}

.scans-count {
  font-size: 0.9em;
  color: var(--text-muted, #6c757d);
  margin-bottom: 10px;
  margin-top: 0;
}

.scans-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scan-date-chip {
  padding: 4px 10px;
  background-color: var(--card-background, #fff);
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: 16px;
  font-size: 0.85em;
  color: var(--text-color, #212529);
}

.more-scans {
  font-size: 0.85em;
  color: var(--text-muted, #6c757d);
  padding: 4px 0;
}
</style> 