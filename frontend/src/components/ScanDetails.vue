<template>
  <div class="scan-details">
    <div class="scan-header">
      <h2>{{ crawl.domain }}</h2>
      <div class="scan-meta">
        <span class="timestamp">{{ formatDate(crawl.createdAt) }}</span>
        <span :class="['status', crawl.status]">{{ crawl.status }}</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Accessibility Score</h3>
        <div class="stat-value" :class="getScoreClass(calculateScore(crawl))">
          {{ calculateScore(crawl) }}%
        </div>
      </div>

      <div class="stat-card">
        <h3>Pages Scanned</h3>
        <div class="stat-value">{{ crawl.pagesScanned }}</div>
        <p class="stat-description">Depth: {{ getDepthLabel(crawl.depthLimit) }}</p>
      </div>

      <div class="stat-card">
        <h3>Total Violations</h3>
        <div class="stat-value">{{ crawl.violationsFound }}</div>
        <p class="stat-description">{{ getViolationsPerPage }} per page average</p>
      </div>

      <div class="stat-card">
        <h3>WCAG Level</h3>
        <div class="stat-value">{{ crawl.wcagVersion }}</div>
        <p class="stat-description">Level {{ crawl.wcagLevel }}</p>
      </div>
    </div>

    <div class="violations-section" v-if="violationsByRule.length">
      <h3>Accessibility Violations</h3>
      <!-- Impact Distribution Bar -->
      <div class="impact-distribution">
        <h4>Violations by Impact Level</h4>
        <div class="impact-bar">
          <div 
            v-for="(count, impact) in crawl.violationsByImpact" 
            :key="impact"
            :class="['impact-segment', impact]"
            :style="{ width: getImpactWidth(count) }"
          >
            {{ count > 0 ? `${impact}: ${count}` : '' }}
          </div>
        </div>
      </div>

      <div v-for="ruleViolation in violationsByRule" :key="ruleViolation.id" class="violation-rule">
        <div class="rule-header">
          <h4>
            {{ ruleViolation.help }}
            <span :class="['impact-badge', ruleViolation.impact]">{{ ruleViolation.impact }}</span>
          </h4>
          <a :href="ruleViolation.helpUrl" target="_blank" class="help-link">Learn More</a>
        </div>
        <p class="violation-description">{{ ruleViolation.description }}</p>
        
        <div class="violation-instances">
          <div v-for="(urlGroup, url) in ruleViolation.byUrl" :key="url" class="url-group">
            <div 
              class="url-header" 
              @click="toggleUrlGroup(ruleViolation.id + url)"
              :class="{ 'expanded': expandedGroups.includes(ruleViolation.id + url) }"
            >
              <div class="url-header-content">
                <span class="expand-icon">{{ expandedGroups.includes(ruleViolation.id + url) ? '▼' : '▶' }}</span>
                <h5>
                  {{ url }}
                  <span class="instance-count">({{ urlGroup.length }} instances)</span>
                </h5>
              </div>
            </div>
            <div 
              class="url-instances" 
              v-show="expandedGroups.includes(ruleViolation.id + url)"
            >
              <div v-for="(instance, index) in urlGroup" :key="index" class="violation-instance">
                <router-link 
                  :to="{
                    name: 'PagePreview',
                    params: {
                      scanId: crawl._id,
                      url: encodeURIComponent(url)
                    },
                    query: {
                      violationId: `${ruleViolation.id}-${ruleViolation.help}`
                    }
                  }"
                  class="preview-link"
                >
                  <CodeBlock>{{ formatHtml(instance.html) }}</CodeBlock>
                  <p class="failure-summary">{{ instance.failureSummary }}</p>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CodeBlock from './CodeBlock.vue'
import { computed, ref } from 'vue'
import { calculateScore } from '../utils/scoreCalculator'

export default {
  name: 'ScanDetails',
  components: {
    CodeBlock
  },
  props: {
    crawl: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const expandedGroups = ref([])
    
    const toggleUrlGroup = (groupId) => {
      const index = expandedGroups.value.indexOf(groupId)
      if (index === -1) {
        expandedGroups.value.push(groupId)
      } else {
        expandedGroups.value.splice(index, 1)
      }
    }

    const getViolationsPerPage = computed(() => {
      if (!props.crawl.pagesScanned) return '0'
      return (props.crawl.violationsFound / props.crawl.pagesScanned).toFixed(1)
    })

    const getImpactWidth = (count) => {
      const total = Object.values(props.crawl.violationsByImpact).reduce((a, b) => a + b, 0)
      return total > 0 ? `${(count / total * 100)}%` : '0%'
    }

    const violationsByRule = computed(() => {
      if (!props.crawl.violations) return [];

      // First group by rule ID
      const groupedByRule = props.crawl.violations.reduce((acc, violation) => {
        // Create a unique key using help text if id is not available
        const ruleKey = violation.id || violation.help;
        if (!acc[ruleKey]) {
          acc[ruleKey] = {
            id: ruleKey,
            help: violation.help,
            description: violation.description,
            helpUrl: violation.helpUrl,
            impact: violation.impact,
            byUrl: {}
          };
        }
        
        // Then group instances by URL
        if (!acc[ruleKey].byUrl[violation.url]) {
          acc[ruleKey].byUrl[violation.url] = [];
        }
        
        // Add all nodes from this violation to the URL group
        acc[ruleKey].byUrl[violation.url].push(...violation.nodes);
        
        return acc;
      }, {});

      // Convert to array and sort by impact severity
      return Object.values(groupedByRule)
        .sort((a, b) => {
          const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
          return impactOrder[a.impact] - impactOrder[b.impact];
        });
    })

    const getDepthLabel = (depth) => {
      const labels = {
        1: 'Homepage Only',
        2: 'Shallow (2 Levels)',
        3: 'Medium (3 Levels)',
        4: 'Deep (4 Levels)',
        5: 'Very Deep (5 Levels)'
      }
      return labels[depth] || `${depth} Levels`
    }

    const formatDate = (dateString) => {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(dateString))
    }

    const getScoreClass = (score) => {
      if (score === '—') return 'score-pending'
      if (score >= 90) return 'score-excellent'
      if (score >= 70) return 'score-good'
      if (score >= 50) return 'score-fair'
      return 'score-poor'
    }

    const formatHtml = (html) => {
      return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim();
    }

    return {
      getViolationsPerPage,
      violationsByRule,
      getDepthLabel,
      formatDate,
      getScoreClass,
      calculateScore,
      expandedGroups,
      toggleUrlGroup,
      getImpactWidth,
      formatHtml
    }
  }
}
</script>

<style scoped>
.scan-details {
  padding: 20px;
}

.scan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.scan-meta {
  display: flex;
  gap: 15px;
  align-items: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  margin: 10px 0;
}

.stat-description {
  color: #666;
  font-size: 0.9rem;
}

.violations-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.impact-distribution {
  margin: 20px 0 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.impact-distribution h4 {
  margin-top: 0;
  margin-bottom: 15px;
}

.impact-bar {
  display: flex;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  margin: 20px 0;
}

.impact-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
  transition: width 0.3s ease;
  min-width: 60px;
}

.impact-segment.critical { background-color: #d32f2f; }
.impact-segment.serious { background-color: #f57c00; }
.impact-segment.moderate { background-color: #ffa000; }
.impact-segment.minor { background-color: #7cb342; }

.violation-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.violation-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.violation-header h4 {
  margin: 0;
  flex: 1;
}

.impact-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.impact-badge.critical { background-color: #ffebee; color: #c62828; }
.impact-badge.serious { background-color: #fff3e0; color: #ef6c00; }
.impact-badge.moderate { background-color: #fff8e1; color: #f9a825; }
.impact-badge.minor { background-color: #e8f5e9; color: #2e7d32; }

.occurrence-count {
  font-size: 0.9rem;
  color: #666;
}

.violation-help {
  margin: 10px 0;
  color: #444;
}

.help-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.9rem;
}

.help-link:hover {
  text-decoration: underline;
}

.example-list {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.example-item {
  margin-bottom: 15px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #eee;
}

.html-preview {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  overflow-x: auto;
  margin: 0 0 10px 0;
}

.failure-summary {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.score-excellent { color: #4CAF50; }
.score-good { color: #8BC34A; }
.score-fair { color: #FFC107; }
.score-poor { color: #F44336; }
.score-pending { color: #9E9E9E; }

.status {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.9em;
  text-transform: capitalize;
}

.status.completed { background-color: #4CAF50; color: white; }
.status.in_progress { background-color: #2196F3; color: white; }
.status.cancelled { background-color: #9e9e9e; color: white; }
.status.failed { background-color: #f44336; color: white; }
.status.pending { background-color: #ff9800; color: white; }

.violation-rule {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.impact-badge {
  font-size: 0.8em;
  padding: 0.2em 0.6em;
  border-radius: 4px;
  margin-left: 1rem;
  color: white;
}

.impact-badge.critical { background-color: #dc3545; color: #fff;}
.impact-badge.serious { background-color: #fd7e14; color: #fff; }
.impact-badge.moderate { background-color: #ffc107; color: black; }
.impact-badge.minor { background-color: #6c757d; color: #fff; }

.help-link {
  color: #0d6efd;
  text-decoration: none;
  font-size: 0.9em;
}

.help-link:hover {
  text-decoration: underline;
}

.url-group {
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.url-header {
  color: #495057;
  margin-bottom: 1rem;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.url-header:hover {
  background-color: #f0f0f0;
}

.url-header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.url-header-content h5 {
  margin: 0;
}

.expand-icon {
  color: #6c757d;
  font-size: 0.8em;
  width: 1em;
  display: inline-block;
}

.instance-count {
  color: #6c757d;
  font-size: 0.9em;
  font-weight: normal;
  margin-left: 0.5rem;
}

.url-instances {
  margin-left: 1.5rem;
}

.violation-instance {
  margin: 1rem 0;
  padding-left: 1rem;
  border-left: 3px solid #dee2e6;
}

.preview-link {
  text-decoration: none;
  color: inherit;
}
</style> 