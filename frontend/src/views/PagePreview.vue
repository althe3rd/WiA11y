<template>
  <div class="page-preview">
    <div class="preview-header">
      <div class="breadcrumb">
        <router-link :to="`/scans/${scanId}`">← Back to Scan Results</router-link>
      </div>
      <h2>{{ decodeURIComponent(url) }}</h2>
    </div>

    <div class="preview-container">
      <div class="violations-sidebar">
        <h3>Violations on this page</h3>
        <div v-for="violation in pageViolations" :key="violation.id" class="violation-item">
          <div 
            class="violation-header" 
            @click="highlightViolation(violation)"
            :class="{ active: selectedViolation?.id === violation.id }"
          >
            <span :class="['impact-badge', violation.impact]">{{ violation.impact }}</span>
            <h4>{{ violation.help }}</h4>
          </div>
          <div class="violation-nodes" v-if="selectedViolation?.id === violation.id">
            <div 
              v-for="(node, index) in violation.nodes" 
              :key="index"
              class="violation-node"
              :class="{ 'highlighted': isNodeHighlighted(node) }"
              @click="scrollToElement(node.target)"
            >
              <CodeBlock>{{ formatHtml(node.html) }}</CodeBlock>
              <p class="failure-summary">{{ node.failureSummary }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-frame">
        <div class="loading" v-if="loading">Loading preview...</div>
        <iframe 
          v-else
          ref="previewFrame"
          :src="proxyUrl"
          @load="onFrameLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import CodeBlock from '../components/CodeBlock.vue'

export default {
  name: 'PagePreview',
  components: {
    CodeBlock
  },
  props: {
    scanId: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    selectedViolationId: {
      type: String,
      required: false,
      default: null
    }
  },
  setup(props) {
    const route = useRoute()
    const loading = ref(true)
    const previewFrame = ref(null)
    const pageViolations = ref([])
    const selectedViolation = ref(null)
    const previewMode = ref('proxy')
    const token = ref(localStorage.getItem('token'))
    const highlightedNode = ref(null)

    const proxyUrl = computed(() => {
      const tokenValue = token.value.startsWith('Bearer ') ? token.value.slice(7) : token.value;
      return `${process.env.VUE_APP_API_URL}/api/proxy/${encodeURIComponent(props.url)}?token=${tokenValue}`
    })

    const fetchViolations = async () => {
      loading.value = true;
      try {
        const { data } = await axios.get(
          `${process.env.VUE_APP_API_URL}/api/violations/${props.scanId}/${encodeURIComponent(props.url)}`,
          {
            headers: {
              'Authorization': `Bearer ${token.value}`
            }
          }
        );
        pageViolations.value = data;
        
        // If we have a selectedViolationId, find and highlight it
        if (props.selectedViolationId) {
          const selectedViolation = data.find(v => 
            v.id === props.selectedViolationId || 
            `${v.id}-${v.help}` === props.selectedViolationId
          );
          if (selectedViolation) {
            highlightViolation(selectedViolation);
          }
        }
      } catch (error) {
        console.error('Error fetching violations:', error);
        pageViolations.value = [];
      } finally {
        loading.value = false;
      }
    }

    const highlightViolation = (violation) => {
      selectedViolation.value = selectedViolation.value?.id === violation.id ? null : violation
      
      if (previewFrame.value) {
        if (selectedViolation.value) {
          violation.nodes.forEach(node => {
            node.target.forEach(selector => {
              previewFrame.value.contentWindow.postMessage({
                type: 'highlight',
                selector: selector
              }, process.env.VUE_APP_API_URL)
            })
          })
        } else {
          // Clear highlights
          previewFrame.value.contentWindow.postMessage({
            type: 'highlight',
            selector: null
          }, process.env.VUE_APP_API_URL)
        }
      }
      highlightedNode.value = null;
    }

    const scrollToElement = (selectors) => {
      if (previewFrame.value) {
        selectors.forEach(selector => {
          previewFrame.value.contentWindow.postMessage({
            type: 'highlight',
            selector: selector
          }, process.env.VUE_APP_API_URL)
        })
        highlightedNode.value = selectors;
      }
    }

    const isNodeHighlighted = (node) => {
      return highlightedNode.value && 
        node.target.some(t => highlightedNode.value.includes(t));
    }

    const onFrameLoad = () => {
      loading.value = false
    }

    const handlePreviewError = async () => {
      if (previewMode.value === 'proxy') {
        previewMode.value = 'screenshot';
        // Fetch and display screenshot version
      }
    }

    const formatHtml = (html) => {
      return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim();
    }

    onMounted(() => {
      // Refresh token value on mount
      token.value = localStorage.getItem('token')
      fetchViolations()
    })

    return {
      loading,
      previewFrame,
      pageViolations,
      selectedViolation,
      highlightViolation,
      scrollToElement,
      onFrameLoad,
      handlePreviewError,
      proxyUrl,
      formatHtml,
      isNodeHighlighted
    }
  }
}
</script>

<style scoped>
.page-preview {
  padding: 20px;
}

.preview-header {
  margin-bottom: 20px;
}

.breadcrumb {
  margin-bottom: 10px;
}

.preview-container {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  height: calc(100vh - 150px);
}

.violations-sidebar {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.violation-item {
  margin-bottom: 15px;
}

.violation-header {
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.violation-header:hover {
  background-color: #f0f0f0;
}

.violation-header.active {
  background-color: rgba(13, 110, 253, 0.1);
  border-left: 3px solid #0d6efd;
}

.violation-nodes {
  margin-top: 10px;
  padding-left: 15px;
}

.violation-node {
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  background: #f8f9fa;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.violation-node:hover {
  background: #e9ecef;
}

.violation-node.highlighted {
  border-color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.05);
}

.impact-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.impact-badge.critical {
  background-color: #dc3545;
  color: white;
}

.impact-badge.serious {
  background-color: #fd7e14;
  color: white;
}

.impact-badge.moderate {
  background-color: #ffc107;
  color: black;
}

.impact-badge.minor {
  background-color: #6c757d;
  color: white;
}

.preview-frame {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.preview-frame iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2em;
  color: #666;
}
</style> 